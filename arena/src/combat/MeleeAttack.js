/**
 * MeleeAttack — one fighter's short-range melee, as pure state.
 *
 * A swing has a brief *active window* during which a hitbox exists just in
 * front of the fighter (in its facing direction). A cooldown prevents spamming.
 * Each swing can only connect once (`connected`), so a target inside the
 * hitbox for several frames still scores a single hit.
 */

const DEFAULTS = {
  cooldown: 0.40,      // s between swings
  activeTime: 0.12,    // s the hitbox is live
  reach: 28,           // px the hitbox extends in front
  height: 30,          // px tall
  frontOverlap: 4,     // px the hitbox starts inside the body (so contact reads)
};

export class MeleeAttack {
  constructor(config = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    this._cooldown = 0;
    this._active = 0;
    this._connected = false;
  }

  get ready() { return this._cooldown <= 0; }
  get isActive() { return this._active > 0; }
  get connected() { return this._connected; }
  cooldownRemaining() { return Math.max(0, this._cooldown); }

  /** Begin a swing if off cooldown. Returns true if it started. */
  tryStart() {
    if (this._cooldown > 0) return false;
    this._cooldown = this.cfg.cooldown;
    this._active = this.cfg.activeTime;
    this._connected = false;
    return true;
  }

  update(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;
    if (this._active > 0) this._active -= dt;
  }

  markConnected() { this._connected = true; }

  /**
   * The live hitbox AABB in front of `body`, or null when not active.
   * `body` provides { x, y, w, h, facing }.
   */
  hitbox(body) {
    if (this._active <= 0) return null;
    const { reach, height, frontOverlap } = this.cfg;
    const y = body.y + (body.h - height) / 2;
    const x = body.facing >= 0
      ? body.x + body.w - frontOverlap
      : body.x - reach + frontOverlap;
    return { x, y, w: reach, h: height };
  }
}
