/**
 * ShotFx — pure bookkeeping + timing math for the client-style shot visuals
 * (docs/WEAPON_FUNCTION_AUDIT.md §3). No DOM: ArenaScene renders the entries.
 *
 * CONFIRMED timings from the client's `ul` effect:
 *   - tracer: stretched muzzle->impact, thickness (yScale) 3 -> 1, fading over
 *     500 ms, tinted the gun's shot colour (u41).
 *   - type-28 laser: BEAM_PNG stretched to the shot length, alpha .7 -> 0 over
 *     200 ms.
 */
export const TRACER_FADE_S = 0.5;   // CONFIRMED (500ms)
export const LASER_FADE_S = 0.2;    // CONFIRMED (200ms)

export class ShotFx {
  constructor() { this.fx = []; }

  /** Register a completed shot (muzzle -> impact) at sim time `now`. */
  add(x1, y1, x2, y2, tint, now) {
    this.fx.push({ x1, y1, x2, y2, tint, t0: now });
  }

  /** Drop entries older than the tracer window. */
  update(now) {
    this.fx = this.fx.filter((f) => now - f.t0 < TRACER_FADE_S);
  }
}

/** Tracer thickness at `age` seconds: 3 -> 1 over the 500ms fade. */
export function tracerThickness(age) {
  const k = Math.min(1, Math.max(0, age / TRACER_FADE_S));
  return 3 - 2 * k;
}

/** Tracer alpha at `age`: 1 -> 0 over the 500ms fade. */
export function tracerAlpha(age) {
  return Math.max(0, 1 - age / TRACER_FADE_S);
}

/** Type-28 laser alpha at `age`: .7 -> 0 over 200ms, then gone. */
export function laserAlpha(age) {
  if (age >= LASER_FADE_S) return 0;
  return 0.7 * (1 - age / LASER_FADE_S);
}
