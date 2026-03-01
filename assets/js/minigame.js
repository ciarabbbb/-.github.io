// ===== Mini Game: Person + Flower/Rock Runner
// Features:
// 1) Uneven obstacles (not too uniform)
// 2) Difficulty curve: early loose -> later dense
// 3) No long empty gap bug (always spawn to the right)
// 4) Moon + drifting clouds
// 5) Person player + flower/rock obstacles
(function(){
  const canvas = document.getElementById('mzCanvas');
  const ctx = canvas.getContext('2d');

  const elScore = document.getElementById('mzScore');
  const btnStart = document.getElementById('mzStart');
  const btnJump = document.getElementById('mzJump');
  const btnRestart = document.getElementById('mzRestart');

  // ===== High DPI support =====
  function resizeCanvasForDPR(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  // ===== Game State =====
  let running = false;
  let gameOver = false;
  let score = 0;

  const groundY = 160;

  const player = {
    x: 60,
    y: groundY,
    r: 12,
    vy: 0,
    jumping: false,
  };

  let speed = 260;        // px/s (will be updated by difficulty)
  let burstChance = 0.12; // 连发概率：会随分数上升
  let obstacles = [];

  // Sky
  let cloudOffset = 0;
  const clouds = [
    { x: 120, y: 42, s: 1.0, k: 0.35 },
    { x: 420, y: 58, s: 1.3, k: 0.25 },
    { x: 760, y: 36, s: 0.9, k: 0.18 },
  ];

  // ===== Difficulty curve (early loose -> later dense) =====
  function updateDifficulty(){
    // d: 0~1, 0=loose, 1=dense
    // 想“更慢热”就把 40 改 50；想更快变难就改 30
    const d = Math.max(0, Math.min(1, score / 40));

    // 基础速度随分数上升（平滑）
    speed = Math.min(520, 260 + 160 * d); // 260 -> 420（额外还会被 passed 微调）

    // 连发概率随分数上升
    burstChance = 0.12 + 0.22 * d; // 0.12 -> 0.34

    return d;
  }

  // Uneven gap in px, controlled by difficulty
  function nextGapPx(){
    const d = updateDifficulty(); // ensure speed/burstChance updated

    // 前期大间距，后期小间距
    const base = 230 - 110 * d; // 230 -> 120
    const jitter = (240 - 140 * d) * Math.random(); // 240 -> 100

    // 前期更容易长空档；后期更多短空档
    const longChance = 0.28 - 0.20 * d;  // 0.28 -> 0.08
    const shortChance = 0.12 + 0.28 * d; // 0.12 -> 0.40

    const r = Math.random();

    if(r < longChance){
      // 长空档：后期也会变短
      return base + jitter + (340 - 180*d) + Math.random()*(360 - 220*d);
    }
    if(r < longChance + shortChance){
      // 短空档：后期更短更常见
      return base*0.55 + Math.random()*(160 - 60*d);
    }
    return base + jitter;
  }

  // ===== Obstacles =====
  function makeObstacle(type, xStart){
    const w = type === 'flower'
      ? 22 + Math.random()*10
      : 26 + Math.random()*12;

    const h = type === 'flower'
      ? 30 + Math.random()*16
      : 22 + Math.random()*14;

    return {
      type,
      x: xStart,
      y: groundY + player.r - h,
      w,
      h
    };
  }

  function spawnObstacleAt(xStart){
    const type = Math.random() < 0.5 ? 'flower' : 'rock';
    obstacles.push(makeObstacle(type, xStart));

    // 偶尔“连发”一个更近的障碍（概率随难度上升）
    if(Math.random() < burstChance){
      const tight = 60 + Math.random()*90; // 60~150
      const type2 = Math.random() < 0.5 ? 'flower' : 'rock';

      // 第二个障碍做一点随机变化（别太整齐）
      const ob2 = makeObstacle(type2, xStart + tight);
      ob2.w = 22 + Math.random()*18;
      ob2.h = 22 + Math.random()*26;
      ob2.y = groundY + player.r - ob2.h;

      obstacles.push(ob2);
    }
  }

  // ✅ 핵심修复：永远补到右侧足够远，保证不会空场
  function spawnUntilFilled(){
    const targetX = canvas.clientWidth + 400;

    // 找当前最右边的障碍末端
    let rightMostEnd = obstacles.length
      ? Math.max(...obstacles.map(o => o.x + o.w))
      : -Infinity;

    // 如果场上空了：立刻给一个起始障碍
    if(!obstacles.length){
      spawnObstacleAt(canvas.clientWidth + 200);
      rightMostEnd = Math.max(...obstacles.map(o => o.x + o.w));
    }

    // 一直补到足够远
    let guard = 0; // 防止极端情况死循环
    while(rightMostEnd < targetX && guard < 60){
      const xStart = rightMostEnd + nextGapPx();
      spawnObstacleAt(xStart);
      rightMostEnd = Math.max(...obstacles.map(o => o.x + o.w));
      guard++;
    }
  }

  // ===== Jump =====
  function jump(){
    if(!running || gameOver) return;
    if(!player.jumping){
      player.vy = -520;
      player.jumping = true;
    }
  }

  // ===== Controls =====
  btnStart.addEventListener('click', () => {
    if(!running && !gameOver){
      running = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    }
  });

  btnRestart.addEventListener('click', reset);
  btnJump.addEventListener('click', jump);

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if(!running && !gameOver){
      running = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    }
    jump();
  }, {passive:false});

  window.addEventListener('keydown', (e) => {
    if(e.code === 'Space'){
      e.preventDefault();
      if(!running && !gameOver){
        running = true;
        lastT = performance.now();
        requestAnimationFrame(loop);
      }
      jump();
    }
  }, {passive:false});

  // ===== Collision: circle vs approx circle =====
  function hitObstacle(ob, cx, cy, cr){
    const ox = ob.x + ob.w*0.5;
    const oy = ob.y + ob.h*0.5;
    const or = Math.min(ob.w, ob.h) * 0.45;

    const dx = cx - ox;
    const dy = cy - oy;
    return (dx*dx + dy*dy) <= (cr + or)*(cr + or);
  }

  // ===== Drawing helpers =====
  function roundRect(x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawPerson(x, y, r){
    // Head
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.arc(x, y - r*0.9, r*0.55, 0, Math.PI*2);
    ctx.fill();

    // Body + limbs
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineCap = 'round';

    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - r*0.35);
    ctx.lineTo(x, y + r*0.6);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(x - r*0.65, y);
    ctx.lineTo(x + r*0.65, y);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y + r*0.6);
    ctx.lineTo(x - r*0.6, y + r*1.3);
    ctx.moveTo(x, y + r*0.6);
    ctx.lineTo(x + r*0.6, y + r*1.3);
    ctx.stroke();
  }

  function drawRock(x, y, w, h){
    ctx.fillStyle = 'rgba(214,179,106,.9)';
    roundRect(x, y, w, h, 6);
    ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    roundRect(x + w*0.14, y + h*0.18, w*0.34, h*0.22, 5);
    ctx.fill();
  }

  function drawFlower(x, y, w, h){
    const cx = x + w*0.5;
    const cy = y + h*0.4;

    // stem
    ctx.strokeStyle = 'rgba(143,184,168,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y + h);
    ctx.lineTo(cx, cy + h*0.25);
    ctx.stroke();

    // petals
    ctx.fillStyle = 'rgba(214,179,106,.95)';
    const pr = Math.min(w,h)*0.12;
    const R = Math.min(w,h)*0.22;

    for(let i=0;i<5;i++){
      const a = i * (Math.PI*2/5);
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a)*R,
        cy + Math.sin(a)*R,
        pr,
        0,
        Math.PI*2
      );
      ctx.fill();
    }

    // center
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, pr*0.9, 0, Math.PI*2);
    ctx.fill();
  }

  function drawCloud(x, y, w, h){
    ctx.fillStyle = 'rgba(255,255,255,.10)'; // 想更明显：把 .10 改 .14/.16
    ctx.beginPath();
    ctx.ellipse(x, y, w*0.32, h*0.55, 0, 0, Math.PI*2);
    ctx.ellipse(x + w*0.22, y - h*0.18, w*0.30, h*0.60, 0, 0, Math.PI*2);
    ctx.ellipse(x + w*0.46, y, w*0.34, h*0.55, 0, 0, Math.PI*2);
    ctx.fill();
  }

  function drawSky(){
    const mx = canvas.clientWidth - 90;
    const my = 46;

    // halo
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(214,179,106,.06)';
    ctx.fill();

    // moon
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fill();

    // clouds
    for(const c of clouds){
      const vx = ((c.x + cloudOffset * 70 * c.k) % (canvas.clientWidth + 120)) - 60;
      drawCloud(vx, c.y, 46 * c.s, 18 * c.s);
    }
  }

  // ===== Render =====
  function draw(){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // sky first
    drawSky();

    // ground
    ctx.beginPath();
    ctx.moveTo(0, groundY + player.r + 6);
    ctx.lineTo(canvas.clientWidth, groundY + player.r + 6);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // player
    drawPerson(player.x, player.y, player.r);

    // obstacles
    for(const ob of obstacles){
      if(ob.type === 'flower') drawFlower(ob.x, ob.y, ob.w, ob.h);
      else drawRock(ob.x, ob.y, ob.w, ob.h);
    }

    // hints
    if(!running && !gameOver){
      ctx.fillStyle = 'rgba(255,255,255,.70)';
      ctx.font = '14px "Songti SC","STSong","SimSun",serif';
      ctx.fillText('点击“开始”或直接点画布开始', 18, 26);
    }
    if(gameOver){
      ctx.fillStyle = 'rgba(255,255,255,.90)';
      ctx.font = '16px "Songti SC","STSong","SimSun",serif';
      ctx.fillText('真是一对笑面虎，两头乌角鲨！', 18, 26);
    }
  }

  // ===== Loop =====
  let lastT = 0;
  function loop(t){
    if(!running) return;

    const dt = Math.min(0.035, (t - lastT) / 1000);
    lastT = t;

    cloudOffset += dt;

    // physics
    const g = 1400;
    player.vy += g * dt;
    player.y += player.vy * dt;

    if(player.y >= groundY){
      player.y = groundY;
      player.vy = 0;
      player.jumping = false;
    }

    // move obstacles
    for(const ob of obstacles){
      ob.x -= speed * dt;
    }

    // recycle + score
    let passed = 0;
    obstacles = obstacles.filter(ob => {
      const gone = (ob.x + ob.w) < 0;
      if(gone) passed += 1;
      return !gone;
    });

    if(passed > 0){
      score += passed;

      // 只给一点点额外加速（主要难度来自曲线）
      speed = Math.min(520, speed + 4 * passed);

      elScore.textContent = '得分：' + score;
    }

    // ✅ ensure always filled (fix long empty gap)
    spawnUntilFilled();

    // collision
    for(const ob of obstacles){
      if(hitObstacle(ob, player.x, player.y, player.r)){
        running = false;
        gameOver = true;
        elScore.textContent = '得分：' + score + ' · 是这个乱世害了你啊！';
        draw();
        return;
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  // ===== Reset / Resize =====
  function reset(){
    running = false;
    gameOver = false;
    score = 0;

    speed = 260;
    burstChance = 0.12;

    player.y = groundY;
    player.vy = 0;
    player.jumping = false;

    obstacles = [];
    spawnUntilFilled();

    elScore.textContent = '得分：0';
    draw();
  }

  function onResize(){
    resizeCanvasForDPR();
    // resize后重新补齐，避免空档/断层
    if(!obstacles.length) spawnUntilFilled();
    draw();
  }

  // ===== Init =====
  canvas.style.height = '200px';
  reset();
  onResize();
  window.addEventListener('resize', onResize);
})();
