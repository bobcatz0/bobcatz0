import { buildArenaMap } from './arenaMap.js';
import { TileCollision } from './TileCollision.js';
import { MovementController } from './MovementController.js';
import { PlayerController } from './PlayerController.js';
import { InputState } from './InputState.js';
import { Camera } from './Camera.js';
import { AssetStore } from '../render/AssetStore.js';
import { TileSprites } from '../render/TileSprites.js';
import { CharacterSprite } from '../render/CharacterSprite.js';
import { aimAngle as computeAim } from '../diggerz/CharacterRig.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { CombatInput } from '../combat/CombatInput.js';
import { bodyHurtbox } from '../combat/geometry.js';
import { FIGHTER } from '../combat/CombatConfig.js';

const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.25;

// Fixed viewport (screen). The world is larger and the camera scrolls. Player
// is NOT scaled — no zoom — so it stays the same on-screen size.
const VIEW_W = 1000;
const VIEW_H = 640;

const COLORS = { sky0: '#11161f', sky1: '#1b2433', grid: 'rgba(255,255,255,0.03)' };
const P2_PALETTE = { body: '#8a6bff', bodyDark: '#5e45c9', head: '#c3b2ff', limb: '#5e45c9' };

/**
 * ArenaScene — larger PvP arena + follow camera. Movement/combat unchanged;
 * this turn only scales the map, adds the camera, and adapts rendering.
 */
export class ArenaScene {
  constructor(canvas, { debugEl, hudEl, winEl, resetBtn, debugChk } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugEl = debugEl;
    this.hudEl = hudEl;
    this.winEl = winEl;

    this.map = buildArenaMap(40);
    canvas.width = VIEW_W;       // viewport size (not world size)
    canvas.height = VIEW_H;

    this.collider = new TileCollision(this.map);
    this.movement = new MovementController();
    this.input = new InputState(window);
    this.camera = new Camera(VIEW_W, VIEW_H, this.map.worldW, this.map.worldH);

    this.assets = new AssetStore('assets/');
    this.tiles = new TileSprites(this.assets);
    this.character = new CharacterSprite(this.assets);
    this.assets.load().then((ready) => {
      console.log(ready
        ? '[arena] real Diggerz tiles.png loaded — rendering real sprites'
        : '[arena] tiles.png not found — using procedural Diggerz-style art');
    });

    this.player = new PlayerController(
      { x: this.map.spawns.p1.x, y: this.map.spawns.p1.y, width: 24, height: 36 },
      this.movement, this.collider, this.input,
    );

    // P2 dummy at the right-side spawn (still fighter; combat unchanged).
    const d = MovementController.createBody(this.map.spawns.p2.x, this.map.spawns.p2.y, 24, 36);
    d.facing = -1;
    this.dummy = { body: d };

    this.combat = new CombatSystem({ collider: this.collider, attacker: this.player, dummy: this.dummy });
    this.combatInput = new CombatInput(canvas);
    if (resetBtn) resetBtn.addEventListener('click', () => this.combat.reset(this.simTime));
    this.debugChk = debugChk;

    // Centre the camera on the player at the start (no slide from 0,0).
    const pb = this.player.body;
    this.camera.snap(pb.x + pb.w / 2, pb.y + pb.h / 2);

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

  _aimAngle() {
    const b = this.player.body;
    const w = this.camera.screenToWorld(this.combatInput.aimX, this.combatInput.aimY);
    return computeAim(b.x + b.w / 2, b.y + b.h / 2, w.x, w.y);
  }

  _loop(now) {
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    const wheel = this.combatInput.consumeWheel();
    if (wheel !== 0) this.combat.selectWheel(wheel);
    if (this.combatInput.consumeUsePress()) this.combat.use(this.simTime, this._aimAngle());

    this._acc += frame;
    while (this._acc >= FIXED_DT) {
      this.player.update(FIXED_DT);
      this.combat.update(FIXED_DT, this.simTime);
      this.simTime += FIXED_DT;
      this._acc -= FIXED_DT;
    }

    // Camera follows the player (smooth, clamped to the world).
    const pb = this.player.body;
    this.camera.follow(pb.x + pb.w / 2, pb.y + pb.h / 2, frame);

    this._render();
    this._renderHud();
    this._renderWin();
    this._renderDebug();
    requestAnimationFrame(this._loop);
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _render() {
    const { ctx, map } = this;
    const t = map.tileSize;
    const now = this.simTime;
    const cam = this.camera;

    // Sky fills the viewport (screen space).
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, COLORS.sky0); g.addColorStop(1, COLORS.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // World space.
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // Visible tile range (cull to viewport).
    const c0 = Math.max(0, Math.floor(cam.x / t));
    const c1 = Math.min(map.cols - 1, Math.floor((cam.x + VIEW_W) / t));
    const r0 = Math.max(0, Math.floor(cam.y / t));
    const r1 = Math.min(map.rows - 1, Math.floor((cam.y + VIEW_H) / t));

    // Light grid for the visible region.
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (let c = c0; c <= c1 + 1; c++) { ctx.beginPath(); ctx.moveTo(c * t, r0 * t); ctx.lineTo(c * t, (r1 + 1) * t); ctx.stroke(); }
    for (let r = r0; r <= r1 + 1; r++) { ctx.beginPath(); ctx.moveTo(c0 * t, r * t); ctx.lineTo((c1 + 1) * t, r * t); ctx.stroke(); }

    // Solid tiles (real Diggerz grass/dirt/stone).
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.collider.isSolid(c, r)) this.tiles.drawTile(ctx, this._tileKind(c, r), c * t, r * t, t);

    // Dummy (skip while dead; flash while invulnerable).
    const dm = this.combat.dummy;
    if (dm.health.alive) {
      this.character.draw(ctx, this._bodyState(dm.body), now, P2_PALETTE);
      if (dm.health.isInvulnerable(now)) this._flash(dm.body);
      this._healthBar(dm.body, dm.health);
    }

    // Player.
    this.character.draw(ctx, this.player.state, now);
    this._healthBar(this.player.body, this.combat.attacker.health);

    // Projectiles + melee swing visuals.
    for (const w of this.combat.hotbar.slots) {
      if (w.combat.kind === 'projectile') for (const p of this.combat.projectilesOf(w.id)) this._drawProjectile(p);
      if (w.combat.kind === 'melee') { const arc = this.combat.resolvers[w.id].debugArc(now, this.player.body); if (arc) this._drawSwing(arc); }
    }

    if (this._debugOn()) this._drawCombatDebug();

    ctx.restore();

    // Screen space.
    this._renderHotbar();
  }

  _tileKind(c, r) {
    if (!this.collider.isSolid(c, r - 1)) return 'grass';
    let depth = 0;
    for (let rr = r - 1; rr >= 0 && this.collider.isSolid(c, rr); rr--) depth++;
    return depth >= 4 ? 'stone' : 'dirt';
  }

  _bodyState(b) {
    return { x: b.x, y: b.y, width: b.w, height: b.h, vx: b.vx, vy: b.vy, grounded: b.grounded, facing: b.facing, anim: b.anim || 'idle' };
  }

  _debugOn() { return this.debugChk ? this.debugChk.checked : false; }

  _healthBar(body, health) {
    const ctx = this.ctx;
    const w = body.w + 6, h = 5, x = body.x - 3, y = body.y - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const frac = Math.max(0, health.hp / health.max);
    ctx.fillStyle = frac > 0.5 ? '#5bffa0' : frac > 0.25 ? '#ffe27f' : '#ff5b5b';
    ctx.fillRect(x, y, w * frac, h);
  }

  _flash(body) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
    ctx.fillRect(body.x - 3, body.y - 8, body.w + 6, body.h + 10); ctx.restore();
  }

  _drawProjectile(p) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = '#7fd1ff'; ctx.strokeStyle = '#2a6f9e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.fillRect(-p.w, -1, p.w, 2);
    ctx.restore();
  }

  _drawSwing(arc) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(arc.x, arc.y);
    ctx.arc(arc.x, arc.y, arc.reach, arc.aim - arc.arc / 2, arc.aim + arc.arc / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawCombatDebug() {
    const ctx = this.ctx;
    const stroke = (box, color) => { if (!box) return; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h); };
    stroke(bodyHurtbox(this.player.body, FIGHTER.hurtboxInset), '#5bffa0');
    if (this.combat.dummy.health.alive) stroke(bodyHurtbox(this.combat.dummy.body, FIGHTER.hurtboxInset), '#5bffa0');
    for (const w of this.combat.hotbar.slots)
      if (w.combat.kind === 'projectile') for (const p of this.combat.projectilesOf(w.id)) stroke(p.aabb(), '#ffe27f');
  }

  _renderHotbar() {
    const ctx = this.ctx;
    const slots = this.combat.hotbar.slots;
    const size = 46, gap = 8;
    const totalW = slots.length * size + (slots.length - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2;
    const y = VIEW_H - size - 10;
    slots.forEach((w, i) => {
      const x = x0 + i * (size + gap);
      const selected = i === this.combat.hotbar.selected;
      ctx.fillStyle = 'rgba(8,12,20,0.7)'; ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = selected ? '#ffe27f' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = selected ? 2.5 : 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      const spr = this.assets.getSprite(w.spriteKey);
      if (spr) {
        const pad = 6, maxw = size - pad * 2, maxh = size - pad * 2;
        const sc = Math.min(maxw / spr.sw, maxh / spr.sh);
        const dw = spr.sw * sc, dh = spr.sh * sc;
        ctx.drawImage(spr.image, spr.sx, spr.sy, spr.sw, spr.sh, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      }
      if (selected) {
        ctx.fillStyle = '#ffe27f'; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'center';
        ctx.fillText(w.name, VIEW_W / 2, y - 6); ctx.textAlign = 'left';
      }
    });
  }

  _renderHud() {
    if (!this.hudEl) return;
    const { p1, p2 } = this.combat.match.scores;
    this.hudEl.innerHTML =
      `<span class="p p1">P1 ${p1}</span><span class="vs">FT${this.combat.match.ftTarget}</span><span class="p p2">${p2} P2</span>`;
  }

  _renderWin() {
    if (!this.winEl) return;
    if (this.combat.match.winner) {
      this.winEl.querySelector('[data-win-text]').textContent = `${this.combat.match.winner} Wins FT${this.combat.match.ftTarget}`;
      this.winEl.style.display = 'flex';
    } else {
      this.winEl.style.display = 'none';
    }
  }

  _renderDebug() {
    if (!this.debugEl) return;
    const s = this.player.state;
    const a = this.combat.attacker.health, d = this.combat.dummy.health;
    const w = this.combat.selectedWeapon;
    const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(1);
    this.debugEl.textContent = [
      `x ${f(s.x)}  y ${f(s.y)}   (world)`,
      `vx ${f(s.vx)}  vy ${f(s.vy)}`,
      `grounded ${s.grounded}  facing ${s.facing > 0 ? 'R' : 'L'}  anim ${s.anim}`,
      `camera ${f(this.camera.x)}, ${f(this.camera.y)}`,
      ``,
      `weapon ${w.name} (id ${w.id})`,
      `P1 hp ${a.hp}/${a.max}   P2 hp ${d.hp}/${d.max}${d.alive ? '' : ' (dead)'}`,
      `score P1 ${this.combat.match.scores.p1} / FT${this.combat.match.ftTarget}`,
    ].join('\n');
  }
}
