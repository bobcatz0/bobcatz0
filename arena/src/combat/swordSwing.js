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

/** The static hold pose (sword_pose). */
export function swordHoldPose() { return { ...SWING_KEYS[0] }; }

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
