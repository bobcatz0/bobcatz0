const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startBtn = document.getElementById('start-btn');

const GRID = 20;
const COLS = canvas.width / GRID;
const ROWS = canvas.height / GRID;

const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

const KEY_MAP = {
  ArrowUp:    DIR.UP,    w: DIR.UP,    W: DIR.UP,
  ArrowDown:  DIR.DOWN,  s: DIR.DOWN,  S: DIR.DOWN,
  ArrowLeft:  DIR.LEFT,  a: DIR.LEFT,  A: DIR.LEFT,
  ArrowRight: DIR.RIGHT, d: DIR.RIGHT, D: DIR.RIGHT,
};

let snake, dir, nextDir, food, score, highScore, gameLoop, paused, running;

function init() {
  const mid = Math.floor(COLS / 2);
  snake = [
    { x: mid,     y: Math.floor(ROWS / 2) },
    { x: mid - 1, y: Math.floor(ROWS / 2) },
    { x: mid - 2, y: Math.floor(ROWS / 2) },
  ];
  dir = DIR.RIGHT;
  nextDir = DIR.RIGHT;
  score = 0;
  paused = false;
  scoreEl.textContent = 0;
  placeFood();
}

function placeFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (occupied.has(`${pos.x},${pos.y}`));
  food = pos;
}

function step() {
  if (paused) return;

  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
    }
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid dots
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * GRID + GRID / 2 - 1, y * GRID + GRID / 2 - 1, 2, 2);
    }
  }

  // Food
  const fx = food.x * GRID;
  const fy = food.y * GRID;
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#f87171';
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(fx + GRID / 2, fy + GRID / 2, GRID / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Snake
  snake.forEach((seg, i) => {
    const sx = seg.x * GRID;
    const sy = seg.y * GRID;
    const t = i / snake.length;
    const alpha = 1 - t * 0.5;

    ctx.shadowBlur = i === 0 ? 10 : 0;
    ctx.shadowColor = '#4ade80';
    ctx.fillStyle = i === 0 ? '#4ade80' : `rgba(74, 222, 128, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(sx + 1, sy + 1, GRID - 2, GRID - 2, i === 0 ? 5 : 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Eyes on head
  const hx = snake[0].x * GRID;
  const hy = snake[0].y * GRID;
  ctx.fillStyle = '#0f172a';
  const eyeOffset = { x: 0, y: 0 };
  if (dir === DIR.RIGHT)      { eyeOffset.x =  8; eyeOffset.y = -3; }
  else if (dir === DIR.LEFT)  { eyeOffset.x = -8; eyeOffset.y = -3; }
  else if (dir === DIR.UP)    { eyeOffset.x = -3; eyeOffset.y = -8; }
  else if (dir === DIR.DOWN)  { eyeOffset.x = -3; eyeOffset.y =  8; }

  const cx = hx + GRID / 2 + eyeOffset.x;
  const cy = hy + GRID / 2 + eyeOffset.y;
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + (dir.y !== 0 ? 6 : 0), cy + (dir.x !== 0 ? 6 : 0), 2, 0, Math.PI * 2);
  ctx.fill();
}

function startGame() {
  if (running) clearInterval(gameLoop);
  init();
  draw();
  overlay.classList.add('hidden');
  running = true;
  const speed = 120;
  gameLoop = setInterval(step, speed);
}

function endGame() {
  clearInterval(gameLoop);
  running = false;
  overlayTitle.textContent = 'Game Over';
  overlayMessage.textContent = `Score: ${score}`;
  startBtn.textContent = 'Play Again';
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = 'Paused';
    overlayMessage.textContent = 'Press P to resume';
    startBtn.textContent = 'Resume';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// Controls
document.addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P') {
    if (paused) {
      paused = false;
      overlay.classList.add('hidden');
    } else {
      togglePause();
    }
    return;
  }

  const newDir = KEY_MAP[e.key];
  if (!newDir) return;

  e.preventDefault();

  // Prevent reversing
  if (newDir.x === -dir.x && newDir.y === -dir.y) return;
  nextDir = newDir;
});

startBtn.addEventListener('click', () => {
  if (paused) {
    paused = false;
    overlay.classList.add('hidden');
  } else {
    startGame();
  }
});

// Initialize high score
highScore = 0;

// Draw initial frame
init();
draw();
