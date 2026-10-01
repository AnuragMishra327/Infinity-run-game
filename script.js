(() => {

  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('bestScore');
  const finalScoreEl = document.getElementById('finalScore');
  const recordMessage = document.getElementById('recordMessage');

  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const pauseBadge = document.getElementById('pauseBadge');

  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const soundButton = document.getElementById('soundButton');
  const soundLabel = document.getElementById('soundLabel');

  const runnerImage = new Image();
  runnerImage.src = 'runner.png';

  const monkeyImage = new Image();
  monkeyImage.src = 'monkey.png.png';


  const WORLD = {
    ground: 76,
    gravity: 1850,
    jump: -650
  };


  const DIFFICULTY = {
    startSpeed: 330,
    maxSpeed: 650,
    scoreMultiplier: 0.16,
    minimumSpawnGap: 0.82,
    baseSpawnMin: 1.55,
    baseSpawnRandom: 0.95
  };


  let width = 900;
  let height = 430;
  let dpr = 1;

  let state = 'ready';
  let lastTime = 0;
  let elapsed = 0;
  let score = 0;
  let best = readBest();

  let speed = DIFFICULTY.startSpeed;
  let spawnIn = 1.5;
  let animationTime = 0;

  let soundOn = true;
  let audioContext = null;

  let obstacles = [];
  let clouds = [];
  let hills = [];
  let grass = [];


  const player = {
    x: 100,
    y: 0,
    w: 66,
    h: 66,
    vy: 0,
    grounded: true
  };


  // Double jump
  let jumpCount = 0;
  const maxJumps = 2;


  function readBest() {

    try {
      return Number(
        localStorage.getItem('infinityRunBest')
      ) || 0;

    } catch {
      return 0;
    }

  }


  function saveBest() {

    try {
      localStorage.setItem(
        'infinityRunBest',
        String(best)
      );

    } catch {}

  }


  function padScore(n) {

    return String(
      Math.floor(n)
    ).padStart(5, '0');

  }


  function randomBetween(min, max) {

    return Math.random() * (max - min) + min;

  }


  function getDifficulty() {

    if (score < 100) {

      return {
        level: 1,
        name: 'Easy',
        speed: 330 + score * 0.10
      };

    }


    if (score < 250) {

      return {
        level: 2,
        name: 'Fast',
        speed: 340 + (score - 100) * 0.16
      };

    }


    if (score < 500) {

      return {
        level: 3,
        name: 'Hard',
        speed: 364 + (score - 250) * 0.20
      };

    }


    return {
      level: 4,
      name: 'Extreme',
      speed: Math.min(
        DIFFICULTY.maxSpeed,
        414 + (score - 500) * 0.24
      )
    };

  }


  function updateDifficulty() {

    const difficulty = getDifficulty();

    speed = Math.min(
      DIFFICULTY.maxSpeed,
      difficulty.speed
    );

  }


  function resize() {

    const rect = canvas.getBoundingClientRect();

    width = Math.max(320, rect.width);
    height = Math.max(250, rect.height);

    dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    canvas.width = Math.round(
      width * dpr
    );

    canvas.height = Math.round(
      height * dpr
    );

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    player.w = Math.max(
      48,
      Math.min(68, height * 0.15)
    );

    player.h = player.w;

    player.x = Math.max(
      26,
      width * 0.105
    );

    if (
      player.grounded ||
      state === 'ready'
    ) {
      player.y =
        groundY() - player.h;
    }

    makeScenery();
    render();

  }


  function groundY() {

    return height - WORLD.ground;

  }


  function makeScenery() {

    clouds = Array.from(
      { length: 5 },
      (_, i) => ({

        x:
          (i / 5) * width +
          Math.random() * 80,

        y:
          25 +
          Math.random() *
          height * 0.3,

        s:
          18 +
          Math.random() * 22,

        v:
          8 +
          Math.random() * 12

      })
    );


    hills = Array.from(
      { length: 7 },
      (_, i) => ({

        x:
          i * width / 5,

        y:
          groundY() -
          35 -
          Math.random() * 70,

        r:
          70 +
          Math.random() * 80

      })
    );


    grass = Array.from(
      {
        length:
          Math.ceil(width / 8)
      },
      (_, i) => ({

        x:
          i * 8 +
          Math.random() * 6,

        h:
          3 +
          Math.random() * 13,

        w:
          1 +
          Math.random() * 1.5

      })
    );

  }


  function roundedRect(
    x,
    y,
    w,
    h,
    r,
    fill
  ) {

    ctx.fillStyle = fill;

    ctx.beginPath();

    ctx.roundRect(
      x,
      y,
      w,
      h,
      r
    );

    ctx.fill();

  }


  function drawBackground(dt) {

    const sky =
      ctx.createLinearGradient(
        0,
        0,
        0,
        height
      );

    sky.addColorStop(
      0,
      '#242653'
    );

    sky.addColorStop(
      1,
      '#6b5da8'
    );

    ctx.fillStyle = sky;

    ctx.fillRect(
      0,
      0,
      width,
      height
    );


    ctx.fillStyle =
      'rgba(255,120,189,.88)';

    ctx.beginPath();

    ctx.arc(
      width * 0.82,
      height * 0.18,
      Math.min(
        34,
        height * 0.08
      ),
      0,
      Math.PI * 2
    );

    ctx.fill();


    clouds.forEach(c => {

      c.x -= c.v * dt;

      if (c.x < -100) {
        c.x = width + 60;
      }

      ctx.fillStyle =
        'rgba(255,255,255,.75)';

      ctx.beginPath();

      ctx.arc(
        c.x,
        c.y,
        c.s * 0.55,
        0,
        Math.PI * 2
      );

      ctx.arc(
        c.x + c.s * 0.55,
        c.y - c.s * 0.22,
        c.s * 0.68,
        0,
        Math.PI * 2
      );

      ctx.arc(
        c.x + c.s * 1.15,
        c.y,
        c.s * 0.56,
        0,
        Math.PI * 2
      );

      ctx.fill();

    });


    hills.forEach((h, i) => {

      const x =
        (
          (
            h.x -
            (elapsed * speed * 0.07) %
            (width * 1.5)
          ) +
          width * 1.5
        ) %
          (width * 1.5) -
        width * 0.15;

      ctx.fillStyle =
        i % 2
          ? '#544a91'
          : '#413d7d';

      ctx.beginPath();

      ctx.ellipse(
        x,
        h.y,
        h.r,
        h.r * 0.48,
        0,
        Math.PI,
        Math.PI * 2
      );

      ctx.fill();

    });


    ctx.fillStyle = '#262d5c';

    ctx.fillRect(
      0,
      groundY(),
      width,
      WORLD.ground
    );


    ctx.fillStyle = '#54e7f2';

    ctx.fillRect(
      0,
      groundY(),
      width,
      8
    );


    ctx.strokeStyle =
      'rgba(84,231,242,.42)';

    ctx.lineWidth = 1;


    grass.forEach(g => {

      const x =
        (
          g.x -
          (elapsed * speed * 0.8) %
          (width + 20) +
          width +
          20
        ) %
        (width + 20);

      ctx.beginPath();

      ctx.moveTo(
        x,
        groundY() + 8
      );

      ctx.lineTo(
        x - g.w,
        groundY() + 8 - g.h
      );

      ctx.stroke();

    });


    ctx.fillStyle =
      'rgba(255,255,255,.13)';

    ctx.fillRect(
      0,
      groundY() + 20,
      width,
      1
    );

  }


  function drawPlayer() {

    if (
      runnerImage.complete &&
      runnerImage.naturalWidth > 0
    ) {

      const frames =
        runnerImage.naturalWidth >=
        runnerImage.naturalHeight * 4
          ? 6
          : 1;

      const fw =
        runnerImage.naturalWidth /
        frames;

      const frame =
        player.grounded &&
        state === 'running'
          ? Math.floor(
              animationTime * 12
            ) % frames
          : 0;

      ctx.drawImage(
        runnerImage,
        frame * fw,
        0,
        fw,
        runnerImage.naturalHeight,
        player.x,
        player.y,
        player.w,
        player.h
      );

    } else {

      roundedRect(
        player.x + 8,
        player.y + 12,
        player.w - 16,
        player.h - 12,
        12,
        '#263f60'
      );

      ctx.fillStyle =
        '#f4d2ad';

      ctx.beginPath();

      ctx.arc(
        player.x + player.w * 0.58,
        player.y + player.h * 0.28,
        player.w * 0.2,
        0,
        Math.PI * 2
      );

      ctx.fill();

      roundedRect(
        player.x + player.w * 0.25,
        player.y + player.h * 0.48,
        player.w * 0.5,
        player.h * 0.36,
        8,
        '#54e7f2'
      );

      ctx.fillStyle =
        '#263f60';

      ctx.fillRect(
        player.x + player.w * 0.26,
        player.y + player.h * 0.78,
        8,
        player.h * 0.2
      );

      ctx.fillRect(
        player.x + player.w * 0.62,
        player.y + player.h * 0.78,
        8,
        player.h * 0.2
      );

    }

  }


  function drawMonkey(o) {

    if (
      monkeyImage.complete &&
      monkeyImage.naturalWidth > 0
    ) {

      ctx.drawImage(
        monkeyImage,
        o.x,
        o.y,
        o.w,
        o.h
      );

    } else {

      ctx.fillStyle = '#87512f';

      ctx.beginPath();

      ctx.arc(
        o.x + o.w * 0.5,
        o.y + o.h * 0.52,
        o.w * 0.36,
        0,
        Math.PI * 2
      );

      ctx.fill();


      ctx.beginPath();

      ctx.arc(
        o.x + o.w * 0.18,
        o.y + o.h * 0.3,
        o.w * 0.16,
        0,
        Math.PI * 2
      );

      ctx.arc(
        o.x + o.w * 0.82,
        o.y + o.h * 0.3,
        o.w * 0.16,
        0,
        Math.PI * 2
      );

      ctx.fill();


      ctx.fillStyle =
        '#f4d1a5';

      ctx.beginPath();

      ctx.ellipse(
        o.x + o.w * 0.5,
        o.y + o.h * 0.62,
        o.w * 0.23,
        o.h * 0.16,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();


      ctx.fillStyle =
        '#211c1a';

      ctx.beginPath();

      ctx.arc(
        o.x + o.w * 0.4,
        o.y + o.h * 0.45,
        2.2,
        0,
        Math.PI * 2
      );

      ctx.arc(
        o.x + o.w * 0.6,
        o.y + o.h * 0.45,
        2.2,
        0,
        Math.PI * 2
      );

      ctx.fill();

    }

  }


  function drawObstacles() {

    obstacles.forEach(
      drawMonkey
    );

  }


  function addObstacle(
    xOffset,
    size
  ) {

    obstacles.push({

      x:
        width + 20 + xOffset,

      y:
        groundY() - size + 5,

      w: size,

      h: size,

      passed: false

    });

  }


  function spawnObstacle() {

    const size = Math.max(
      43,
      Math.min(
        66,
        height * 0.145
      )
    );


    const difficulty =
      getDifficulty();


    let pattern = [];


    if (difficulty.level === 1) {

      // Easy: single monkey
      pattern = [0];

    }


    else if (difficulty.level === 2) {

      // Fast: single or double
      if (Math.random() < 0.55) {

        pattern = [0];

      } else {

        pattern = [
          0,
          randomBetween(125, 185)
        ];

      }

    }


    else if (difficulty.level === 3) {

      const choice =
        Math.random();

      if (choice < 0.30) {

        pattern = [0];

      }

      else if (choice < 0.72) {

        pattern = [
          0,
          randomBetween(95, 145)
        ];

      }

      else {

        pattern = [
          0,
          randomBetween(95, 130),
          randomBetween(115, 165)
        ];

      }

    }


    else {

      const choice =
        Math.random();

      if (choice < 0.20) {

        pattern = [0];

      }

      else if (choice < 0.55) {

        pattern = [
          0,
          randomBetween(85, 125)
        ];

      }

      else if (choice < 0.82) {

        pattern = [
          0,
          randomBetween(85, 115),
          randomBetween(95, 135)
        ];

      }

      else {

        pattern = [
          0,
          randomBetween(150, 220)
        ];

      }

    }


    pattern.forEach(
      offset => {
        addObstacle(
          offset,
          size
        );
      }
    );


    const patternSpan =
      pattern.length > 1
        ? pattern[pattern.length - 1] + size
        : size;


    let gapDistance;


    if (difficulty.level === 1) {

      gapDistance =
        randomBetween(280, 390);

    }

    else if (difficulty.level === 2) {

      gapDistance =
        randomBetween(235, 340);

    }

    else if (difficulty.level === 3) {

      gapDistance =
        randomBetween(195, 300);

    }

    else {

      gapDistance =
        randomBetween(165, 260);

    }


    spawnIn = Math.max(
      0.58,
      (
        patternSpan +
        gapDistance
      ) / speed
    );

  }


  function overlap(a, b) {

    const ax =
      a.x + a.w * 0.2;

    const ay =
      a.y + a.h * 0.18;

    const aw =
      a.w * 0.62;

    const ah =
      a.h * 0.75;


    const bx =
      b.x + b.w * 0.18;

    const by =
      b.y + b.h * 0.12;

    const bw =
      b.w * 0.64;

    const bh =
      b.h * 0.8;


    return (
      ax < bx + bw &&
      ax + aw > bx &&
      ay < by + bh &&
      ay + ah > by
    );

  }


  function jump() {

    if (state === 'ready') {

      startGame();

      return;

    }


    if (state === 'over') {

      restartGame();

      return;

    }


    if (state !== 'running') {

      return;

    }


    // First jump OR second jump
    if (jumpCount < maxJumps) {

      player.vy = WORLD.jump;

      player.grounded = false;

      jumpCount++;


      // Slightly different tone
      // for the second jump
      if (jumpCount === 1) {

        playTone(
          520,
          0.055
        );

      } else {

        playTone(
          680,
          0.055
        );

      }

    }

  }


  function startGame() {

    state = 'running';

    startOverlay.hidden = true;
    gameOverOverlay.hidden = true;
    pauseBadge.hidden = true;

    lastTime =
      performance.now();

    requestAnimationFrame(loop);

  }


  function endGame() {

    state = 'over';

    finalScoreEl.textContent =
      padScore(score);


    const newRecord =
      score > best;


    if (newRecord) {

      best = score;

      saveBest();

      bestEl.textContent =
        padScore(best);

    }


    recordMessage.textContent =
      newRecord
        ? 'New personal best! ✨'
        : 'Keep going — your next record is waiting.';


    gameOverOverlay.hidden =
      false;


    playTone(
      170,
      0.18
    );

  }


  function restartGame() {

    score = 0;

    speed =
      DIFFICULTY.startSpeed;

    spawnIn = 1.25;

    elapsed = 0;

    animationTime = 0;

    obstacles = [];


    player.vy = 0;

    player.grounded = true;

    player.y =
      groundY() - player.h;


    // Reset double jump
    jumpCount = 0;


    scoreEl.textContent =
      padScore(0);


    startGame();

  }


  function togglePause() {

    if (state === 'running') {

      state = 'paused';

      pauseBadge.hidden = false;

    }

    else if (state === 'paused') {

      state = 'running';

      pauseBadge.hidden = true;

      lastTime =
        performance.now();

      requestAnimationFrame(loop);

    }

  }


  function playTone(
    freq,
    duration
  ) {

    if (!soundOn) {
      return;
    }


    try {

      audioContext ||= new (
        window.AudioContext ||
        window.webkitAudioContext
      )();


      const osc =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();


      osc.frequency.value =
        freq;

      osc.type = 'sine';


      gain.gain.setValueAtTime(
        0.035,
        audioContext.currentTime
      );


      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime +
        duration
      );


      osc.connect(gain);

      gain.connect(
        audioContext.destination
      );


      osc.start();


      osc.stop(
        audioContext.currentTime +
        duration
      );

    } catch {}

  }


  function update(dt) {

    elapsed += dt;

    animationTime += dt;


    score +=
      dt * 10;


    updateDifficulty();


    scoreEl.textContent =
      padScore(score);


    // Player physics
    player.y +=
      player.vy * dt;

    player.vy +=
      WORLD.gravity * dt;


    // Landing
    if (
      player.y + player.h >=
      groundY()
    ) {

      player.y =
        groundY() - player.h;

      player.vy = 0;

      player.grounded = true;

      // Reset double jump
      jumpCount = 0;

    }


    spawnIn -= dt;


    if (spawnIn <= 0) {

      spawnObstacle();

    }


    obstacles.forEach(o => {

      o.x -=
        speed * dt;


      if (
        !o.passed &&
        o.x + o.w < player.x
      ) {

        o.passed = true;

        playTone(
          760,
          0.035
        );

      }

    });


    obstacles =
      obstacles.filter(
        o =>
          o.x + o.w > -30
      );


    if (
      obstacles.some(
        o =>
          overlap(
            player,
            o
          )
      )
    ) {

      endGame();

      return;

    }

  }


  function render(dt = 0) {

    drawBackground(dt);

    drawObstacles();

    drawPlayer();


    ctx.fillStyle =
      'rgba(139,124,255,.32)';


    const shift =
      (
        elapsed *
        speed *
        0.7
      ) % 52;


    for (
      let x = -shift;
      x < width;
      x += 52
    ) {

      ctx.fillRect(
        x,
        groundY() + 25,
        20,
        3
      );

    }

  }


  function loop(timestamp) {

    if (state !== 'running') {
      return;
    }


    const dt =
      Math.min(
        (
          timestamp -
          lastTime
        ) / 1000 || 0,
        0.04
      );


    lastTime =
      timestamp;


    update(dt);

    render(dt);


    if (
      state === 'running'
    ) {

      requestAnimationFrame(
        loop
      );

    }

  }


  function resetToReady() {

    state = 'ready';

    score = 0;

    speed =
      DIFFICULTY.startSpeed;

    elapsed = 0;

    obstacles = [];

    spawnIn = 1.5;


    player.vy = 0;

    player.grounded = true;

    player.y =
      groundY() - player.h;


    // Reset double jump
    jumpCount = 0;


    scoreEl.textContent =
      padScore(0);

    bestEl.textContent =
      padScore(best);


    startOverlay.hidden =
      false;

    gameOverOverlay.hidden =
      true;

    pauseBadge.hidden =
      true;


    render();

  }


  startButton.addEventListener(
    'click',
    startGame
  );


  restartButton.addEventListener(
    'click',
    restartGame
  );


  soundButton.addEventListener(
    'click',
    () => {

      soundOn = !soundOn;


      soundLabel.textContent =
        soundOn
          ? 'Sound on'
          : 'Sound off';


      soundButton.setAttribute(
        'aria-label',
        soundOn
          ? 'Turn sound off'
          : 'Turn sound on'
      );


      if (soundOn) {

        playTone(
          600,
          0.05
        );

      }

    }
  );


  window.addEventListener(
    'keydown',
    e => {

      if (
        [
          'Space',
          'ArrowUp',
          'ArrowDown'
        ].includes(e.code)
      ) {

        e.preventDefault();

      }


      if (
        e.code === 'Space' ||
        e.code === 'ArrowUp'
      ) {

        jump();

      }


      if (
        e.code === 'KeyP' ||
        e.code === 'Escape'
      ) {

        togglePause();

      }


      if (
        e.code === 'KeyR' &&
        state === 'over'
      ) {

        restartGame();

      }

    }
  );


  canvas.addEventListener(
    'pointerdown',
    () => jump()
  );


  window.addEventListener(
    'resize',
    resize
  );


  document.addEventListener(
    'visibilitychange',
    () => {

      if (
        document.hidden &&
        state === 'running'
      ) {

        togglePause();

      }

    }
  );


  bestEl.textContent =
    padScore(best);


  resize();

  resetToReady();

})();