/**
 * CharacterRigConfig — STANDALONE rig calibration for the assembled Diggerz
 * character (visual only).
 *
 * The real skeleton/bone offsets aren't in the repo (they lived in the original
 * animation JSON), so these are hand-tuned APPROXIMATE offsets that place the
 * real tiles.png body-part sprites (head/eyes/torso/pants/legs/feet/arms/hands)
 * and the held weapon so the character reads correctly and weapons sit in the
 * hand. The part atlas keys themselves are the confirmed ones in
 * diggerz/CharacterRig.js (PART_SPRITES). No invented art — only placement.
 *
 * Coordinate convention: destination pixels for a 24x36 body, drawn facing
 * RIGHT, relative to the feet centre (cx = body centre x, feetY = body bottom).
 * Each part: { key, w, h, dx, dy } where dx is the left edge from cx and dy is
 * the top edge from feetY (negative = above the feet). Part w/h keep the real
 * sprite aspect ratios. The renderer mirrors the whole body for facing-left.
 */

const D2R = Math.PI / 180;

// Tints (multiply on the WHITE base sprites) so the body matches the small
// in-game reference: dark-navy torso, blue/purple legs+pants, purple shoes.
const BLUE = '#4d47be';      // legs + pants (blue-purple)
const BLUE_BACK = '#403a99'; // back leg (a touch darker for depth)
const PURPLE = '#7b6ce0';    // shoes

// ── Body part layout (facing-right) — COMPACT, big-headed in-game character ───
// Matches the reference: a large (not loading-screen-huge) head sitting directly
// above a small dark torso, short blue/purple legs and small purple shoes close
// to the body. Front limbs on +x; the whole body mirrors for facing-left.
export const RIG = {
  backFoot:  { key: 'footWhite',    w: 12, h: 6,  dx: -11, dy: -6,  tint: PURPLE },
  frontFoot: { key: 'footWhite',    w: 12, h: 6,  dx: -1,  dy: -6,  tint: PURPLE },
  backLeg:   { key: 'legBackWhite', w: 10, h: 7,  dx: -9,  dy: -12, tint: BLUE_BACK },
  frontLeg:  { key: 'legWhite',     w: 10, h: 8,  dx: -2,  dy: -13, tint: BLUE },
  pants:     { key: 'pantsWhite',   w: 18, h: 5,  dx: -9,  dy: -16, tint: BLUE },
  torso:     { key: 'torso',        w: 18, h: 15, dx: -9,  dy: -27 },               // TORSO_PNG = dark navy
  head:      { key: 'head',         w: 21, h: 19, dx: -10, dy: -44 },
  // Eyes HIGH on the head and pushed toward the FRONT face (+x), like the
  // reference — on the face (head visible in front of + behind them), not low,
  // not centred, not floating. Mirror with the body when facing left.
  eyes:      { key: 'eyes',         w: 14, h: 9,  dx: -4,  dy: -42 },
};

// ── Front (aiming) arm + hand ────────────────────────────────────────────────
// The front arm/weapon are drawn OUTSIDE the body mirror so they rotate to the
// real mouse aim. The shoulder pivot is relative to (cx, feetY), facing-right.
export const ARM = {
  shoulder: { dx: 3, dy: -23 },   // where the aiming arm attaches (compact torso)
  length: 8,                       // hand distance from the shoulder along aim
  armSprite:  { w: 11, h: 9 },     // front upper-arm sprite draw size
  handSprite: { w: 8,  h: 6 },     // front hand sprite draw size
  backArm:    { w: 10, h: 7, dx: -8, dy: -24 }, // static arm behind the torso
};

// Head anchor (head centre) for the rig debug overlay.
export const HEAD_ANCHOR = { dx: 0, dy: -35 };   // relative to (cx, feetY)
export const BODY_CENTER = { dx: 0, dy: -20 };   // torso centre

// ── Per-weapon held config ───────────────────────────────────────────────────
// Each weapon's sprite has a different native orientation in tiles.png, so each
// needs its own grip anchor + rotation offset (and scale).
//   grip  : fraction (x from left, y from top) of the sprite the hand holds —
//           this point is pinned to the hand anchor.
//   rot   : rotation offset (radians) that aligns the sprite's business end
//           (blade tip / barrel muzzle) to +x, so after the renderer rotates by
//           the aim the weapon points at the mouse.
//   scale : on-screen scale applied to the source sprite (~24px business size).
const W = (grip, rotDeg, scale) => ({ grip, rot: rotDeg * D2R, scale });

export const WEAPON_RIG = {
  // Fake Sword (70x38): red grip lower-right, blade points up-left.
  SWORD_PNG:   W({ x: 0.80, y: 0.55 }, 168, 0.34),
  // Blue Ray Gun / Railgun (29x50): vertical, ball-grip at the bottom, barrel up.
  RAILGUN_PNG: W({ x: 0.50, y: 0.84 }, 96, 0.44),
  // Shotgun (28x63): vertical, brown stock at the top, barrel down toward muzzle.
  SHOTGUN_PNG: W({ x: 0.52, y: 0.22 }, -106, 0.42),
};

// Fallback for any other held sprite: grip near the back, point along +x.
export const DEFAULT_WEAPON_RIG = W({ x: 0.25, y: 0.5 }, 0, 0.34);

export function weaponRig(spriteKey) {
  return WEAPON_RIG[spriteKey] || DEFAULT_WEAPON_RIG;
}

/**
 * Body render facing rule (visual only — never touches physics):
 *   - actively using/aiming the weapon -> face the aim's horizontal direction
 *   - otherwise -> the movement facing (which keeps the last facing while idle)
 * Returns +1 (right) or -1 (left).
 */
export function bodyRenderFacing({ using, aimAngle, movementFacing }) {
  if (using && aimAngle != null) return Math.cos(aimAngle) >= 0 ? 1 : -1;
  return movementFacing >= 0 ? 1 : -1;
}
