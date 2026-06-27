/**
 * MovementController — the "feel".
 *
 * A pure platformer movement integrator: gravity, accelerated horizontal
 * movement, jumping (with the small quality-of-life tricks that make a jump
 * feel good), velocity tracking, facing, and a simple animation-state output.
 *
 * It does NOT touch the DOM, input devices, or rendering. You hand it a body,
 * an input snapshot, a timestep, and a collider; it advances the body. This is
 * the reusable Diggerz-style movement core for the PvP arena.
 *
 * Body shape (you own it; create with `MovementController.createBody`):
 *   { x, y, w, h, vx, vy, grounded, facing, anim, animIndex,
 *     _coyote, _jumpBuffer, _jumping }
 *
 * Input snapshot:
 *   { left, right, jumpHeld, jumpPressed }
 *     jumpPressed = rising edge this step (true only on the frame the key went
 *     down); jumpHeld = currently held (drives variable jump height).
 */

const ANIM_INDEX = { idle: 0, run: 1, jump: 2, fall: 3 };

const DEFAULTS = {
  // Gravity & fall.
  gravity: 1900,          // px/s^2
  maxFallSpeed: 1200,     // px/s

  // Horizontal.
  moveSpeed: 285,         // px/s target top speed
  groundAccel: 2600,      // px/s^2 toward target while grounded
  airAccel: 1700,         // px/s^2 toward target while airborne
  groundFriction: 2700,   // px/s^2 decel when no input, grounded
  airFriction: 600,       // px/s^2 decel when no input, airborne

  // Jump.
  jumpSpeed: 720,         // px/s initial upward velocity
  jumpCutMultiplier: 0.45,// releasing jump early scales remaining up-velocity
  coyoteTime: 0.09,       // s of grace to jump after leaving a ledge
  jumpBufferTime: 0.10,   // s a jump press is remembered before landing

  // Animation.
  runThreshold: 12,       // px/s above which grounded movement reads as "run"
};

export class MovementController {
  constructor(config = {}) {
    this.cfg = { ...DEFAULTS, ...config };
  }

  /** Create a fresh body with all required fields initialised. */
  static createBody(x, y, w, h) {
    return {
      x, y, w, h,
      vx: 0, vy: 0,
      grounded: false,
      facing: 1,            // +1 right, -1 left
      anim: 'idle',
      animIndex: ANIM_INDEX.idle,
      _coyote: 0,
      _jumpBuffer: 0,
      _jumping: false,
    };
  }

  /**
   * Advance `body` by `dt` seconds using `input`, resolving against `collider`
   * (anything with moveAndCollide(x,y,w,h,dx,dy) -> {x,y,hitX,hitY,grounded}).
   */
  step(body, input, dt, collider) {
    const c = this.cfg;

    // ── Horizontal acceleration toward target velocity ──
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      const accel = body.grounded ? c.groundAccel : c.airAccel;
      body.vx += dir * accel * dt;
      if (body.vx > c.moveSpeed) body.vx = c.moveSpeed;
      if (body.vx < -c.moveSpeed) body.vx = -c.moveSpeed;
      body.facing = dir; // face the way we're steering
    } else {
      // Friction toward zero when no horizontal input.
      const fr = (body.grounded ? c.groundFriction : c.airFriction) * dt;
      if (body.vx > 0) body.vx = Math.max(0, body.vx - fr);
      else if (body.vx < 0) body.vx = Math.min(0, body.vx + fr);
    }

    // ── Gravity ──
    body.vy += c.gravity * dt;
    if (body.vy > c.maxFallSpeed) body.vy = c.maxFallSpeed;

    // ── Jump: coyote time + input buffering ──
    body._coyote = body.grounded ? c.coyoteTime : Math.max(0, body._coyote - dt);
    body._jumpBuffer = input.jumpPressed
      ? c.jumpBufferTime
      : Math.max(0, body._jumpBuffer - dt);

    if (body._jumpBuffer > 0 && body._coyote > 0) {
      body.vy = -c.jumpSpeed;
      body._jumpBuffer = 0;
      body._coyote = 0;
      body._jumping = true;
    }

    // Variable jump height: releasing jump while rising cuts the ascent.
    if (body._jumping && !input.jumpHeld && body.vy < 0) {
      body.vy *= c.jumpCutMultiplier;
      body._jumping = false;
    }
    if (body.vy >= 0) body._jumping = false;

    // ── Integrate with collision ──
    const res = collider.moveAndCollide(body.x, body.y, body.w, body.h, body.vx * dt, body.vy * dt);
    body.x = res.x;
    body.y = res.y;
    if (res.hitX) body.vx = 0;
    if (res.hitY) body.vy = 0;
    body.grounded = res.grounded;

    // Rest flush on the ground: kill residual downward velocity from gravity
    // and snap to the surface so a standing player doesn't jitter on the tile
    // boundary (its feet otherwise hover ~1px above the solid row).
    if (body.grounded) {
      if (body.vy > 0) body.vy = 0;
      if (typeof collider.floorUnder === 'function') {
        const snapY = collider.floorUnder(body.x, body.y, body.w, body.h);
        if (snapY !== null) body.y = snapY; // rest flush on the surface under our feet
      }
    }

    // ── Animation state ──
    body.anim = this._animState(body);
    body.animIndex = ANIM_INDEX[body.anim];

    return body;
  }

  _animState(body) {
    if (!body.grounded) return body.vy < 0 ? 'jump' : 'fall';
    return Math.abs(body.vx) > this.cfg.runThreshold ? 'run' : 'idle';
  }
}

export { ANIM_INDEX };
