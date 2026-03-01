// ===== Mini Game: Person + Flower/Rock Runner =====
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

  let speed = 260;
  let obstacle = null;

  // ===== Reset =====
  function reset(){
    running = false;
    gameOver = false;
    score = 0;
    speed = 260;
    player.y = groundY;
    player.vy = 0;
    player.jumping = false;
    obstacle = spawnObstacle();
    elScore.textContent = '得分：0';
    draw();
  }

  // ===== Obstacle =====
  function spawnObstacle(){
    const type = Math.random() < 0.5 ? 'flower' : 'rock';

    const w = type === 'flower'
      ? 22 + Math.random()*10
      : 26 + Math.random()*12;

    const h = type === 'flower'
      ? 30 + Math.random()*16
      : 22 + Math.random()*14;

    return {
      type,
      x: canvas.clientWidth + 40,
      y: groundY + player.r - h,
      w,
      h
    };
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

  // ===== Collision (circle vs circle) =====
  function hitObstacle(ob, cx, cy, cr){
    const ox = ob.x + ob.w*0.5;
    const oy = ob.y + ob.h*0.5;
    const or = Math.min(ob.w, ob.h) * 0.45;

    const dx = cx - ox;
    const dy = cy - oy;
    return (dx*dx + dy*dy) <= (cr + or)*(cr + or);
  }

  // ===== Draw Functions =====

  function drawPerson(x, y, r){

    // 头
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.arc(x, y - r*0.9, r*0.55, 0, Math.PI*2);
    ctx.fill();

    // 身体
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineCap = 'round';

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
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, pr*0.9, 0, Math.PI*2);
    ctx.fill();
  }

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

  function draw(){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // 地面
    ctx.beginPath();
    ctx.moveTo(0, groundY + player.r + 6);
    ctx.lineTo(canvas.clientWidth, groundY + player.r + 6);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 玩家
    drawPerson(player.x, player.y, player.r);

    // 障碍
    if(obstacle.type === 'flower'){
      drawFlower(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    } else {
      drawRock(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    }

    if(gameOver){
      ctx.fillStyle = '#fff';
      ctx.font = '16px "Songti SC","SimSun",serif';
      ctx.fillText('鼠惹，请重开', 18, 26);
    }
  }

  let lastT = 0;

  function loop(t){
    if(!running) return;

    const dt = Math.min(0.035, (t - lastT) / 1000);
    lastT = t;

    // 重力
    const g = 1400;
    player.vy += g * dt;
    player.y += player.vy * dt;

    if(player.y >= groundY){
      player.y = groundY;
      player.vy = 0;
      player.jumping = false;
    }

    // 障碍移动
    obstacle.x -= speed * dt;

    if(obstacle.x + obstacle.w < 0){
      obstacle = spawnObstacle();
      score++;
      speed = Math.min(520, speed + 10);
      elScore.textContent = '得分：' + score;
    }

    if(hitObstacle(obstacle, player.x, player.y, player.r)){
      running = false;
      gameOver = true;
      elScore.textContent = '得分：' + score + ' · 败';
      draw();
      return;
    }

    draw();
    requestAnimationFrame(loop);
  }

  function onResize(){
    resizeCanvasForDPR();
    if(!obstacle) obstacle = spawnObstacle();
    draw();
  }

  reset();
  canvas.style.height = '200px';
  onResize();
  window.addEventListener('resize', onResize);

})();
