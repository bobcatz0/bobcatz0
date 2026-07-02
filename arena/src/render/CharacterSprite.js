/**
 * CharacterSprite — draws the character from the REAL in-game reference image.
 *
 * The character is a static sprite cropped from an actual Diggerz in-game
 * character screenshot (assets/generated/default-diggerz-character-idle.png,
 * background masked out), placed by its metadata anchors. The whole sprite
 * mirrors for facing-left; the equipped weapon is drawn at the hand anchor
 * (rotated to the mouse aim, layered behind the body when aiming up so it never
 * covers the face). Health bars + hurtbox/collision are handled elsewhere.
 *
 * WHY a sprite and not a rig: see docs/CHARACTER_RENDERING.md — the original
 * game has no finished character image (it assembles Spine-skeleton parts at
 * runtime), and reproducing that path never visually matched the real game.
 *
 * draw(ctx, state, nowSec, opts):
 *   opts.aim / opts.weapon / opts.weaponKey  — held weapon overlay
 *   opts.debugRig  — draw the ground/head/hand anchors
 *   opts.palette   — procedural fallback colours (until the sprite has loaded)
 */

import { facingScale } from '../diggerz/CharacterRig.js';
import { weaponRig, weaponBehind, airPoseState } from './CharacterRigConfig.js';
import { SKELETON_H } from '../combat/swordSwing.js';

const SPRITE_URL = 'assets/generated/default-diggerz-character-idle.png';
const META_URL = 'assets/generated/default-diggerz-character-idle.json';
// Airborne: the REAL jump-pose screenshot, copied (not drawn) — shown while
// jumping/falling, mirrored for facing. See its .json for provenance.
const JUMP_SPRITE_URL = 'assets/generated/default-diggerz-character-jump.png';
const JUMP_META_URL = 'assets/generated/default-diggerz-character-jump.json';
const TARGET_H = 56; // rendered character height in px (feet-to-head)

const TEAM = {
  body: '#ef8c3a', bodyDark: '#c96f25', outline: '#23160b',
  head: '#ffb56b', limb: '#b5611f', eyeWhite: '#fff', eyePupil: '#1a1208',
};

export class CharacterSprite {
  constructor(assets) {
    this.assets = assets;
    this.sprite = null;
    this.meta = null;
    this.ready = false;
    this._load();
  }

  async _load() {
    try {
      const meta = await fetch(META_URL).then((r) => r.json());
      const img = new Image();
      img.src = SPRITE_URL;
      await img.decode();
      this.meta = meta;
      this.sprite = img;
      this.ready = true;
    } catch (e) {
      // leave !ready -> procedural fallback keeps the game drawable
      console.warn('[character] reference sprite not loaded:', e && e.message);
    }
    try {
      const jmeta = await fetch(JUMP_META_URL).then((r) => r.json());
      const jimg = new Image();
      jimg.src = JUMP_SPRITE_URL;
      await jimg.decode();
      this.jumpMeta = jmeta;
      this.jumpSprite = jimg;
    } catch (e) {
      // no jump sprite -> idle sprite is used while airborne too
      console.warn('[character] jump sprite not loaded:', e && e.message);
    }
  }

  draw(ctx, state, nowSec, opts = {}) {
    if (this.ready) this._drawSprite(ctx, state, opts);
    else this._drawProcedural(ctx, state, nowSec, { ...TEAM, ...(opts.palette || {}) });
  }

  // ── Reference-image sprite ──────────────────────────────────────────────────
  _drawSprite(ctx, s, opts) {
    // Airborne -> the REAL jump-pose sprite (copied from the reference
    // screenshot); grounded -> the idle sprite. Same anchor convention.
    const air = airPoseState({ grounded: s.grounded, vy: s.vy });
    const useJump = air && this.jumpSprite;
    const m = useJump ? this.jumpMeta : this.meta;
    const sprite = useJump ? this.jumpSprite : this.sprite;
    const cx = s.x + s.width / 2;
    const feetY = s.y + s.height;
    const facing = facingScale(s.facing); // +1 right (source orientation), -1 left
    const S = TARGET_H / m.height;
    const gx = m.groundAnchor.x, gy = m.groundAnchor.y;

    // Held weapon anchor at the hand (mirrors with facing).
    const handX = cx + facing * ((m.handAnchor.x - gx) * S);
    const handY = feetY + (m.handAnchor.y - gy) * S;
    const aim = opts.aim;
    // swordPose = real sword_pose/zswing sample {deg,dx,dy} — replaces aim.
    const pose = opts.swordPose;
    // Aiming up -> draw the weapon BEHIND the character so it never covers the
    // face/eyes. For the sword pose: behind while cocked at rest (blade over the
    // shoulder), in front while the swing sweeps forward.
    const behind = !!opts.weapon && (pose ? this._poseBehind(pose) : weaponBehind(aim));
    const drawWeapon = () => {
      if (pose) this._drawSwordPose(ctx, cx, feetY, facing, pose, opts.weapon, opts.weaponKey);
      else this._drawWeapon(ctx, handX, handY, aim, opts.weapon, opts.weaponKey);
    };
    if (opts.weapon && behind) drawWeapon();

    ctx.save();
    ctx.translate(cx, feetY);
    if (facing < 0) ctx.scale(-1, 1);          // mirror the whole sprite for facing-left
    ctx.scale(S, S);
    ctx.translate(-gx, -gy);                    // pin the ground anchor to (cx, feetY)
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;           // it's a downscaled screenshot, smooth it
    ctx.drawImage(sprite, 0, 0);
    ctx.imageSmoothingEnabled = prev;
    ctx.restore();

    if (opts.weapon && !behind) drawWeapon();
    if (opts.debugRig) this._drawDebug(ctx, cx, feetY, facing, handX, handY, S, m);
  }

  /** Sword rest pose points up-back over the shoulder -> tuck it behind the body. */
  _poseBehind(pose) {
    const d = ((pose.deg % 360) + 360) % 360;
    return d > 90 && d < 270; // blade pointing backwards (up-back / down-back)
  }

  /**
   * Draw the sword at the REAL sword_pose / zswing sample: `pose` = {deg,dx,dy}
   * from swordSwing.js — the sword-CENTRE world transform derived from the
   * skeleton (attachment rotation + the client's wear offset), scaled to the
   * sprite height and mirrored for facing-left. (Weapon-only animation — the
   * reference-sprite body is untouched, per the no-cursed-skeleton rule.)
   */
  _drawSwordPose(ctx, cx, feetY, facing, pose, weapon) {
    const k = TARGET_H / SKELETON_H;             // skeleton units -> screen px
    const px = cx + facing * pose.dx * k;
    const py = feetY - pose.dy * k;
    const w = weapon.sw * k, h = weapon.sh * k;  // real proportional sword size
    ctx.save();
    ctx.translate(px, py);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.rotate(pose.deg * Math.PI / 180);
    ctx.drawImage(weapon.image, weapon.sx, weapon.sy, weapon.sw, weapon.sh, -w / 2, -h / 2, w, h);
    ctx.restore();
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

  _drawDebug(ctx, cx, feetY, facing, hx, hy, S, m) {
    const pt = (ax, ay) => ({ x: cx + facing * ((ax - m.groundAnchor.x) * S), y: feetY + (ay - m.groundAnchor.y) * S });
    const mark = (px, py, color, label) => {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.moveTo(px, py - 4); ctx.lineTo(px, py + 4); ctx.stroke();
      ctx.font = '8px ui-monospace, monospace'; ctx.fillText(label, px + 5, py - 3); ctx.restore();
    };
    mark(cx, feetY, '#7fffa8', 'ground');
    const h = pt(m.headAnchor.x, m.headAnchor.y); mark(h.x, h.y, '#9bff9b', 'head');
    mark(hx, hy, '#ff7fd1', 'hand');
  }

  // ── Procedural fallback (until the sprite loads) ────────────────────────────
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
