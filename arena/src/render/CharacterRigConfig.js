/**
 * CharacterRigConfig — held-weapon rigs, weapon layering, and the body-facing
 * rule for the prototype character.
 *
 * The character itself is a single reference-image sprite (see
 * docs/CHARACTER_RENDERING.md and render/CharacterSprite.js) — there is no
 * skeletal rig. What lives here is everything about how the HELD WEAPON sits on
 * that sprite and how the body decides which way to face:
 *   - WEAPON_RIG: per-weapon grip anchor / rotation offset / scale, since each
 *     weapon sprite in tiles.png has a different native orientation.
 *   - weaponBehind(): draw-order rule so the weapon never covers the face.
 *   - bodyRenderFacing(): aim-vs-movement facing rule (visual only).
 */

const D2R = Math.PI / 180;

// ── Per-weapon held config ───────────────────────────────────────────────────
//   grip  : fraction (x from left, y from top) of the sprite the hand holds —
//           this point is pinned to the hand anchor.
//   rot   : rotation offset (radians) that aligns the sprite's business end
//           (blade tip / barrel muzzle) to +x, so after rotating by the aim the
//           weapon points at the mouse.
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

// Held-weapon layering: when the aim points up steeper than this (sin(aim) below
// it), the weapon is drawn BEHIND the character so the blade/barrel can never
// sweep across the face/eyes; horizontal/down it stays in front (held in hand).
export const WEAPON_BEHIND_SIN = -0.3;
export function weaponBehind(aim) {
  return aim != null && Math.sin(aim) < WEAPON_BEHIND_SIN;
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
