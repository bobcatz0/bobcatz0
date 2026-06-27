/**
 * Projectile — a simple travelling shot.
 *
 * Moves horizontally in its facing direction, dies on wall collision, on
 * lifetime expiry, or when the owner's system marks it dead after a hit.
 * Pure logic: the collider only needs `tile` and `isSolid(col, row)` (the
 * arena's TileCollision satisfies this), so this is reusable as-is.
 */

const DEFAULTS = {
  speed: 620,   // px/s
  w: 12,
  h: 8,
  ttl: 2.0,     // s before it expires
  damage: 1,
};

export class Projectile {
  constructor(x, y, dir, config = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    this.x = x;
    this.y = y;
    this.dir = dir >= 0 ? 1 : -1;
    this.vx = this.cfg.speed * this.dir;
    this.w = this.cfg.w;
    this.h = this.cfg.h;
    this.ttl = this.cfg.ttl;
    this.damage = this.cfg.damage;
    this.alive = true;
  }

  aabb() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, collider) {
    this.x += this.vx * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) { this.alive = false; return; }

    if (collider) {
      const t = collider.tile;
      const col = Math.floor(this.x / t);
      const row = Math.floor(this.y / t);
      if (collider.isSolid(col, row)) this.alive = false;
    }
  }
}
