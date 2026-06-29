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

// ── Body part layout (facing-right) ──────────────────────────────────────────
// Stacked feet -> legs -> pants -> torso -> head, with the front limbs on +x.
export const RIG = {
  backFoot:  { key: 'foot',    w: 13, h: 7,  dx: -12, dy: -7 },
  frontFoot: { key: 'foot',    w: 13, h: 7,  dx: -1,  dy: -7 },
  backLeg:   { key: 'legBack', w: 11, h: 7,  dx: -9,  dy: -15 },
  frontLeg:  { key: 'leg',     w: 11, h: 8,  dx: -2,  dy: -16 },
  pants:     { key: 'pants',   w: 20, h: 5,  dx: -10, dy: -20 },
  torso:     { key: 'torso',   w: 20, h: 16, dx: -10, dy: -33 },
  head:      { key: 'head',    w: 22, h: 20, dx: -11, dy: -49 },
  // Eyes like the LOADING-SCREEN character: big eyes embedded in the UPPER-FRONT
  // face — head visible above (forehead) and around them so they sit ON the face,
  // not floating above the head, pushed toward the FRONT (+x). They overlap the
  // head fully (a small front-edge bulge). Mirror with the body when facing left.
  eyes:      { key: 'eyes',    w: 18, h: 11, dx: -6,  dy: -47 },
};

// ── Front (aiming) arm + hand ────────────────────────────────────────────────
// The front arm/weapon are drawn OUTSIDE the body mirror so they rotate to the
// real mouse aim. The shoulder pivot is relative to (cx, feetY), facing-right.
export const ARM = {
  shoulder: { dx: 3, dy: -27 },   // where the aiming arm attaches
  length: 9,                       // hand distance from the shoulder along aim
  armSprite:  { w: 12, h: 10 },    // front upper-arm sprite draw size
  handSprite: { w: 9,  h: 7 },     // front hand sprite draw size
  backArm:    { w: 11, h: 8, dx: -9, dy: -28 }, // static arm behind the torso
};

// Head anchor (head centre) for the rig debug overlay.
export const HEAD_ANCHOR = { dx: 0, dy: -39 };   // relative to (cx, feetY)
export const BODY_CENTER = { dx: 0, dy: -25 };   // torso centre

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
