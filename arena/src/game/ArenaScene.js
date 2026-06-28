import { buildArenaMap } from './arenaMap.js';
import { TileCollision } from './TileCollision.js';
import { MovementController } from './MovementController.js';
import { PlayerController } from './PlayerController.js';
import { InputState } from './InputState.js';
import { Camera } from './Camera.js';
import { AssetStore } from '../render/AssetStore.js';
import { TileSprites } from '../render/TileSprites.js';
import { CharacterSprite } from '../render/CharacterSprite.js';
import { Background } from '../render/Background.js';
// Confirmed Diggerz systems (no combat resolution — intent only):
import { Hotbar, ITEM_TYPE } from '../diggerz/ItemSystem.js';
import { byId } from '../diggerz/DiggerzWeaponCatalog.js';
import { CombatController } from '../diggerz/CombatController.js';
import { aimAngle as computeAim, encodeAim } from '../diggerz/CharacterRig.js';
import { CombatInput } from '../combat/CombatInput.js';

const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.25;
const VIEW_W = 1000;
const VIEW_H = 640;

const COLORS = { sky0: '#11161f', sky1: '#1b2433', grid: 'rgba(255,255,255,0.03)' };
const P2_PALETTE = { body: '#8a6bff', bodyDark: '#5e45c9', head: '#c3b2ff', limb: '#5e45c9' };

// Combat V1 loadout — the 3 confirmed Diggerz weapons (catalog ids), held items.
const LOADOUT_IDS = [55, 79, 248]; // Fake Sword, Blue Ray Gun, Shotgun
const weaponSlot = (id) => ({ ...byId(id), type: ITEM_TYPE.WEAPON });

/**
 * ArenaScene — large arena + camera + the CONFIRMED Diggerz hotbar / weapon
 * selection / mouse aim / left-click use-INTENT. No combat resolution: no
 * damage, hit detection, projectiles, melee or scoring. Left-click only emits
 * the confirmed opcode-287-shaped use intent (logged + shown for debugging).
 */
export class ArenaScene {
  constructor(canvas, { debugEl, hudEl, resetBtn, debugChk } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugEl = debugEl;
    this.hudEl = hudEl;
    this.debugChk = debugChk;

    this.map = buildArenaMap(40);
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    this.collider = new TileCollision(this.map);
    this.movement = new MovementController();
    this.input = new InputState(window);
    this.camera = new Camera(VIEW_W, VIEW_H, this.map.worldW, this.map.worldH);

    this.assets = new AssetStore('assets/', 'tiles.atlas.json');     // tiles + weapons + character
    this.ui = new AssetStore('assets/', 'ui.atlas.json');            // HUD/hotbar sprites
    this.tiles = new TileSprites(this.assets);
    this.character = new CharacterSprite(this.assets);
    this.background = new Background('assets/');
    this.ready = Promise.all([this.assets.load(), this.ui.load(), this.background.load()]).then(([t]) => {
      console.log(t ? '[arena] real Diggerz tiles.png loaded' : '[arena] tiles.png not found — procedural art');
      return t;
    });

    this.player = new PlayerController(
      { x: this.map.spawns.p1.x, y: this.map.spawns.p1.y, width: 24, height: 36 },
      this.movement, this.collider, this.input,
    );
    // P2 is a static visual reference only (no health, no hurtbox, no combat).
    this.p2 = MovementController.createBody(this.map.spawns.p2.x, this.map.spawns.p2.y, 24, 36);
    this.p2.facing = -1;

    // ── Confirmed Diggerz hotbar + use-intent (NO resolution) ──
    this.hotbar = new Hotbar(LOADOUT_IDS.map(weaponSlot));
    this.controller = new CombatController({
      hotbar: this.hotbar,
      isMelee: (item) => item?.category === 'melee',
      onUseIntent: (intent, used) => this._onUseIntent(intent, used),
    });
    this.combatInput = new CombatInput(canvas);
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetView());

    // Aim + use-intent debug state.
    this.aimAngle = 0;
    this.aimPoint = { x: 0, y: 0 };
    this.lastUseIntent = null;
    this.useIntentCount = 0;
    this.lastUseAt = -999;

    const pb = this.player.body;
    this.camera.snap(pb.x + pb.w / 2, pb.y + pb.h / 2);

    this.simTime = 0;
    this._acc = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);
  }

  start() {
    this._renderHud();
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  resetView() {
    const s = this.map.spawns.p1;
    const b = this.player.body;
    b.x = s.x; b.y = s.y; b.vx = 0; b.vy = 0;
    this.hotbar.select(0);
    this.camera.snap(b.x + b.w / 2, b.y + b.h / 2);
  }

  _onUseIntent(intent, used) {
    this.lastUseIntent = { ...intent, weapon: used.item?.name, angle: used.angle };
    this.useIntentCount += 1;
    this.lastUseAt = this.simTime;
    // Show the generated use intent for debugging (NOT resolved into damage).
    console.log(`[use-intent] op${intent.opcode} slot ${intent.slot} (${used.item?.name}) ` +
      `origin (${intent.originX.toFixed(0)},${intent.originY.toFixed(0)}) -> target (${intent.targetX.toFixed(0)},${intent.targetY.toFixed(0)})`);
  }

  _loop(now) {
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    // Mouse aim in world space (camera-aware).
    this.aimPoint = this.camera.screenToWorld(this.combatInput.aimX, this.combatInput.aimY);
    const pb = this.player.body;
    const pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    this.aimAngle = computeAim(pcx, pcy, this.aimPoint.x, this.aimPoint.y);

    // Confirmed Diggerz flow: wheel selects, left-click emits use intent.
    const wheel = this.combatInput.consumeWheel();
    const pressed = this.combatInput.consumeUsePress();
    this.controller.step(
      { keyState: {}, mouse: { state: (this.combatInput.using || pressed) ? 1 : 0, wheel } },
      { x: pcx, y: pcy, grounded: pb.grounded, moving: Math.abs(pb.vx) > 10, facing: pb.facing },
      this.aimPoint,
    );

    this._acc += frame;
    while (this._acc >= FIXED_DT) {
      this.player.update(FIXED_DT);
      this.simTime += FIXED_DT;
      this._acc -= FIXED_DT;
    }
    this.camera.follow(pcx, pcy, frame);

    this._render();
    this._renderHud();
    this._renderDebug();
    requestAnimationFrame(this._loop);
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _render() {
    const { ctx, map } = this;
    const t = map.tileSize;
    const now = this.simTime;
    const cam = this.camera;

    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, COLORS.sky0); g.addColorStop(1, COLORS.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.background.render(ctx, cam, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    const c0 = Math.max(0, Math.floor(cam.x / t));
    const c1 = Math.min(map.cols - 1, Math.floor((cam.x + VIEW_W) / t));
    const r0 = Math.max(0, Math.floor(cam.y / t));
    const r1 = Math.min(map.rows - 1, Math.floor((cam.y + VIEW_H) / t));

    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (let c = c0; c <= c1 + 1; c++) { ctx.beginPath(); ctx.moveTo(c * t, r0 * t); ctx.lineTo(c * t, (r1 + 1) * t); ctx.stroke(); }
    for (let r = r0; r <= r1 + 1; r++) { ctx.beginPath(); ctx.moveTo(c0 * t, r * t); ctx.lineTo((c1 + 1) * t, r * t); ctx.stroke(); }

    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.collider.isSolid(c, r)) this.tiles.drawTile(ctx, this._tileKind(c, r), c * t, r * t, t);

    // P2 static visual reference, then the player.
    this.character.draw(ctx, this._bodyState(this.p2), now, P2_PALETTE);
    this.character.draw(ctx, this.player.state, now);

    // Aim line + reticle (the confirmed aim direction, player -> mouse).
    if (this._debugOn()) this._drawAim();

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

  _debugOn() { return this.debugChk ? this.debugChk.checked : true; }

  _drawAim() {
    const ctx = this.ctx;
    const pb = this.player.body;
    const px = pb.x + pb.w / 2, py = pb.y + pb.h / 2;
    const recent = this.simTime - this.lastUseAt < 0.18;
    ctx.save();
    ctx.strokeStyle = recent ? 'rgba(255,226,127,0.9)' : 'rgba(127,209,255,0.7)';
    ctx.lineWidth = 2;
    // short direction indicator from the player + dashed line to the cursor
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(this.aimAngle) * 60, py + Math.sin(this.aimAngle) * 60);
    ctx.stroke();
    ctx.setLineDash([4, 6]); ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(this.aimPoint.x, this.aimPoint.y); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // reticle at the aim point
    ctx.strokeStyle = recent ? '#ffe27f' : '#7fd1ff';
    ctx.beginPath(); ctx.arc(this.aimPoint.x, this.aimPoint.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.aimPoint.x - 11, this.aimPoint.y); ctx.lineTo(this.aimPoint.x + 11, this.aimPoint.y);
    ctx.moveTo(this.aimPoint.x, this.aimPoint.y - 11); ctx.lineTo(this.aimPoint.x, this.aimPoint.y + 11); ctx.stroke();
    ctx.restore();
  }

  _renderHotbar() {
    const ctx = this.ctx;
    const slots = this.hotbar.slots;
    const size = 52, gap = 10;
    const totalW = slots.length * size + (slots.length - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2;
    const y = VIEW_H - size - 12;

    slots.forEach((w, i) => {
      const x = x0 + i * (size + gap);
      const selected = i === this.hotbar.selected;
      // Slot background — real Diggerz UI sprite (POCKET) if available, else panel.
      if (!this.ui.draw(ctx, 'POCKET_PNG', x, y, size, size)) {
        ctx.fillStyle = 'rgba(8,12,20,0.72)'; ctx.fillRect(x, y, size, size);
      }
      // Weapon icon — real Diggerz weapon sprite from tiles.png.
      const spr = this.assets.getSprite(w.spriteKey);
      if (spr) {
        const pad = 9, mw = size - pad * 2, mh = size - pad * 2;
        const sc = Math.min(mw / spr.sw, mh / spr.sh);
        const dw = spr.sw * sc, dh = spr.sh * sc;
        ctx.drawImage(spr.image, spr.sx, spr.sy, spr.sw, spr.sh, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      }
      // Selection highlight + slot number.
      ctx.strokeStyle = selected ? '#ffe27f' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = selected ? '#ffe27f' : 'rgba(255,255,255,0.5)';
      ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), x + 4, y + 13);
    });

    // Selected weapon name above the bar.
    const sel = this.hotbar.selectedItem;
    if (sel) {
      ctx.fillStyle = '#ffe27f'; ctx.font = '14px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText(sel.name, VIEW_W / 2, y - 8);
      ctx.textAlign = 'left';
    }
  }

  _renderHud() {
    if (!this.hudEl) return;
    const sel = this.hotbar.selectedItem;
    this.hudEl.innerHTML =
      `<span class="p p1">Diggerz hotbar</span>` +
      `<span class="vs">use-intent only</span>` +
      `<span class="p p2">${sel ? sel.name : '—'}</span>`;
  }

  _renderDebug() {
    if (!this.debugEl) return;
    const pb = this.player.body;
    const sel = this.hotbar.selectedItem;
    const deg = (this.aimAngle * 180 / Math.PI).toFixed(1);
    const fired = this.simTime - this.lastUseAt < 0.3;
    const li = this.lastUseIntent;
    const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(0);
    this.debugEl.textContent = [
      `slot      ${this.hotbar.selected + 1}/${this.hotbar.slots.length}`,
      `weapon    ${sel ? `${sel.name} (id ${sel.id})` : '—'}`,
      `aim       ${deg}°  (enc ${encodeAim(this.aimAngle)})`,
      `use-intent ${this.useIntentCount} fired${fired ? '  <<< FIRED' : ''}`,
      li ? `  last    op${li.opcode} slot ${li.slot} -> (${f(li.targetX)},${f(li.targetY)})` : `  last    —`,
      ``,
      `mouse(w)  ${f(this.aimPoint.x)}, ${f(this.aimPoint.y)}`,
      `player(w) ${f(pb.x)}, ${f(pb.y)}`,
      `camera    ${f(this.camera.x)}, ${f(this.camera.y)}`,
    ].join('\n');
  }
}
