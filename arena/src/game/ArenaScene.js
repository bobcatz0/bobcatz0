import { buildArenaMap } from './arenaMap.js';
import { TileCollision } from './TileCollision.js';
import { MovementController } from './MovementController.js';
import { PlayerController } from './PlayerController.js';
import { InputState } from './InputState.js';

const FIXED_DT = 1 / 120;     // physics step (s) — small for stable feel
const MAX_FRAME = 0.25;       // clamp huge gaps (tab switch) to avoid spiral

const COLORS = {
  sky0: '#11161f',
  sky1: '#1b2433',
  tile: '#3a4a63',
  tileTop: '#54688a',
  grid: 'rgba(255,255,255,0.03)',
  player: { idle: '#7fd1ff', run: '#7fffa8', jump: '#ffe27f', fall: '#ff9f7f' },
  eye: '#0b0f16',
};

/**
 * ArenaScene — owns the canvas, the arena, the player, and the game loop.
 * Single-player prototype: no networking, no scoring logic yet (FT20 is a
 * static placeholder). Its job is to prove the movement feels right.
 */
export class ArenaScene {
  constructor(canvas, { debugEl, hudEl } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugEl = debugEl;
    this.hudEl = hudEl;

    const tileSize = 40;
    this.map = buildArenaMap(tileSize);
    canvas.width = this.map.cols * tileSize;
    canvas.height = this.map.rows * tileSize;

    this.collider = new TileCollision(this.map);
    this.movement = new MovementController();
    this.input = new InputState(window);

    this.player = new PlayerController(
      { x: this.map.spawn.x, y: this.map.spawn.y, width: 24, height: 36 },
      this.movement,
      this.collider,
      this.input,
    );

    // FT20 score placeholder (no scoring logic yet).
    this.score = { p1: 0, p2: 0, target: 20 };

    this._acc = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);
  }

  start() {
    this._renderHud();
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(now) {
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    this._acc += frame;
    while (this._acc >= FIXED_DT) {
      this.player.update(FIXED_DT);
      this._acc -= FIXED_DT;
    }

    this._render();
    this._renderDebug();
    requestAnimationFrame(this._loop);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _render() {
    const { ctx, canvas, map } = this;
    const t = map.tileSize;

    // Background.
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, COLORS.sky0);
    g.addColorStop(1, COLORS.sky1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid.
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let c = 0; c <= map.cols; c++) {
      ctx.beginPath(); ctx.moveTo(c * t, 0); ctx.lineTo(c * t, canvas.height); ctx.stroke();
    }
    for (let r = 0; r <= map.rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * t); ctx.lineTo(canvas.width, r * t); ctx.stroke();
    }

    // Solid tiles, with a lighter cap when the tile above is empty.
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (!this.collider.isSolid(c, r)) continue;
        const x = c * t, y = r * t;
        ctx.fillStyle = COLORS.tile;
        ctx.fillRect(x, y, t, t);
        if (!this.collider.isSolid(c, r - 1)) {
          ctx.fillStyle = COLORS.tileTop;
          ctx.fillRect(x, y, t, 5);
        }
      }
    }

    // Player.
    const s = this.player.state;
    ctx.fillStyle = COLORS.player[s.anim] || COLORS.player.idle;
    roundRect(ctx, s.x, s.y, s.width, s.height, 5);
    ctx.fill();

    // Facing eye.
    ctx.fillStyle = COLORS.eye;
    const eyeR = 3;
    const eyeX = s.facing >= 0 ? s.x + s.width - 8 : s.x + 5;
    const eyeY = s.y + 11;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderHud() {
    if (!this.hudEl) return;
    const { p1, p2, target } = this.score;
    this.hudEl.innerHTML =
      `<span class="p p1">P1 ${p1}</span>` +
      `<span class="vs">FT${target}</span>` +
      `<span class="p p2">${p2} P2</span>`;
  }

  _renderDebug() {
    if (!this.debugEl) return;
    const s = this.player.state;
    const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(1);
    this.debugEl.textContent = [
      `x        ${f(s.x)}`,
      `y        ${f(s.y)}`,
      `vx       ${f(s.vx)}`,
      `vy       ${f(s.vy)}`,
      `grounded ${s.grounded}`,
      `facing   ${s.facing > 0 ? 'right (+1)' : 'left (-1)'}`,
      `anim     ${s.anim} (${s.animIndex})`,
    ].join('\n');
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
