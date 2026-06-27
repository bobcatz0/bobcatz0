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

// Confirmed atlas part sprites (tiles.png) for a default humanoid, name -> rect.
// (More skins exist; these are the verified defaults from the audit.)
export const PART_SPRITES = {
  torso: 'ADVTORSO_PNG',  // [138,4,34,39]
  head: 'ALIENHEAD_PNG',  // [18,61,60,65]
  arm: 'ARM_PNG',         // [0,19,17,14]
  armBack: 'ARM_BACK_PNG',// [0,34,17,14]
  hat: 'ADVHAT_PNG',      // [18,4,86,56]
  shoes: 'ADVSHOES_PNG',  // [105,4,32,16]
};

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
