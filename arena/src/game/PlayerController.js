import { MovementController } from './MovementController.js';

/**
 * PlayerController — binds an input source, a body, and a MovementController.
 *
 * Owns one player's physical body and advances it each fixed step from an
 * input snapshot. Rendering and scoring live elsewhere; this is purely "where
 * is the player and how is it moving". The `input` dependency only needs a
 * `snapshot()` method, so tests can feed a fake.
 */
export class PlayerController {
  /**
   * @param {{ x, y, width, height }} spec   spawn + collision-box size
   * @param {MovementController} movement
   * @param {object} collider                has moveAndCollide(...)
   * @param {{ snapshot(): object }} input
   */
  constructor(spec, movement, collider, input) {
    this.movement = movement;
    this.collider = collider;
    this.input = input;
    this.body = MovementController.createBody(spec.x, spec.y, spec.width, spec.height);
  }

  /** Advance one fixed step. */
  update(dt) {
    const snapshot = this.input.snapshot();
    this.movement.step(this.body, snapshot, dt, this.collider);
  }

  /** Read-only-ish view of the player's current state (for render + debug). */
  get state() {
    const b = this.body;
    return {
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      grounded: b.grounded,
      facing: b.facing,
      anim: b.anim,
      animIndex: b.animIndex,
      width: b.w,
      height: b.h,
    };
  }
}
