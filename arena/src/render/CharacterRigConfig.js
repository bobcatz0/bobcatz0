/**
 * CharacterRigConfig — the held-weapon rigs, the body-colour tints, and the
 * body-facing rule for the Diggerz character.
 *
 * The CHARACTER itself is now drawn from the real Spine skeleton extracted from
 * the client (see render/guySkeleton.js + render/CharacterSprite.js) — no more
 * hand-invented body-part offsets. What lives here:
 *   - WEAPON_RIG: how each held weapon sits in the front hand (grip/rotation/
 *     scale), since the held weapon is drawn on top of the skeleton.
 *   - BODY_TINTS: the colours multiplied onto the WHITE base parts so the body
 *     reads navy + blue/purple like the in-game guy (the game colours bodies the
 *     same way — by tinting white parts).
 *   - bodyRenderFacing: aim-vs-movement facing rule (visual only).
 */

const D2R = Math.PI / 180;

// ── Body colours (multiply tints on the WHITE base parts) ────────────────────
const NAVY = '#2b2f57';   // torso + arms
const BLUE = '#4d47be';   // front leg + pants
const BLUE_BACK = '#3a3597'; // back leg (a touch darker for depth)
const PURPLE = '#7b6ce0'; // shoes

// Map a skeleton part's atlas key -> { white: tintable base key, tint: colour }.
// Parts not listed draw with their natural sprite colour.
export const BODY_TINTS = {
  TORSO_PNG:    { white: 'WHITE_TORSO_PNG',   tint: NAVY },
  ARM_PNG:      { white: 'WHITE_ARM_PNG',     tint: NAVY },
  ARM_BACK_PNG: { white: 'WHITE_ARM_PNG',     tint: NAVY },
  LEG_PNG:      { white: 'LEG_WHITE_PNG',     tint: BLUE },
  LEG_BACK_PNG: { white: 'LEG_BACK_WHITE_PNG', tint: BLUE_BACK },
  PANTS_PNG:    { white: 'PANTS_WHITE_PNG',   tint: BLUE },
  FOOT_PNG:     { white: 'FOOT_WHITE_PNG',    tint: PURPLE },
};

// ── Per-weapon held config ───────────────────────────────────────────────────
// Each weapon's sprite has a different native orientation in tiles.png, so each
// needs its own grip anchor + rotation offset (and scale).
//   grip  : fraction (x from left, y from top) of the sprite the hand holds —
//           this point is pinned to the hand.
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
