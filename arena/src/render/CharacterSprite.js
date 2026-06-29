/**
 * CharacterSprite — draws the assembled Diggerz character.
 *
 * When tiles.png is loaded it assembles a fuller character from the REAL
 * Diggerz body-part sprites (head, eyes, torso, pants, legs, feet, arms, hands)
 * using the standalone calibrated offsets in CharacterRigConfig, and draws the
 * equipped weapon in the front hand with a PER-WEAPON grip/rotation/scale so the
 * sword is held like a sword and the guns like guns. Facing right -> faces
 * right; facing left -> the whole body mirrors. The front arm + weapon rotate to
 * the real mouse aim (and flip to stay upright when aiming behind). No invented
 * art — only placement. Falls back to a procedural character if the atlas isn't
 * loaded.
 *
 * draw(ctx, state, nowSec, opts):
 *   opts.palette    — procedural fallback colours
 *   opts.aim        — aim angle (radians); the weapon/arm point here
 *   opts.weapon     — the weapon sprite {image,sx,sy,sw,sh} (or null)
 *   opts.weaponKey  — the weapon's atlas key (selects its per-weapon rig)
 *   opts.debugRig   — draw rig anchors (head/hand/weapon pivot/body centre/facing)
 */

import { PART_SPRITES, facingScale } from '../diggerz/CharacterRig.js';
import { RIG, ARM, HEAD_ANCHOR, BODY_CENTER, weaponRig } from './CharacterRigConfig.js';

const TEAM = {
  body: '#ef8c3a', bodyDark: '#c96f25', outline: '#23160b',
  head: '#ffb56b', limb: '#b5611f', eyeWhite: '#fff', eyePupil: '#1a1208',
};

export class CharacterSprite {
  constructor(assets) {
    this.assets = assets;
  }

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

    // ── Body, mirrored for facing-left (head/eyes/torso/legs/feet) ──
    ctx.save();
    if (facing < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    drawPart(RIG.backFoot, legSwing);
    drawPart(RIG.backLeg, legSwing);
    this._backArm(ctx, cx, feetY - bob);
    drawPart(RIG.torso);
    drawPart(RIG.pants);
    drawPart(RIG.frontFoot, -legSwing);
    drawPart(RIG.frontLeg, -legSwing);
    drawPart(RIG.head);
    drawPart(RIG.eyes);
    ctx.restore();

    // ── Front arm + held weapon (real aim, on the facing side) ──
    const anchors = this._frontArmWeapon(ctx, cx, feetY - bob, facing, opts.aim, opts.weapon, opts.weaponKey);

    if (opts.debugRig) this._drawRigDebug(ctx, cx, feetY - bob, facing, opts.aim, anchors);
  }

  _backArm(ctx, cx, feetY) {
    const sp = this.assets.getSprite(PART_SPRITES.armBack);
    if (!sp) return;
    const a = ARM.backArm;
    ctx.drawImage(sp.image, sp.sx, sp.sy, sp.sw, sp.sh, cx + a.dx, feetY + a.dy, a.w, a.h);
  }

  _frontArmWeapon(ctx, cx, feetY, facing, aim, weapon, weaponKey) {
    // Shoulder pivot on the front (facing) side.
    const sx = cx + facing * ARM.shoulder.dx;
    const sy = feetY + ARM.shoulder.dy;
    // Arm points toward the aim if we have one, else rests slightly down-forward.
    const armAngle = (aim == null) ? (facing >= 0 ? 0.5 : Math.PI - 0.5) : aim;
    const hx = sx + Math.cos(armAngle) * ARM.length;
    const hy = sy + Math.sin(armAngle) * ARM.length;
    const flip = Math.cos(armAngle) < 0; // aiming behind -> flip vertically to stay upright

    // Front upper-arm sprite, rotated along the aim.
    const arm = this.assets.getSprite(PART_SPRITES.arm);
    if (arm) {
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(armAngle);
      if (flip) ctx.scale(1, -1);
      ctx.drawImage(arm.image, arm.sx, arm.sy, arm.sw, arm.sh, -2, -ARM.armSprite.h / 2, ARM.armSprite.w, ARM.armSprite.h);
      ctx.restore();
    }

    // Held weapon: per-weapon grip pinned to the hand. Rotate to the aim, flip
    // vertically across the aim axis when pointing behind (so it stays upright),
    // THEN apply the per-weapon rotation offset that aligns the business end to
    // the aim, then scale and draw with the grip at the origin.
    if (weapon) {
      const rig = weaponRig(weaponKey);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(armAngle);
      if (flip) ctx.scale(1, -1);
      ctx.rotate(rig.rot);
      ctx.scale(rig.scale, rig.scale);
      ctx.drawImage(weapon.image, weapon.sx, weapon.sy, weapon.sw, weapon.sh,
        -rig.grip.x * weapon.sw, -rig.grip.y * weapon.sh, weapon.sw, weapon.sh);
      ctx.restore();
    }

    // Front hand at the arm end.
    const hand = this.assets.getSprite(PART_SPRITES.hand);
    if (hand) {
      const hw = ARM.handSprite.w, hh = ARM.handSprite.h;
      ctx.drawImage(hand.image, hand.sx, hand.sy, hand.sw, hand.sh, hx - hw / 2, hy - hh / 2, hw, hh);
    }
    return { sx, sy, hx, hy };
  }

  // ── Rig debug overlay ───────────────────────────────────────────────────────
  _drawRigDebug(ctx, cx, feetY, facing, aim, anchors) {
    const head = { x: cx + facing * HEAD_ANCHOR.dx, y: feetY + HEAD_ANCHOR.dy };
    const body = { x: cx + facing * BODY_CENTER.dx, y: feetY + BODY_CENTER.dy };
    const mark = (p, color, label) => {
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
      ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4); ctx.stroke();
      ctx.font = '8px ui-monospace, monospace'; ctx.fillText(label, p.x + 5, p.y - 3);
      ctx.restore();
    };
    // body centre + facing arrow
    mark(body, '#7fd1ff', 'body');
    ctx.save();
    ctx.strokeStyle = '#7fd1ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(body.x, body.y); ctx.lineTo(body.x + facing * 16, body.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(body.x + facing * 16, body.y);
    ctx.lineTo(body.x + facing * 11, body.y - 3); ctx.lineTo(body.x + facing * 11, body.y + 3); ctx.closePath();
    ctx.fillStyle = '#7fd1ff'; ctx.fill();
    ctx.restore();
    mark(head, '#9bff9b', 'head');
    if (anchors) {
      mark({ x: anchors.sx, y: anchors.sy }, '#ffd27f', 'shoulder');
      mark({ x: anchors.hx, y: anchors.hy }, '#ff7fd1', 'hand');
      // weapon pivot = hand anchor; draw the aim ray from it
      if (aim != null) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,127,209,.7)'; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(anchors.hx, anchors.hy);
        ctx.lineTo(anchors.hx + Math.cos(aim) * 22, anchors.hy + Math.sin(aim) * 22); ctx.stroke();
        ctx.restore();
      }
    }
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
