/**
 * CharacterRig — the REAL Diggerz character model: body-part names, animation
 * states, facing, and aim encoding. From the client (skeleton `i33`, parts via
 * f2("name"), states via _38(), aim via atan2). See audit §2. No inventions.
 *
 * This is a spec + small helpers, not a renderer. The actual skeleton/bone
 * offsets live in the original animation JSON (not in the repo) — see
 * RIG_NOTES below.
 */

// Confirmed body-part names (i33.f2("...")). Humanoid uses the first group;
// animal/special skins swap in the second.
export const PARTS = {
  humanoid: [
    'head', 'eye', 'torso', 'body',
    'front_shoulder', 'front_arm',           // the aiming arm
    'pants', 'leg', 'leg_back',
    'frontleg', 'backleg', 'front_foot', 'back_foot',
  ],
  animal: ['frontpaw', 'backpaw', 'wing', 'tail', 'prickear'],
};

// Confirmed default-humanoid atlas part sprites (tiles.png), name -> atlas key.
// These are the REAL Diggerz base parts (verified against the pixels).
export const PART_SPRITES = {
  head: 'HEAD_PNG',        // [1769,352,56,50] orange head
  eyes: 'EYES_PNG',        // [563,382,35,21]  white eyes
  torso: 'TORSO_PNG',      // [436,1912,34,27] dark torso
  pants: 'PANTS_PNG',      // [208,46,34,8]
  leg: 'LEG_PNG',          // [179,1660,24,17] front leg
  legBack: 'LEG_BACK_PNG', // [593,45,24,15]   back leg
  foot: 'FOOT_PNG',        // [138,44,32,16]
  arm: 'ARM_PNG',          // [0,19,17,14]     front arm
  armBack: 'ARM_BACK_PNG', // [0,34,17,14]
  hand: 'HAND_PNG',        // [2027,4,20,16]   front hand
  handBack: 'HAND_BACK_PNG',// [183,386,20,16]
  // Tintable WHITE/greyscale base variants — the real game colours the body by
  // tinting these (player colour customisation). Used for the blue/purple legs,
  // pants and shoes so we match a coloured character without inventing art.
  legWhite: 'LEG_WHITE_PNG',         // [176,1877,24,17]
  legBackWhite: 'LEG_BACK_WHITE_PNG',// [1887,45,24,15]
  pantsWhite: 'PANTS_WHITE_PNG',     // [520,52,34,8]
  footWhite: 'FOOT_WHITE_PNG',       // [1155,43,32,16]
};

// The standalone APPROXIMATE rig layout — body-part offsets, arm/hand anchors,
// and the per-weapon held grip/rotation/scale — lives in the renderer at
// render/CharacterRigConfig.js (visual calibration, not confirmed Diggerz data).
// PART_SPRITES above are the confirmed atlas keys those offsets place.

// Confirmed animation-state names (i33._38("name"); current = i33.Z28).
// NOTE: real names — there is no "run"/"fall"; movement is "walk", leaving the
// ground is "jump_in", aiming a gun is "gun_pose".
export const ANIM = {
  IDLE: 'idle',
  WALK: 'walk',
  JUMP_IN: 'jump_in',
  GUN_POSE: 'gun_pose', // aiming a ranged weapon
  BUILD: 'build',       // placing a block
  HIT: 'hit',           // melee swing / taking a hit
};

/**
 * Choose the base locomotion animation the way the client does: grounded +
 * still -> idle, grounded + moving -> walk, airborne -> jump_in. An active
 * action (gun_pose / build / hit) overrides locomotion while it plays.
 */
export function locomotionAnim({ grounded, moving }) {
  if (!grounded) return ANIM.JUMP_IN;
  return moving ? ANIM.WALK : ANIM.IDLE;
}

/** Facing is the rig's x-scale: +1 right, -1 left (client `k33`/`b4`). */
export function facingScale(facing) {
  return facing >= 0 ? 1 : -1;
}

/**
 * Aim angle exactly as the client computes + encodes it (audit §2):
 *   angle = atan2(worldMouseY - playerY, worldMouseX - playerX)
 *   packed = floor((angle + 2π) * 600)   // uint16, sent in the move packet
 */
export function aimAngle(playerX, playerY, worldMouseX, worldMouseY) {
  return Math.atan2(worldMouseY - playerY, worldMouseX - playerX);
}

export function encodeAim(angle) {
  return Math.floor((angle + 2 * Math.PI) * 600) & 0xffff;
}

export function decodeAim(packed) {
  return packed / 600 - 2 * Math.PI;
}

// Bone offsets are NOT in the client repo (they live in the skeleton JSON).
export const RIG_NOTES =
  'Bone/part offsets come from the original animation JSON (not in repo). ' +
  'Part source rects are in assets/tiles.atlas.json; placement is unknown.';
