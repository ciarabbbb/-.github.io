// ===== Mini Game: Person + Flower/Rock Runner (uneven obstacles + moon/clouds) =====
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

  let speed = 260;           // px/s
  let obstacles = [];        // 多障碍
  let nextSpawnX = 0;        // 下次生成位置（像“路程”一样推进）
  let cloudOffset = 0;       // 云的时间偏移

  const clouds = [
    { x: 120, y: 42, s: 1.0, k: 0.35 },
    { x: 420, y: 58, s: 1.3, k: 0.25 },
    { x: 760, y: 36, s: 0.9, k: 0.18 },
  ];

  // ===== Reset =====
  function reset(){
    running = false;
    gameOver = false;
    score = 0;
    speed = 260;

    player.y = groundY;
    player.vy = 0;
    player.jumping = false;

    obstacles = [];
    nextSpawnX = canvas.clientWidth + 80;
    spawnObstacleAt(nextSpawnX); // 初始放一个
    elScore.textContent = '得分：0';

    draw();
  }

  // ===== Uneven obstacle spacing =====
  function nextGapPx(){
    // 速度越快，平均间距略增（避免后期太难/太密）
    const base = 100 + (speed - 260) * 0.12;
    const jitter = 100 * Math.random();

    // 25%：超长空档
    if(Math.random() < 0.25){
      return base + jitter + 260 + Math.random()*320;
    }
    // 20%：短空档
    if(Math.random() < 0.20){
      return base*0.55 + Math.random()*140;
    }
    // 普通空档
    return base + jitter;
  }

  function spawnObstacleAt(xStart){
    const type = Math.random() < 0.5 ? 'flower' : 'rock';

    const w = type === 'flower'
      ? 22 + Math.random()*10
      : 26 + Math.random()*12;

    const h = type === 'flower'
      ? 30 + Math.random()*16
      : 22 + Math.random()*14;

    obstacles.push({
      type,
      x: xStart,
      y: groundY + player.r - h,
      w,
      h
    });

    // 计算下一次生成位置
    nextSpawnX = xStart + nextGapPx();

    // 18%：紧凑连发（让节奏更“不平均”）
    if(Math.random() < 0.18){
      const tight = 60 + Math.random()*80; // 60~140px
      const t2 = Math.random() < 0.5 ? 'flower' : 'rock';
      const w2 = 22 + Math.random()*18;
      const h2 = 22 + Math.random()*26;

      obstacles.push({
        type: t2,
        x: xStart + tight,
        y: groundY + player.r - h2,
        w: w2,
        h: h2
      });
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

  // ===== Collision: circle vs "approx circle" obstacle =====
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
    // 头
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.arc(x, y - r*0.9, r*0.55, 0, Math.PI*2);
    ctx.fill();

    // 身体/四肢
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineCap = 'round';

    // 身体
    ctx.beginPath();
    ctx.moveTo(x, y - r*0.35);
    ctx.lineTo(x, y + r*0.6);
    ctx.stroke();

    // 手
    ctx.beginPath();
    ctx.moveTo(x - r*0.65, y);
    ctx.lineTo(x + r*0.65, y);
    ctx.stroke();

    // 腿
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

    // 小高光
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    roundRect(x + w*0.14, y + h*0.18, w*0.34, h*0.22, 5);
    ctx.fill();
  }

  function drawFlower(x, y, w, h){
    const cx = x + w*0.5;
    const cy = y + h*0.4;

    // 茎
    ctx.strokeStyle = 'rgba(143,184,168,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y + h);
    ctx.lineTo(cx, cy + h*0.25);
    ctx.stroke();

    // 花瓣
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

    // 花心
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, pr*0.9, 0, Math.PI*2);
    ctx.fill();
  }

  function drawCloud(x, y, w, h){
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath();
    ctx.ellipse(x, y, w*0.32, h*0.55, 0, 0, Math.PI*2);
    ctx.ellipse(x + w*0.22, y - h*0.18, w*0.30, h*0.60, 0, 0, Math.PI*2);
    ctx.ellipse(x + w*0.46, y, w*0.34, h*0.55, 0, 0, Math.PI*2);
    ctx.fill();
  }

  function drawSky(){
    // 月亮（圆月）
    const mx = canvas.clientWidth - 90;
    const my = 46;

    ctx.globalAlpha = 1;

    // 月体
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fill();

    // 云（漂移循环）
    for(const c of clouds){
      const vx = ((c.x + cloudOffset * 70 * c.k) % (canvas.clientWidth + 120)) - 60;
      drawCloud(vx, c.y, 46 * c.s, 18 * c.s);
    }
  }

  // ===== Render =====
  function draw(){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // 天空（月+云）
    drawSky();

    // 地面线
    ctx.beginPath();
    ctx.moveTo(0, groundY + player.r + 6);
    ctx.lineTo(canvas.clientWidth, groundY + player.r + 6);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 玩家
    drawPerson(player.x, player.y, player.r);

    // 障碍
    for(const ob of obstacles){
      if(ob.type === 'flower'){
        drawFlower(ob.x, ob.y, ob.w, ob.h);
      }else{
        drawRock(ob.x, ob.y, ob.w, ob.h);
      }
    }

    // 状态提示
    if(!running && !gameOver){
      ctx.fillStyle = 'rgba(255,255,255,.70)';
      ctx.font = '14px "Songti SC","STSong","SimSun",serif';
      ctx.fillText('点击“开始”或直接点画布开始', 18, 26);
    }

    if(gameOver){
      ctx.fillStyle = 'rgba(255,255,255,.90)';
      ctx.font = '16px "Songti SC","STSong","SimSun",serif';
      ctx.fillText('劫障已至 · 点“重开”再来', 18, 26);
    }
  }

  // ===== Game Loop =====
  let lastT = 0;
  function loop(t){
    if(!running) return;

    const dt = Math.min(0.035, (t - lastT) / 1000);
    lastT = t;

    cloudOffset += dt;

    // 物理
    const g = 1400;
    player.vy += g * dt;
    player.y += player.vy * dt;

    if(player.y >= groundY){
      player.y = groundY;
      player.vy = 0;
      player.jumping = false;
    }

    // 移动障碍
    for(const ob of obstacles){
      ob.x -= speed * dt;
    }

    // 回收出屏 + 计分（每个越过+1）
    let passed = 0;
    obstacles = obstacles.filter(ob => {
      const gone = (ob.x + ob.w) < 0;
      if(gone) passed += 1;
      return !gone;
    });

    if(passed > 0){
      score += passed;
      speed = Math.min(520, speed + 10 * passed);
      elScore.textContent = '得分：' + score;
    }

    // 保持场上至少 2 个障碍，并按 nextSpawnX 继续往右生成
    // 生成条件：最右侧障碍离屏幕右侧不够远时，继续补
    const rightMostX = obstacles.length
      ? Math.max(...obstacles.map(o => o.x))
      : -Infinity;

    if(rightMostX < canvas.clientWidth + 280){
      // 生成到 nextSpawnX（可能连续补几个）
      while(nextSpawnX < canvas.clientWidth + 900){
        spawnObstacleAt(nextSpawnX);
      }
    }

    // 碰撞检测
    for(const ob of obstacles){
      if(hitObstacle(ob, player.x, player.y, player.r)){
        running = false;
        gameOver = true;
        elScore.textContent = '得分：' + score + ' · 败于劫障';
        draw();
        return;
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  // ===== Resize =====
  function onResize(){
    resizeCanvasForDPR();
    // 重置生成基准，避免缩放后空场太久
    if(!obstacles.length){
      nextSpawnX = canvas.clientWidth + 80;
      spawnObstacleAt(nextSpawnX);
    }
    draw();
  }

  // ===== Init =====
  canvas.style.height = '200px';
  reset();
  onResize();
  window.addEventListener('resize', onResize);

})();
