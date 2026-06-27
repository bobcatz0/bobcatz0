'use strict';

/**
 * MovementValidator — reusable, framework-agnostic anti-cheat for
 * client-reported movement.
 *
 * It does NOT simulate physics. Movement stays client-side; this module only
 * sanity-checks each reported position/velocity and, when something looks
 * wrong, it:
 *   1. clamps the value into the allowed range,
 *   2. ignores the raw (invalid) value,
 *   3. records the violation, and
 *   4. raises a per-player "suspicion" counter that flags the player for
 *      admin review once a threshold is crossed.
 *
 * It never bans. The decision of what to do with a flagged player is left to
 * the host application.
 *
 * Reusable by design: it has no dependency on the diggerz wire format, world,
 * or sockets. It operates on plain numbers in whatever spatial unit you feed
 * it (diggerz uses tile units; a PvP arena could use metres or pixels). Per-
 * player state is an opaque object you create with `createState()` and own.
 *
 * Usage:
 *   const v = new MovementValidator({ minX: 0, maxX: 64, minY: -10, maxY: 50 });
 *   const state = v.createState(spawnX, spawnY);
 *   const verdict = v.check(state, { x, y, vx, vy }, Date.now());
 *   if (verdict.dropped) return;            // rate-limited: ignore packet
 *   applyPosition(verdict.x, verdict.y);    // always the CORRECTED values
 *   if (verdict.flagged) markForReview();
 */

const DEFAULTS = {
  // World bounds, in the same unit as reported positions.
  minX: -Infinity,
  maxX: Infinity,
  minY: -Infinity,
  maxY: Infinity,

  // Speed caps (units per second). Deliberately permissive — these are outer
  // anti-cheat bounds, not a physics model, so legitimate play is never
  // rubber-banded.
  maxHorizontalSpeed: 40,
  maxVerticalSpeed: 120,

  // Largest single-update position jump (units), independent of dt — catches
  // one-tick "blink" teleports.
  maxTeleportDistance: 20,

  // Any |coordinate| or |velocity| above this is treated as impossible
  // (also catches NaN / Infinity).
  hardCoordinateLimit: 1e6,

  // Movement-packet rate limit.
  rateLimitWindowMs: 1000,
  rateLimitMaxPackets: 90,

  // dt clamping (seconds) so implied-speed math stays stable under lag/bursts.
  minDeltaSeconds: 0.008,
  maxDeltaSeconds: 0.5,

  // Suspicion / review.
  suspicionPerViolation: 1,
  suspicionFlagThreshold: 12,
  suspicionDecayPerSecond: 0.5,   // gentle decay so latency jitter can't accumulate forever
  rateLimitCountsAsSuspicious: false, // bursting is usually lag, not cheating
};

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

class MovementValidator {
  constructor(options = {}) {
    this.cfg = { ...DEFAULTS, ...options };
  }

  /** Create per-player state. Own it on your player object. */
  createState(x = 0, y = 0) {
    return {
      lastX: x,
      lastY: y,
      lastTimeMs: 0,       // 0 => no baseline yet
      lastDecayMs: 0,
      window: [],          // recent packet timestamps (rate limiting)
      suspicion: 0,        // current (decaying) suspicion score
      totalViolations: 0,  // lifetime counter
      flagged: false,      // sticky: stays true once tripped (for admin review)
      flaggedAtMs: 0,
      lastViolations: [],  // most recent violation reasons
      reasonCounts: {},    // reason -> count, for review
    };
  }

  /**
   * Validate one reported movement.
   *
   * @param state    per-player state from createState()
   * @param proposed { x, y, vx, vy }   reported values (vx/vy optional)
   * @param nowMs    current time in milliseconds (e.g. Date.now())
   * @returns verdict {
   *   accepted,    // apply & broadcast the corrected movement
   *   dropped,     // rate-limited: ignore this packet entirely
   *   corrected,   // true if any clamping/ignoring happened
   *   x, y, vx, vy,// CORRECTED values to apply
   *   violations,  // array of reason strings
   *   suspicion,   // current suspicion score
   *   flagged,     // sticky review flag
   * }
   */
  check(state, proposed, nowMs) {
    const cfg = this.cfg;
    const violations = [];
    let x = proposed.x;
    let y = proposed.y;
    let vx = proposed.vx || 0;
    let vy = proposed.vy || 0;

    // 1. Rate limit (sliding window).
    state.window.push(nowMs);
    const cutoff = nowMs - cfg.rateLimitWindowMs;
    while (state.window.length && state.window[0] < cutoff) state.window.shift();
    if (state.window.length > cfg.rateLimitMaxPackets) {
      if (cfg.rateLimitCountsAsSuspicious) this._bump(state, ['rate_limit'], nowMs);
      return this._verdict(state, {
        accepted: false, dropped: true, corrected: false,
        x: state.lastX, y: state.lastY, vx: 0, vy: 0,
        violations: ['rate_limit'],
      });
    }

    // 2. Impossible coordinate detection (NaN / Infinity / absurd magnitude).
    const lim = cfg.hardCoordinateLimit;
    const finite = Number.isFinite(x) && Number.isFinite(y) &&
                   Number.isFinite(vx) && Number.isFinite(vy);
    if (!finite ||
        Math.abs(x) > lim || Math.abs(y) > lim ||
        Math.abs(vx) > lim || Math.abs(vy) > lim) {
      this._bump(state, ['impossible'], nowMs);
      // Ignore entirely; freeze the player at the last good position.
      return this._verdict(state, {
        accepted: false, dropped: false, corrected: true,
        x: state.lastX, y: state.lastY, vx: 0, vy: 0,
        violations: ['impossible'],
      });
    }

    // Decay suspicion based on elapsed wall-clock time.
    this._decay(state, nowMs);

    // 3. Out-of-bounds clamp.
    const bx = clamp(x, cfg.minX, cfg.maxX);
    const by = clamp(y, cfg.minY, cfg.maxY);
    if (bx !== x || by !== y) violations.push('out_of_bounds');
    x = bx;
    y = by;

    // First update establishes a baseline; skip motion checks.
    if (state.lastTimeMs === 0) {
      const vc = this._clampVelocity(vx, vy, violations);
      state.lastX = x;
      state.lastY = y;
      state.lastTimeMs = nowMs;
      if (violations.length) this._bump(state, violations, nowMs);
      return this._verdict(state, {
        accepted: true, dropped: false, corrected: violations.length > 0,
        x, y, vx: vc.vx, vy: vc.vy, violations,
      });
    }

    // 4. dt (clamped).
    const dt = clamp((nowMs - state.lastTimeMs) / 1000, cfg.minDeltaSeconds, cfg.maxDeltaSeconds);

    // 5. Per-axis speed clamp.
    let dx = x - state.lastX;
    let dy = y - state.lastY;
    const maxDx = cfg.maxHorizontalSpeed * dt;
    const maxDy = cfg.maxVerticalSpeed * dt;
    if (Math.abs(dx) > maxDx) { dx = Math.sign(dx) * maxDx; violations.push('h_speed'); }
    if (Math.abs(dy) > maxDy) { dy = Math.sign(dy) * maxDy; violations.push('v_speed'); }

    // 6. Teleport distance clamp (euclidean, dt-independent).
    const dist = Math.hypot(dx, dy);
    if (dist > cfg.maxTeleportDistance) {
      const k = cfg.maxTeleportDistance / dist;
      dx *= k;
      dy *= k;
      violations.push('teleport');
    }

    x = state.lastX + dx;
    y = state.lastY + dy;

    // 7. Reported-velocity clamp (used for remote animation).
    const vc = this._clampVelocity(vx, vy, violations);
    vx = vc.vx;
    vy = vc.vy;

    if (violations.length) this._bump(state, violations, nowMs);

    state.lastX = x;
    state.lastY = y;
    state.lastTimeMs = nowMs;

    return this._verdict(state, {
      accepted: true, dropped: false, corrected: violations.length > 0,
      x, y, vx, vy, violations,
    });
  }

  /** Reset a player's suspicion + flag (e.g. after an admin clears them). */
  clearFlag(state) {
    state.suspicion = 0;
    state.flagged = false;
    state.flaggedAtMs = 0;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  _clampVelocity(vx, vy, violations) {
    const { maxHorizontalSpeed: h, maxVerticalSpeed: v } = this.cfg;
    const cvx = clamp(vx, -h, h);
    const cvy = clamp(vy, -v, v);
    if (cvx !== vx) violations.push('vx_speed');
    if (cvy !== vy) violations.push('vy_speed');
    return { vx: cvx, vy: cvy };
  }

  _decay(state, nowMs) {
    if (state.lastDecayMs === 0) { state.lastDecayMs = nowMs; return; }
    const elapsed = (nowMs - state.lastDecayMs) / 1000;
    if (elapsed <= 0) return;
    state.suspicion = Math.max(0, state.suspicion - elapsed * this.cfg.suspicionDecayPerSecond);
    state.lastDecayMs = nowMs;
  }

  _bump(state, reasons, nowMs) {
    state.totalViolations += 1;
    state.lastViolations = reasons.slice();
    for (const reason of reasons) {
      state.reasonCounts[reason] = (state.reasonCounts[reason] || 0) + 1;
    }
    state.suspicion += this.cfg.suspicionPerViolation;
    if (!state.flagged && state.suspicion >= this.cfg.suspicionFlagThreshold) {
      state.flagged = true;          // sticky: stays flagged for admin review
      state.flaggedAtMs = nowMs;
    }
  }

  _verdict(state, v) {
    v.suspicion = Math.round(state.suspicion * 100) / 100;
    v.flagged = state.flagged;
    return v;
  }
}

module.exports = MovementValidator;
