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
import { aimAngle as computeAim, encodeAim } from '../diggerz/CharacterRig.js';
import { bodyRenderFacing } from '../render/CharacterRigConfig.js';
import { hotbarSlotForCode } from '../diggerz/InputBindings.js';
import { CombatInput } from '../combat/CombatInput.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { bodyHurtbox } from '../combat/geometry.js';
import { FIGHTER } from '../combat/CombatConfig.js';
import { HitFx } from './HitFx.js';
import { swordSwingAt, swordHoldPose, SWING_DURATION } from '../combat/swordSwing.js';
import { h4css, tintSprite } from '../render/h4Palette.js';
import { ShotFx, tracerThickness, tracerAlpha, laserAlpha } from './ShotFx.js';

const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.25;
const VIEW_W = 1000;
const VIEW_H = 640;
// Hold the aim when the cursor is within this world distance of the player so a
// cursor on/near the character doesn't whip the held weapon through the face.
const MIN_AIM_DIST = 28;

const COLORS = { sky0: '#11161f', sky1: '#1b2433', grid: 'rgba(255,255,255,0.03)' };
const P2_PALETTE = { body: '#8a6bff', bodyDark: '#5e45c9', head: '#c3b2ff', limb: '#5e45c9' };

/**
 * ArenaScene — large arena + camera/zoom + the real Diggerz hotbar/aim and
 * Combat V1 (Fake Sword melee + Blue Ray Gun projectile; Shotgun selectable but
 * not yet resolving). Health / death / respawn / FT20 kills. All combat NUMBERS
 * are PROPOSED standalone values (src/combat/CombatConfig.js).
 */
export class ArenaScene {
  constructor(canvas, { debugEl, hudEl, winEl, resetBtn, debugChk, rigChk, zoomInBtn, zoomOutBtn, zoomResetBtn, zoomLabel } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugEl = debugEl;
    this.hudEl = hudEl;
    this.winEl = winEl;
    this.debugChk = debugChk;
    this.rigChk = rigChk;
    this.zoomLabel = zoomLabel;
    this._renderFacing = 1; // body render facing (movement/aim rule); see _facing()

    this.map = buildArenaMap(40);
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    this.collider = new TileCollision(this.map);
    this.movement = new MovementController();
    this.input = new InputState(window);
    this.camera = new Camera(VIEW_W, VIEW_H, this.map.worldW, this.map.worldH);

    this.assets = new AssetStore('assets/', 'tiles.atlas.json');
    this.ui = new AssetStore('assets/', 'ui.atlas.json');
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
    const dummyBody = MovementController.createBody(this.map.spawns.p2.x, this.map.spawns.p2.y, 24, 36);
    dummyBody.facing = -1;
    this.dummyBody = dummyBody;

    // Combat V1 (resolution): hotbar lives in CombatSystem.
    this.combat = new CombatSystem({ collider: this.collider, attacker: this.player, dummy: { body: dummyBody } });
    this.combatInput = new CombatInput(canvas);
    if (resetBtn) resetBtn.addEventListener('click', () => this.combat.reset(this.simTime));

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomBy(1.15));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomBy(1 / 1.15));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.resetZoom());
    window.addEventListener('keydown', (e) => {
      // Number keys select the hotbar weapon (1=Sword, 2=Ray Gun, 3=Shotgun).
      const slot = hotbarSlotForCode(e.code);
      if (slot !== null) { this.combat.selectSlot(slot); e.preventDefault(); return; }
      // 0 resets zoom; +/- still nudge it (the wheel is the primary zoom).
      if (e.code === 'Digit0' || e.code === 'Numpad0') { this.resetZoom(); e.preventDefault(); }
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') { this.zoomBy(1.15); e.preventDefault(); }
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract') { this.zoomBy(1 / 1.15); e.preventDefault(); }
    });

    this.aimAngle = 0;
    this.aimPoint = { x: 0, y: 0 };

    const pb = this.player.body;
    this.camera.snap(pb.x + pb.w / 2, pb.y + pb.h / 2);

    // Hit/death feedback (visual only; observes combat, never drives it).
    this.hitfx = new HitFx();
    // Shot visuals (real client style): live projectile origins + fading fx.
    this._shotLive = new Map();   // projectile -> { ox, oy, lx, ly }
    this.shotfx = new ShotFx();   // tracer + laser entries (pure; rendered here)
    this._tintCache = {};         // weaponKey -> tinted sprite
    const dh = this.combat.dummy.health, ah = this.combat.attacker.health;
    this._fxPrev = { dHp: dh.hp, pHp: ah.hp, dAlive: dh.alive, pAlive: ah.alive };

    this.simTime = 0;
    this._acc = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);
  }

  start() {
    this._renderHud(); this._renderWin(); this._updateZoomLabel();
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _playerCenter() { const b = this.player.body; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
  zoomBy(f) { const c = this._playerCenter(); this.camera.zoomBy(f, c.x, c.y); this._updateZoomLabel(); }
  resetZoom() { const c = this._playerCenter(); this.camera.resetZoom(c.x, c.y); this._updateZoomLabel(); }
  _updateZoomLabel() { if (this.zoomLabel) this.zoomLabel.textContent = `${this.camera.zoom.toFixed(2)}×`; }

  _loop(now) {
    let frame = (now - this._last) / 1000;
    this._last = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    this.aimPoint = this.camera.screenToWorld(this.combatInput.aimX, this.combatInput.aimY);
    const pb = this.player.body;
    const pcx = pb.x + pb.w / 2, pcy = pb.y + pb.h / 2;
    // Minimum aim distance: ignore the cursor while it's right on the character
    // (keep the last stable aim) so the weapon doesn't jitter/point through the face.
    if (Math.hypot(this.aimPoint.x - pcx, this.aimPoint.y - pcy) >= MIN_AIM_DIST) {
      this.aimAngle = computeAim(pcx, pcy, this.aimPoint.x, this.aimPoint.y);
    }

    // Mouse wheel zooms the camera (wheel up = in, down = out), centred on P1.
    const wheel = this.combatInput.consumeWheel();
    if (wheel < 0) this.zoomBy(1.15);
    else if (wheel > 0) this.zoomBy(1 / 1.15);
    if (this.combatInput.consumeUsePress()) this.combat.use(this.simTime, this.aimAngle);

    // Tiny hit-stop: briefly freeze the sim on a hit (visual juice only).
    if (this.hitfx.frozen()) {
      this.hitfx.update(frame);
    } else {
      this._acc += frame;
      while (this._acc >= FIXED_DT) {
        this.player.update(FIXED_DT);
        this.combat.update(FIXED_DT, this.simTime);
        this.simTime += FIXED_DT;
        this._acc -= FIXED_DT;
      }
      this._detectFx();          // observe HP/alive changes -> spawn feedback
      this.hitfx.update(frame);
    }
    this.camera.follow(pcx, pcy, frame);

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

    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, COLORS.sky0); g.addColorStop(1, COLORS.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.background.render(ctx, cam, VIEW_W, VIEW_H);

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    const c0 = Math.max(0, Math.floor(cam.x / t));
    const c1 = Math.min(map.cols - 1, Math.floor((cam.x + cam.viewWorldW) / t));
    const r0 = Math.max(0, Math.floor(cam.y / t));
    const r1 = Math.min(map.rows - 1, Math.floor((cam.y + cam.viewWorldH) / t));

    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (let c = c0; c <= c1 + 1; c++) { ctx.beginPath(); ctx.moveTo(c * t, r0 * t); ctx.lineTo(c * t, (r1 + 1) * t); ctx.stroke(); }
    for (let r = r0; r <= r1 + 1; r++) { ctx.beginPath(); ctx.moveTo(c0 * t, r * t); ctx.lineTo((c1 + 1) * t, r * t); ctx.stroke(); }

    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.collider.isSolid(c, r)) this.tiles.drawTile(ctx, this._tileKind(c, r), c * t, r * t, t);

    // ── Dummy (P2): alive -> draw + health bar + invuln flash; dead -> marker.
    const d = this.combat.dummy;
    if (d.health.alive) {
      this.character.draw(ctx, this._bodyState(d.body), now, { palette: P2_PALETTE });
      if (d.health.isInvulnerable(now)) this._flash(d.body);
      this._healthBar(d.body, d.health);
    } else {
      this._respawnMarker(d);
    }

    // ── Player (P1): holding the selected weapon. The sword uses the REAL
    // sword_pose hold + zswing swing (weapon-only animation); guns aim at the
    // mouse. The Blue Ray Gun sprite is tinted its real h4(4) blue.
    const sel = this.combat.selectedWeapon;
    const weaponSprite = sel ? this._weaponSprite(sel) : null;
    const pstate = { ...this.player.state, facing: this._facing() };
    let swordPose = null;
    if (sel && sel.combat.kind === 'melee') {
      const r = this.combat.resolvers[sel.id];
      swordPose = r.isSwinging(now)
        ? swordSwingAt(r.swingProgress(now) * SWING_DURATION)
        : swordHoldPose();
    }
    this.character.draw(ctx, pstate, now, {
      aim: this.aimAngle, weapon: weaponSprite, weaponKey: sel ? sel.spriteKey : null,
      swordPose, debugRig: this._rigOn(),
    });
    this._healthBar(this.player.body, this.combat.attacker.health);

    // ── Projectiles (ray gun) + shot tracers/laser (real client-style visuals).
    this._trackShots();
    for (const w of this.combat.hotbar.slots) {
      const r = this.combat.resolvers[w.id];
      if (!r) continue;
      if (w.combat.kind === 'projectile') for (const p of r.projectiles) this._drawProjectile(p, w);
    }
    this._drawShotFx(now);

    // ── Hit feedback: character flash + sparks / damage numbers / rings.
    if (d.health.alive) this._drawHitFlash(d.body, this.hitfx.flashAmt('p2'));
    this._drawHitFlash(this.player.body, this.hitfx.flashAmt('p1'));
    this.hitfx.render(ctx);

    // Aim line + debug hitboxes.
    if (this._debugOn()) { this._drawAim(); this._drawCombatDebug(); }

    ctx.restore();
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
  _rigOn() { return this.rigChk ? this.rigChk.checked : false; }

  /**
   * Body render facing (visual only — does not touch physics). See
   * bodyRenderFacing: aim direction while actively using, else movement/idle-last.
   */
  _facing() {
    this._renderFacing = bodyRenderFacing({
      using: this.combatInput.using,
      aimAngle: this.aimAngle,
      movementFacing: this.player.body.facing,
    });
    return this._renderFacing;
  }

  _healthBar(body, health) {
    const ctx = this.ctx;
    const w = body.w + 6, h = 4, x = body.x - 3, y = body.y - 12;
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

  // ── Hit feedback (observes combat; never changes it) ─────────────────────────
  _detectFx() {
    const d = this.combat.dummy, p = this.combat.attacker;
    const dh = d.health.hp, ph = p.health.hp;
    const prev = this._fxPrev;
    if (dh < prev.dHp) this._spawnDamage(d.body, prev.dHp - dh, 'p2');
    if (ph < prev.pHp) this._spawnDamage(p.body, prev.pHp - ph, 'p1');
    if (prev.dAlive && !d.health.alive) this.hitfx.death(d.body.x + d.body.w / 2, d.body.y + d.body.h / 2);
    if (prev.pAlive && !p.health.alive) this.hitfx.death(p.body.x + p.body.w / 2, p.body.y + p.body.h / 2);
    if (!prev.dAlive && d.health.alive) this.hitfx.respawn(d.spawn.x + d.body.w / 2, d.spawn.y + d.body.h / 2);
    if (!prev.pAlive && p.health.alive) this.hitfx.respawn(p.body.x + p.body.w / 2, p.body.y + p.body.h / 2);
    prev.dHp = dh; prev.pHp = ph; prev.dAlive = d.health.alive; prev.pAlive = p.health.alive;
  }

  _spawnDamage(body, amount, id) {
    this.hitfx.damage(body.x + body.w / 2, body.y + body.h * 0.35, Math.round(amount), id);
  }

  /** Soft red/white glow over a character while its hit-flash is active. */
  _drawHitFlash(body, amt) {
    if (amt <= 0) return;
    const ctx = this.ctx;
    const cx = body.x + body.w / 2, cy = body.y + body.h / 2 - 6, R = 24;
    const col = amt > 0.5 ? '255,255,255' : '255,90,90'; // white -> red as it fades
    const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, R);
    grd.addColorStop(0, `rgba(${col},${0.6 * amt})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    ctx.save(); ctx.fillStyle = grd; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();
  }

  _respawnMarker(d) {
    const ctx = this.ctx;
    const x = d.spawn.x + d.body.w / 2, y = d.spawn.y + d.body.h / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(195,178,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#c3b2ff'; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'center';
    ctx.fillText('respawning…', x, y - 24); ctx.textAlign = 'left';
    ctx.restore();
  }

  /** Held/hotbar sprite for a weapon, tinted by its real h4 index (cached). */
  _weaponSprite(w) {
    const base = this.assets.getSprite(w.spriteKey);
    const idx = w.visual && w.visual.tintIndex;
    if (!base || idx == null) return base;
    const ck = w.spriteKey + '|' + idx;
    return this._tintCache[ck] || (this._tintCache[ck] = tintSprite(base, idx));
  }

  // ── Shot visuals (real client style — docs/WEAPON_FUNCTION_AUDIT.md §3) ─────
  // Track ray-gun projectiles: remember each one's muzzle origin, and when it
  // dies (hit/wall/expire) spawn the client-style visuals: a tinted TRACER
  // stretched muzzle->impact (yScale 3->1, fade 500ms) + the type-28 LASER
  // (BEAM_PNG stretched, alpha .7->0 over 200ms).
  _trackShots() {
    const now = this.simTime;
    for (const w of this.combat.hotbar.slots) {
      if (w.combat.kind !== 'projectile') continue;
      const r = this.combat.resolvers[w.id];
      if (!r) continue;
      const alive = new Set(r.projectiles);
      for (const p of r.projectiles) {
        const rec = this._shotLive.get(p);
        if (!rec) this._shotLive.set(p, { ox: p.x, oy: p.y, lx: p.x, ly: p.y, tint: (w.visual && w.visual.shotColor) ?? 4 });
        else { rec.lx = p.x; rec.ly = p.y; }
      }
      for (const [p, rec] of this._shotLive) {
        if (!alive.has(p)) {
          this.shotfx.add(rec.ox, rec.oy, rec.lx, rec.ly, rec.tint, now);
          this._shotLive.delete(p);
        }
      }
    }
    this.shotfx.update(now); // cull finished fx (tracer 500ms is the longest)
  }

  _drawShotFx(now) {
    const ctx = this.ctx;
    const beam = this.assets.getSprite('BEAM_PNG');
    for (const f of this.shotfx.fx) {
      const age = now - f.t0;
      const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
      const dist = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
      if (dist < 2) continue;
      // tracer: stretched line, thickness 3 -> 1, tinted, fading over 500ms
      ctx.save();
      ctx.translate((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2); ctx.rotate(ang);
      ctx.globalAlpha = tracerAlpha(age);
      ctx.fillStyle = h4css(f.tint);
      const th = tracerThickness(age);
      ctx.fillRect(-dist / 2, -th / 2, dist, th);
      // type-28 laser: BEAM_PNG stretched, alpha .7 -> 0 over 200ms
      const la = laserAlpha(age);
      if (beam && la > 0) {
        ctx.globalAlpha = la;
        ctx.drawImage(beam.image, beam.sx, beam.sy, beam.sw, beam.sh, -dist / 2, -7, dist, 14);
      }
      ctx.restore();
    }
  }

  _drawProjectile(p, w) {
    const ctx = this.ctx;
    const tint = (w && w.visual && w.visual.shotColor) ?? 4;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    // in-flight bolt drawn in the weapon's real shot colour, with a short trail
    ctx.fillStyle = h4css(tint);
    ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.45; ctx.fillRect(-p.w * 1.6, -1, p.w * 1.6, 2);
    ctx.restore();
  }

  _drawAim() {
    const ctx = this.ctx; const pb = this.player.body;
    const px = pb.x + pb.w / 2, py = pb.y + pb.h / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(127,209,255,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(this.aimPoint.x, this.aimPoint.y); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = '#7fd1ff';
    ctx.beginPath(); ctx.arc(this.aimPoint.x, this.aimPoint.y, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  _drawCombatDebug() {
    const ctx = this.ctx;
    const now = this.simTime;
    const box = (b, color) => { if (!b) return; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h); };
    // Hurtboxes (green).
    box(bodyHurtbox(this.player.body, FIGHTER.hurtboxInset), '#5bffa0');
    if (this.combat.dummy.health.alive) box(bodyHurtbox(this.combat.dummy.body, FIGHTER.hurtboxInset), '#5bffa0');
    // Hitboxes (yellow): ray-gun projectile AABBs + the live Fake Sword wedge.
    for (const w of this.combat.hotbar.slots) {
      const r = this.combat.resolvers[w.id];
      if (!r) continue;
      if (w.combat.kind === 'projectile') for (const p of r.projectiles) box(p.aabb(), '#ffe27f');
      if (w.combat.kind === 'melee') {
        // Real client model: a STRIKE POINT (not a hitbox) at tile/1.5 in front.
        const sp = r.debugStrike(now, this.player.body);
        if (sp) {
          ctx.strokeStyle = '#ffe27f'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sp.x - 7, sp.y); ctx.lineTo(sp.x + 7, sp.y);
          ctx.moveTo(sp.x, sp.y - 7); ctx.lineTo(sp.x, sp.y + 7); ctx.stroke();
        }
      }
    }
  }

  _renderHotbar() {
    const ctx = this.ctx;
    const slots = this.combat.hotbar.slots;
    const size = 52, gap = 10;
    const totalW = slots.length * size + (slots.length - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2;
    const y = VIEW_H - size - 12;
    slots.forEach((w, i) => {
      const x = x0 + i * (size + gap);
      const selected = i === this.combat.hotbar.selected;
      if (!this.ui.draw(ctx, 'POCKET_PNG', x, y, size, size)) { ctx.fillStyle = 'rgba(8,12,20,0.72)'; ctx.fillRect(x, y, size, size); }
      const spr = this._weaponSprite(w); // real h4 tint (Blue Ray Gun = blue)
      if (spr) {
        const pad = 9, mw = size - pad * 2, mh = size - pad * 2;
        const sc = Math.min(mw / spr.sw, mh / spr.sh);
        const dw = spr.sw * sc, dh = spr.sh * sc;
        ctx.drawImage(spr.image, spr.sx, spr.sy, spr.sw, spr.sh, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      }
      ctx.strokeStyle = selected ? '#ffe27f' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = selected ? 3 : 1; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = selected ? '#ffe27f' : 'rgba(255,255,255,0.5)';
      ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 4, y + 13);
    });
    const sel = this.combat.selectedWeapon;
    if (sel) {
      const note = this.combat.resolvers[sel.id] ? '' : '  (not wired yet)';
      ctx.fillStyle = '#ffe27f'; ctx.font = '14px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText(sel.name + note, VIEW_W / 2, y - 8); ctx.textAlign = 'left';
    }
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
    const pb = this.player.body;
    const sel = this.combat.selectedWeapon;
    const a = this.combat.attacker.health, d = this.combat.dummy.health;
    const deg = (this.aimAngle * 180 / Math.PI).toFixed(0);
    const f = (n) => (n >= 0 ? ' ' : '') + n.toFixed(0);
    this.debugEl.textContent = [
      `weapon  ${sel ? `${sel.name} (id ${sel.id})` : '—'}${this.combat.resolvers[sel?.id] ? '' : ' [deferred]'}`,
      `aim     ${deg}°  (enc ${encodeAim(this.aimAngle)})`,
      `P1 hp   ${a.hp}/${a.max}`,
      `P2 hp   ${d.hp}/${d.max} ${d.alive ? '' : '(respawning)'}`,
      `score   P1 ${this.combat.match.scores.p1} / FT${this.combat.match.ftTarget}`,
      ``,
      `mouse(w) ${f(this.aimPoint.x)}, ${f(this.aimPoint.y)}`,
      `player   ${f(pb.x)}, ${f(pb.y)}  move ${pb.facing > 0 ? 'R' : 'L'} / view ${this._renderFacing > 0 ? 'R' : 'L'}`,
      `camera   ${f(this.camera.x)}, ${f(this.camera.y)}  zoom ${this.camera.zoom.toFixed(2)}x`,
    ].join('\n');
  }
}
