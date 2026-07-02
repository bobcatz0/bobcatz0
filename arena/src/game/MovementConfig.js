/**
 * MovementConfig — THE single source of truth for the movement "feel".
 *
 * Every movement value the prototype uses lives here: gravity, fall cap,
 * horizontal speed, acceleration, friction, and the jump tuning. Change the
 * feel by editing THIS file only — `MovementController` imports these as its
 * defaults and nothing else hard-codes them.
 *
 * PROVENANCE: these are the prototype's *** tunable standalone feel values ***.
 * Only the input magnitude lineage is from the real client (InputBindings
 * HORIZONTAL_INPUT = 3.4 engine units); the px/s tuning below was chosen to
 * reproduce the Diggerz movement feel and is NOT an extracted server value.
 *
 * NOTE (playtest): movement currently reads slightly faster than the original.
 * Left intentionally unchanged this pass — tune `moveSpeed` (and accel/friction)
 * here when we decide to. Units are pixels and seconds throughout.
 */
export const MOVEMENT_CONFIG = {
  // ── Gravity & fall ──────────────────────────────────────────────────────────
  gravity: 1900,          // px/s^2 downward acceleration
  maxFallSpeed: 1200,     // px/s terminal fall speed

  // ── Horizontal movement ─────────────────────────────────────────────────────
  moveSpeed: 285,         // px/s target top speed (the main "how fast" knob)
  groundAccel: 2600,      // px/s^2 toward target speed while grounded
  airAccel: 1700,         // px/s^2 toward target speed while airborne
  groundFriction: 2700,   // px/s^2 deceleration with no input, grounded
  airFriction: 600,       // px/s^2 deceleration with no input, airborne

  // ── Jump ────────────────────────────────────────────────────────────────────
  // TARGET (visual reference, Coaster Town screenshot): jump apex ≈ 4 blocks.
  // Current apex = jumpSpeed²/(2·gravity) = 720²/3800 ≈ 136px ≈ 3.4 tiles @40px.
  // Documented only — physics intentionally unchanged this pass.
  jumpSpeed: 720,         // px/s initial upward velocity (jump height)
  jumpCutMultiplier: 0.45,// releasing jump early scales remaining up-velocity
  coyoteTime: 0.09,       // s of grace to still jump just after leaving a ledge
  jumpBufferTime: 0.10,   // s a jump press is remembered before landing

  // ── Animation thresholds ────────────────────────────────────────────────────
  runThreshold: 12,       // px/s above which grounded movement reads as "run"
};
