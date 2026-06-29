/**
 * CharacterSprite — draws the REAL Diggerz character from the extracted Spine
 * skeleton (render/guySkeleton.js), not a hand-invented rig.
 *
 * It runs a tiny static forward-kinematics pass over the skeleton's idle pose,
 * draws each part with the real tiles.png sprites (tinting the WHITE base parts
 * navy/blue/purple the way the game colours bodies), mirrors the whole skeleton
 * for facing-left, and draws the equipped weapon at the front hand (rotated to
 * the mouse aim). Falls back to a simple procedural character if the atlas isn't
 * loaded.
 *
 * draw(ctx, state, nowSec, opts):
 *   opts.palette    — procedural fallback colours
 *   opts.aim        — aim angle (radians); the held weapon points here
 *   opts.weapon     — the weapon sprite {image,sx,sy,sw,sh} (or null)
 *   opts.weaponKey  — the weapon's atlas key (selects its per-weapon rig)
 *   opts.debugRig   — draw the hand anchor + facing arrow
 */

import { facingScale } from '../diggerz/CharacterRig.js';
import { GUY_SKELETON } from './guySkeleton.js';
import { weaponRig, BODY_TINTS } from './CharacterRigConfig.js';

const D2R = Math.PI / 180;
const TARGET_H = 52; // rendered character height in px (head-top to feet)

const TEAM = {
  body: '#ef8c3a', bodyDark: '#c96f25', outline: '#23160b',
  head: '#ffb56b', limb: '#b5611f', eyeWhite: '#fff', eyePupil: '#1a1208',
};

export class CharacterSprite {
  constructor(assets) {
    this.assets = assets;
    this._tintCache = {};
    this._rig = null; // built lazily once the atlas is ready
  }

  draw(ctx, state, nowSec, opts = {}) {
    if (this.assets && this.assets.ready) this._drawReal(ctx, state, opts);
    else this._drawProcedural(ctx, state, nowSec, { ...TEAM, ...(opts.palette || {}) });
  }

  // ── Real Spine-skeleton character ───────────────────────────────────────────
  _drawReal(ctx, s, opts) {
    const rig = this._rig || (this._rig = this._buildRig());
    if (!rig) { this._drawProcedural(ctx, s, 0, TEAM); return; }

    const cx = s.x + s.width / 2;
    const feetY = s.y + s.height;
    const facing = facingScale(s.facing); // +1 right, -1 left
    const S = TARGET_H / rig.spanY;        // skeleton units -> screen px
    const midX = (rig.minX + rig.maxX) / 2;

    ctx.save();
    ctx.translate(cx, feetY);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.scale(S, -S);                 // Spine is y-up; flip to screen y-down
    ctx.translate(-midX, -rig.minY);  // centre x, feet on the ground line
    for (const d of rig.draws) {
      ctx.save();
      ctx.translate(d.wx, d.wy); ctx.rotate(d.rotation); ctx.scale(1, -1);
      if (d.tint) {
        const t = this._tinted(d.tint.white, d.tint.tint);
        if (t) ctx.drawImage(t.canvas, 0, 0, t.sw, t.sh, -d.w / 2, -d.h / 2, d.w, d.h);
      } else if (d.sp) {
        ctx.drawImage(d.sp.image, d.sp.sx, d.sp.sy, d.sp.sw, d.sp.sh, -d.w / 2, -d.h / 2, d.w, d.h);
      }
      ctx.restore();
    }
    ctx.restore();

    // Front-hand position in screen space (for the held weapon + debug).
    const handX = cx + facing * ((rig.hand.x - midX) * S);
    const handY = feetY - (rig.hand.y - rig.minY) * S;
    if (opts.weapon) this._drawWeapon(ctx, handX, handY, opts.aim, opts.weapon, opts.weaponKey);
    if (opts.debugRig) this._drawDebug(ctx, cx, feetY, facing, handX, handY, opts.aim);
  }

  /** Build the static idle-pose draw list (forward kinematics) once. */
  _buildRig() {
    const sk = GUY_SKELETON;
    const map = {}, world = {};
    for (const b of sk.bones) map[b.name] = b;
    const fk = (name) => {
      if (world[name]) return world[name];
      const b = map[name];
      const r = b.rotation * D2R;
      const la = Math.cos(r) * b.scaleX, lb = -Math.sin(r) * b.scaleY;
      const lc = Math.sin(r) * b.scaleX, ld = Math.cos(r) * b.scaleY;
      let t;
      if (!b.parent) t = { a: la, b: lb, c: lc, d: ld, wx: b.x, wy: b.y };
      else {
        const p = fk(b.parent);
        t = {
          a: p.a * la + p.b * lc, b: p.a * lb + p.b * ld,
          c: p.c * la + p.d * lc, d: p.c * lb + p.d * ld,
          wx: p.a * b.x + p.b * b.y + p.wx, wy: p.c * b.x + p.d * b.y + p.wy,
        };
      }
      world[name] = t; return t;
    };
    for (const b of sk.bones) fk(b.name);

    const regionXform = (bone, ax, ay, arot) => {
      const w = world[bone]; const ar = arot * D2R;
      const wx = w.a * ax + w.b * ay + w.wx, wy = w.c * ax + w.d * ay + w.wy;
      const ra = w.a * Math.cos(ar) + w.b * Math.sin(ar), rc = w.c * Math.cos(ar) + w.d * Math.sin(ar);
      return { wx, wy, rotation: Math.atan2(rc, ra) };
    };

    const draws = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const slot of sk.slots) {
      const sp = this.assets.getSprite(slot.img);
      const tint = BODY_TINTS[slot.img] || null;
      if (!sp && !tint) continue;
      const x = regionXform(slot.bone, slot.x, slot.y, slot.rotation);
      const w = slot.w, h = slot.h;
      draws.push({ img: slot.img, tint, sp, w, h, ...x });
      // tight-ish bbox from the rotated region corners
      const cosr = Math.cos(x.rotation), sinr = Math.sin(x.rotation);
      for (const [ex, ey] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
        const px = x.wx + ex * cosr - ey * sinr, py = x.wy + ex * sinr + ey * cosr;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    const hand = world[sk.handBone] || { wx: 0, wy: 0 };
    return { draws, minX, maxX, minY, maxY, spanY: maxY - minY, hand: { x: hand.wx, y: hand.wy } };
  }

  _drawWeapon(ctx, hx, hy, aim, weapon, weaponKey) {
    const rig = weaponRig(weaponKey);
    const armAngle = (aim == null) ? 0.4 : aim;
    const flip = Math.cos(armAngle) < 0;
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

  _drawDebug(ctx, cx, feetY, facing, hx, hy, aim) {
    ctx.save();
    ctx.strokeStyle = '#ff7fd1'; ctx.fillStyle = '#ff7fd1'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - 4, hy); ctx.lineTo(hx + 4, hy); ctx.moveTo(hx, hy - 4); ctx.lineTo(hx, hy + 4); ctx.stroke();
    ctx.font = '8px ui-monospace, monospace'; ctx.fillText('hand', hx + 5, hy - 3);
    const bcy = feetY - 22;
    ctx.strokeStyle = '#7fd1ff';
    ctx.beginPath(); ctx.moveTo(cx, bcy); ctx.lineTo(cx + facing * 16, bcy); ctx.stroke();
    if (aim != null) {
      ctx.strokeStyle = 'rgba(255,127,209,.6)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(aim) * 22, hy + Math.sin(aim) * 22); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ── Tint a WHITE base sprite by multiply (cached) ───────────────────────────
  _tinted(atlasKey, tint) {
    const ck = atlasKey + '|' + tint;
    if (this._tintCache[ck]) return this._tintCache[ck];
    const sp = this.assets.getSprite(atlasKey);
    if (!sp) return null;
    const c = document.createElement('canvas');
    c.width = sp.sw; c.height = sp.sh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(sp.image, sp.sx, sp.sy, sp.sw, sp.sh, 0, 0, sp.sw, sp.sh);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = tint; g.fillRect(0, 0, sp.sw, sp.sh);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(sp.image, sp.sx, sp.sy, sp.sw, sp.sh, 0, 0, sp.sw, sp.sh);
    const out = { canvas: c, sw: sp.sw, sh: sp.sh };
    this._tintCache[ck] = out;
    return out;
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
