/**
 * swordSwing — the REAL Fake Sword hold pose + melee swing, as pure keyframes.
 *
 * Derived by forward-kinematics from the client's Spine skeleton
 * (docs/extracted/guy_weapon_anims.json): `sword_pose` (static hold) and
 * `zswing` (0.200 s swing, front shoulder 196° -> 70.43° -> 196°). Each key is
 * the front-hand node's on-screen rotation (canvas degrees, unwrapped so the
 * blade sweeps OVERHEAD, not the short way) plus the hand's offset from the
 * character origin in skeleton units (y up from the feet). CONFIRMED data —
 * only the on-screen sampling below is ours.
 *
 * Each key is the SWORD-CENTRE world transform (attachment world rotation +
 * the wear offset (-20,2) composed in the bone frame — exactly what the client
 * draws). The rest key (t=0) IS the sword_pose hold: blade cocked over the
 * shoulder; the chop (t=0.10) sweeps forward-low to the ground in front.
 */
export const SWING_DURATION = 0.2; // s — CONFIRMED (zswing length)

// { t, deg (canvas, unwrapped), dx, dy } — sword centre: dx forward(+),
// dy up(+) from the feet, in skeleton units.
export const SWING_KEYS = [
  { t: 0.00, deg: 157.8, dx: 14.9, dy: 31.8 }, // = sword_pose hold
  { t: 0.05, deg: 242.7, dx: 25.3, dy: 4.5 },
  { t: 0.10, deg: 327.5, dx: 7.7, dy: -2.4 },  // the chop (into the ground)
  { t: 0.15, deg: 242.7, dx: 25.3, dy: 4.5 },
  { t: 0.20, deg: 157.8, dx: 14.9, dy: 31.8 },
];

// Character height in skeleton units (guy_anims skeleton is ~91 tall) — used to
// scale the hand offsets to the on-screen sprite height.
export const SKELETON_H = 91;

/** The swing's rest key (the client's sword_pose — used only by the zswing). */
export function swordHoldPose() { return { ...SWING_KEYS[0] }; }

// ── Held stances (owner spec — docs/references/sword_idle_reference.png /
// sword_walk_reference.png). PROPOSED_STANDALONE poses, NOT client keyframes:
// the owner replaced the client's over-the-shoulder rest hold with a LOW
// DIAGONAL GUARD. The sword sprite's BLADE points along local -x (handle +x,
// verified on screen), so the blade tip direction for facing-right is
// (-cos deg, -sin deg) in canvas coords (y down).
//
// idle: compact relaxed-ready hold — hand near waist/chest, sword low in
// front, blade diagonally DOWNWARD across the front, tip down-forward.
// walk: same compact hold, blade diagonally forward/UPWARD; the weapon only
// bobs with the walk cycle (never plays zswing, never reads as a windup).
export const SWORD_IDLE_POSE = { deg: 225, dx: 12, dy: 22, behind: false };
export const SWORD_WALK_POSE = { deg: 135, dx: 13, dy: 30, behind: false };

// Slight walk-cycle bob (skeleton units); rate matches the leg cycle (t*12).
export const WALK_BOB_UNITS = 1.5;

/**
 * The held stance while NOT swinging. `moving` = grounded walk/run;
 * `tSec` drives the slight walk bob. Returns { deg, dx, dy, behind }.
 */
export function swordStancePose(moving, tSec = 0) {
  if (!moving) return { ...SWORD_IDLE_POSE };
  const bob = Math.abs(Math.sin(tSec * 12)) * WALK_BOB_UNITS;
  return { ...SWORD_WALK_POSE, dy: SWORD_WALK_POSE.dy + bob };
}

/**
 * Sample the swing at `t` seconds since the swing started (linear between the
 * real keys, clamped). Returns { deg, dx, dy }.
 */
export function swordSwingAt(t) {
  const K = SWING_KEYS;
  if (t <= K[0].t) return { ...K[0] };
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i], b = K[i + 1];
    if (t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      return { deg: a.deg + (b.deg - a.deg) * f, dx: a.dx + (b.dx - a.dx) * f, dy: a.dy + (b.dy - a.dy) * f };
    }
  }
  return { ...K[K.length - 1] };
}
