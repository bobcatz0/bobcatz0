import { buildArenaMap } from './arenaMap.js';
import { TileCollision } from './TileCollision.js';
import { MovementController } from './MovementController.js';
import { PlayerController } from './PlayerController.js';
import { InputState } from './InputState.js';
import { AssetStore } from '../render/AssetStore.js';
import { TileSprites } from '../render/TileSprites.js';
import { CharacterSprite } from '../render/CharacterSprite.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { CombatInput } from '../combat/CombatInput.js';
import { bodyHurtbox } from '../combat/Hurtbox.js';

const FIXED_DT = 1 / 120;     // physics step (s) — small for stable feel
const MAX_FRAME = 0.25;       // clamp huge gaps (tab switch) to avoid spiral

const COLORS = {
  sky0: '#11161f',
  sky1: '#1b2433',
  grid: 'rgba(255,255,255,0.03)',
};

// Player 2 (dummy) gets a cooler palette to read as the opponent.
const P2_PALETTE = {
  body: '#8a6bff', bodyDark: '#5e45c9', head: '#c3b2ff', limb: '#5e45c9',
};

/**
 * ArenaScene — owns the canvas, the arena, the player, and the game loop.
 * Single-player prototype: no networking, no scoring logic yet (FT20 is a
 * static placeholder). Its job is to prove the movement feels right.
 */
export class ArenaScene {
  constructor(canvas, { debugEl, hudEl, winEl, resetBtn } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugEl = debugEl;
    this.hudEl = hudEl;
    this.winEl = winEl;

    const tileSize = 40;
    this.map = buildArenaMap(tileSize);
    canvas.width = this.map.cols * tileSize;
    canvas.height = this.map.rows * tileSize;

    this.collider = new TileCollision(this.map);
    this.movement = new MovementController();
    this.input = new InputState(window);

    // Rendering assets: loads the real Diggerz atlas if tiles.png is present in
    // assets/, otherwise the tile + character renderers fall back to procedural
    // Diggerz-style art. Loading is async; rendering swaps to real sprites the
    // moment they're ready.
    this.assets = new AssetStore('assets/');
    this.tiles = new TileSprites(this.assets);
    this.character = new CharacterSprite(this.assets);
    this.assets.load().then((ready) => {
      console.log(ready
        ? '[arena] real Diggerz tiles.png loaded — rendering real sprites'
        : '[arena] tiles.png not found — using procedural Diggerz-style art (drop assets/tiles.png to use real sprites)');
    });

    this.player = new PlayerController(
      { x: this.map.spawn.x, y: this.map.spawn.y, width: 24, height: 36 },
      this.movement,
      this.collider,
      this.input,
    );

    // Player 2 / dummy target: a still body on the floor, to its right. It has
    // a body (so it has a hurtbox) but is never stepped, so it stands still.
    const restY = (this.map.rows - 1) * tileSize - 36;
    const p2Body = MovementController.createBody(16 * tileSize, restY, 24, 36);
    p2Body.facing = -1; // looking toward P1
    this.p2 = { body: p2Body, hits: 0, flash: 0 };

    // Combat: P1 attacks the dummy. FT20 scoring lives here.
    this.combat = new CombatSystem({
      collider: this.collider,
      attacker: this.player, // PlayerController exposes .body
      targets: [this.p2],
      config: { target: 20 },
    });
    this.combatInput = new CombatInput(window, canvas);
    if (resetBtn) resetBtn.addEventListener('click', () => this.combat.reset());

    this.showDebug = false; // hitbox/hurtbox overlay (toggle with H)
    this.simTime = 0;

    this._acc = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);
  }

  start() {
    this._renderHud();
    this._renderWin();
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(now) {
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    // Discrete combat actions: consume once per frame (edge-triggered).
    const actions = this.combatInput.consume();
    if (actions.has('toggleDebug')) this.showDebug = !this.showDebug;
    if (actions.has('reset')) this.combat.reset();
    if (actions.has('melee')) this.combat.meleeAttack();
    if (actions.has('projectile')) this.combat.fireProjectile();

    this._acc += frame;
    while (this._acc >= FIXED_DT) {
      this.player.update(FIXED_DT);
      this.combat.update(FIXED_DT);
      this.simTime += FIXED_DT;
      this._acc -= FIXED_DT;
    }

    this._render();
    this._renderHud();
    this._renderWin();
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

    // Solid tiles: grass-topped where exposed to air, dirt below, stone deep.
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (!this.collider.isSolid(c, r)) continue;
        const kind = this._tileKind(c, r);
        this.tiles.drawTile(ctx, kind, c * t, r * t, t);
      }
    }

    const now = this.simTime;

    // Player 2 / dummy (drawn first so P1 overlaps it when close).
    this.character.draw(ctx, this._bodyState(this.p2.body), now, P2_PALETTE);
    if (this.p2.flash > 0) this._drawFlash(ctx, this.p2.body, this.p2.flash);

    // Player 1.
    this.character.draw(ctx, this.player.state, now);

    // Projectiles (always visible).
    for (const p of this.combat.projectiles) this._drawProjectile(ctx, p);

    // Melee swing effect (always visible while active).
    if (this.combat.melee.isActive) this._drawSlash(ctx, this.combat.meleeHitbox());

    // Debug hitbox/hurtbox overlay (toggle H).
    if (this.showDebug) this._drawDebugBoxes(ctx);
  }

  /** Adapt a raw body into the shape CharacterSprite.draw expects. */
  _bodyState(b) {
    return {
      x: b.x, y: b.y, width: b.w, height: b.h,
      vx: b.vx, vy: b.vy, grounded: b.grounded, facing: b.facing, anim: b.anim || 'idle',
    };
  }

  _drawProjectile(ctx, p) {
    ctx.save();
    ctx.fillStyle = '#ffe27f';
    ctx.strokeStyle = '#a87f1f';
    ctx.lineWidth = 1;
    const r = p.aabb();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // little motion streak
    ctx.globalAlpha = 0.35;
    ctx.fillRect(p.dir >= 0 ? r.x - 8 : r.x + r.w, r.y + r.h / 2 - 1, 8, 2);
    ctx.restore();
  }

  _drawSlash(ctx, hb) {
    if (!hb) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(hb.x + hb.w / 2, hb.y + hb.h / 2, hb.w * 0.6, hb.h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFlash(ctx, body, flash) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, flash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(body.x - 3, body.y - 8, body.w + 6, body.h + 10);
    ctx.restore();
  }

  _drawDebugBoxes(ctx) {
    const stroke = (box, color, label) => {
      if (!box) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
      if (label) {
        ctx.fillStyle = color;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(label, box.x, box.y - 3);
      }
    };
    // hurtboxes (green)
    stroke(bodyHurtbox(this.player.body, 2), '#5bffa0', 'P1');
    stroke(bodyHurtbox(this.p2.body, 2), '#5bffa0', `P2 hits:${this.p2.hits}`);
    // melee hitbox (red) when active
    if (this.combat.melee.isActive) stroke(this.combat.meleeHitbox(), '#ff5b5b', 'hit');
    // projectile boxes (yellow)
    for (const p of this.combat.projectiles) stroke(p.aabb(), '#ffe27f', null);
  }

  /** Classify a solid tile for rendering: exposed top -> grass, deep -> stone. */
  _tileKind(c, r) {
    if (!this.collider.isSolid(c, r - 1)) return 'grass'; // air above => grassy top
    // count solid depth above; deep solid rock reads as stone
    let depth = 0;
    for (let rr = r - 1; rr >= 0 && this.collider.isSolid(c, rr); rr--) depth++;
    return depth >= 4 ? 'stone' : 'dirt';
  }

  _renderHud() {
    if (!this.hudEl) return;
    const { p1, p2 } = this.combat.scores;
    const target = this.combat.cfg.target;
    this.hudEl.innerHTML =
      `<span class="p p1">P1 ${p1}</span>` +
      `<span class="vs">FT${target}</span>` +
      `<span class="p p2">${p2} P2</span>`;
  }

  _renderWin() {
    if (!this.winEl) return;
    if (this.combat.winner) {
      this.winEl.querySelector('[data-win-text]').textContent = `${this.combat.winner} Wins FT${this.combat.cfg.target}`;
      this.winEl.style.display = 'flex';
    } else {
      this.winEl.style.display = 'none';
    }
  }

  _renderDebug() {
    if (!this.debugEl) return;
    const s = this.player.state;
    const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(1);
    const lines = [
      `x        ${f(s.x)}`,
      `y        ${f(s.y)}`,
      `vx       ${f(s.vx)}`,
      `vy       ${f(s.vy)}`,
      `grounded ${s.grounded}`,
      `facing   ${s.facing > 0 ? 'right (+1)' : 'left (-1)'}`,
      `anim     ${s.anim} (${s.animIndex})`,
      ``,
      `P2 pos   ${f(this.p2.body.x)}, ${f(this.p2.body.y)}`,
      `P2 hits  ${this.p2.hits}`,
      `melee cd ${this.combat.melee.cooldownRemaining().toFixed(2)}s`,
      `boxes    ${this.showDebug ? 'ON (H)' : 'off (H)'}`,
    ];
    this.debugEl.textContent = lines.join('\n');
  }
}
