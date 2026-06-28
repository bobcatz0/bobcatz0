/**
 * CharacterSprite — draws the Diggerz character.
 *
 * When tiles.png is loaded it assembles a fuller character from the REAL
 * Diggerz body-part sprites (head, eyes, torso, pants, legs, feet, arms, hands)
 * using approximate standalone offsets from CharacterRig (the original skeleton
 * offsets aren't in the repo). It also draws the equipped weapon in the front
 * hand, rotated toward the mouse aim and flipped with facing. Facing right ->
 * faces right; facing left -> faces left (mirror). No invented character art.
 *
 * Falls back to a procedural character if the atlas isn't loaded.
 */

import { PART_SPRITES, RIG_LAYOUT, SHOULDER, ARM_LENGTH, facingScale } from '../diggerz/CharacterRig.js';

const TEAM = {
  body: '#ef8c3a', bodyDark: '#c96f25', outline: '#23160b',
  head: '#ffb56b', limb: '#b5611f', eyeWhite: '#fff', eyePupil: '#1a1208',
};

export class CharacterSprite {
  constructor(assets) {
    this.assets = assets;
  }

  /**
   * @param state { x, y, width, height, vx, vy, grounded, facing, anim }
   * @param nowSec animation clock
   * @param opts  { palette?, aim?: number (radians), weapon?: {image,sx,sy,sw,sh} }
   */
  draw(ctx, state, nowSec, opts = {}) {
    if (this.assets && this.assets.ready) this._drawReal(ctx, state, nowSec, opts);
    else this._drawProcedural(ctx, state, nowSec, { ...TEAM, ...(opts.palette || {}) });
  }

  // ── Real assembled rig ──────────────────────────────────────────────────────
  _drawReal(ctx, s, now, opts) {
    const cx = s.x + s.width / 2;
    const feetY = s.y + s.height;
    const facing = facingScale(s.facing); // +1 right, -1 left

    // Simple locomotion animation.
    let bob = 0, legSwing = 0;
    if (s.anim === 'walk' || s.anim === 'run') {
      const t = now * 12; bob = Math.abs(Math.sin(t)) * 1.5; legSwing = Math.sin(t) * 3;
    } else if (s.anim === 'idle') {
      bob = Math.sin(now * 3) * 0.6;
    }

    const get = (key) => this.assets.getSprite(PART_SPRITES[key]);
    const drawPart = (p, dxExtra = 0) => {
      const sp = get(p.key);
      if (!sp) return;
      ctx.drawImage(sp.image, sp.sx, sp.sy, sp.sw, sp.sh, cx + p.dx + dxExtra, feetY + p.dy - bob, p.w, p.h);
    };

    // ── Body, mirrored for facing-left ──
    ctx.save();
    if (facing < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    drawPart(RIG_LAYOUT.backFoot, legSwing);
    drawPart(RIG_LAYOUT.backLeg, legSwing);
    this._backArm(ctx, cx, feetY - bob); // behind torso
    drawPart(RIG_LAYOUT.torso);
    drawPart(RIG_LAYOUT.pants);
    drawPart(RIG_LAYOUT.frontFoot, -legSwing);
    drawPart(RIG_LAYOUT.frontLeg, -legSwing);
    drawPart(RIG_LAYOUT.head);
    drawPart(RIG_LAYOUT.eyes); // front-shifted -> reads as "looking forward"
    ctx.restore();

    // ── Front arm + held weapon (uses the REAL aim, on the facing side) ──
    this._frontArmWeapon(ctx, cx, feetY - bob, facing, opts.aim, opts.weapon);
  }

  _backArm(ctx, cx, feetY) {
    const sp = this.assets.getSprite(PART_SPRITES.armBack);
    if (!sp) return;
    ctx.drawImage(sp.image, sp.sx, sp.sy, sp.sw, sp.sh, cx - 11, feetY - 25, 10, 8);
  }

  _frontArmWeapon(ctx, cx, feetY, facing, aim, weapon) {
    // Shoulder pivot on the front (facing) side.
    const sx = cx + facing * SHOULDER.dx;
    const sy = feetY + SHOULDER.dy;
    // Arm points toward the aim if we have one, else rests slightly down-forward.
    const armAngle = (aim == null) ? (facing >= 0 ? 0.5 : Math.PI - 0.5) : aim;
    const hx = sx + Math.cos(armAngle) * ARM_LENGTH;
    const hy = sy + Math.sin(armAngle) * ARM_LENGTH;

    // Front arm sprite, rotated along the aim.
    const arm = this.assets.getSprite(PART_SPRITES.arm);
    if (arm) {
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(armAngle);
      if (Math.cos(armAngle) < 0) ctx.scale(1, -1); // keep upright when pointing left
      ctx.drawImage(arm.image, arm.sx, arm.sy, arm.sw, arm.sh, -2, -4, 12, 9);
      ctx.restore();
    }

    // Held weapon, rotated to aim, flipped vertically when pointing left.
    if (weapon) {
      const maxDim = Math.max(weapon.sw, weapon.sh);
      const sc = 26 / maxDim;
      const w = weapon.sw * sc, h = weapon.sh * sc;
      ctx.save();
      ctx.translate(hx, hy); ctx.rotate(armAngle);
      if (Math.cos(armAngle) < 0) ctx.scale(1, -1);
      // grip near the back-left of the sprite, centred vertically
      ctx.drawImage(weapon.image, weapon.sx, weapon.sy, weapon.sw, weapon.sh, -w * 0.22, -h * 0.5, w, h);
      ctx.restore();
    }

    // Front hand at the arm end.
    const hand = this.assets.getSprite(PART_SPRITES.hand);
    if (hand) ctx.drawImage(hand.image, hand.sx, hand.sy, hand.sw, hand.sh, hx - 5, hy - 4, 10, 8);
  }

  // ── Procedural fallback (facing-correct) ────────────────────────────────────
  _drawProcedural(ctx, s, nowSec, pal) {
    const dir = facingScale(s.facing);
    const cx = s.x + s.width / 2;
    const feet = s.y + s.height;
    let bob = 0, legA = 0, legB = 0, sx = 1, sy = 1;
    if (s.anim === 'run' || s.anim === 'walk') { const t = nowSec * 12; legA = Math.sin(t) * 5; legB = -legA; bob = Math.abs(Math.sin(t)) * 2; }
    else if (s.anim === 'idle') bob = Math.sin(nowSec * 3) * 1.2;
    else if (s.anim === 'jump' || s.anim === 'jump_in') { sx = 0.9; sy = 1.12; }
    else if (s.anim === 'fall') { sx = 1.08; sy = 0.94; }

    const bodyW = s.width * sx, bodyH = s.height * 0.52 * sy;
    const bodyX = cx - bodyW / 2, bodyY = s.y + bob + s.height * 0.18;
    const headR = s.width * 0.42 * sx, headCy = bodyY - headR * 0.55;

    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = pal.outline; ctx.lineJoin = 'round';
    const legW = s.width * 0.28, legTop = bodyY + bodyH - 2;
    for (const [lx, off] of [[cx - legW - 1, legA], [cx + 1, legB]]) {
      fillStroke(ctx, lx, legTop, legW, feet - legTop + 6, pal.limb, 3);
      fillStroke(ctx, lx - 1, legTop + (feet - legTop) + off, legW + 3, 4, pal.bodyDark, 2);
    }
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 7); ctx.fillStyle = pal.body; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, headCy, headR, 0, Math.PI * 2); ctx.fillStyle = pal.head; ctx.fill(); ctx.stroke();
    const eyeX = cx + dir * headR * 0.35, eyeY = headCy - headR * 0.05;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, headR * 0.3, 0, Math.PI * 2); ctx.fillStyle = pal.eyeWhite; ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + dir * headR * 0.12, eyeY, headR * 0.15, 0, Math.PI * 2); ctx.fillStyle = pal.eyePupil; ctx.fill();
    ctx.restore();
  }
}

function fillStroke(ctx, x, y, w, h, fill, r) { roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
