/**
 * ProjectileResolver — resolves a ranged weapon (Combat V1: Blue Ray Gun, id 79).
 *
 * Confirmed: identity + that firing is left-mouse toward the aim. The original
 * Diggerz client did NOT create projectiles (the server did) — so WE spawn them.
 * PROPOSED (standalone): speed / ttl / cooldown / damage / size from CombatConfig.
 *
 * Pure/deterministic — time + dt passed in; collider only needs
 * tile + isSolid(col,row) (the arena's TileCollision satisfies this).
 */

import { aabbOverlap, bodyHurtbox } from './geometry.js';

export class Projectile {
  constructor(x, y, angle, w, h, speed, ttl, damage, ownerId) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.w = w;
    this.h = h;
    this.angle = angle;
    this.ttl = ttl;
    this.damage = damage;
    this.ownerId = ownerId;
    this.alive = true;
  }

  aabb() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  step(dt, collider) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) { this.alive = false; return; }
    if (collider) {
      const t = collider.tile;
      if (collider.isSolid(Math.floor(this.x / t), Math.floor(this.y / t))) this.alive = false;
    }
  }
}

export class ProjectileResolver {
  constructor(weapon, collider) {
    this.w = weapon;                 // { combat: { projectileSpeed, ttl, cooldown, damage, projW, projH, pellets, spreadDegrees } }
    this.collider = collider;
    this._cooldownUntil = 0;
    this.projectiles = [];
  }

  cooldownRemaining(now) { return Math.max(0, this._cooldownUntil - now); }

  /** Fire from (x,y) toward aimAngle if off cooldown. Returns true if fired. */
  use(now, x, y, aimAngle, ownerId) {
    if (now < this._cooldownUntil) return false;
    this._cooldownUntil = now + this.w.combat.cooldown;
    const c = this.w.combat;
    const pellets = c.pellets || 1;
    const spread = ((c.spreadDegrees || 0) * Math.PI) / 180;
    for (let i = 0; i < pellets; i++) {
      const off = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * spread;
      this.projectiles.push(
        new Projectile(x, y, aimAngle + off, c.projW, c.projH, c.projectileSpeed, c.ttl, c.damage, ownerId),
      );
    }
    return true;
  }

  /**
   * Advance projectiles, test against targets, cull. Calls onHit(target, damage)
   * per projectile that strikes a living target.
   * @param targets [{ id, body, health }]
   */
  update(dt, targets, hurtboxInset, onHit) {
    for (const p of this.projectiles) {
      p.step(dt, this.collider);
      if (!p.alive) continue;
      for (const t of targets) {
        if (t.id === p.ownerId) continue;
        if (t.health && !t.health.alive) continue;
        if (aabbOverlap(p.aabb(), bodyHurtbox(t.body, hurtboxInset))) {
          p.alive = false;
          onHit(t, p.damage);
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  clear() { this.projectiles = []; this._cooldownUntil = 0; }
}
