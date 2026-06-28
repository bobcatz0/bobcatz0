/**
 * MeleeResolver — resolves a melee weapon (Combat V1: Fake Sword, id 55).
 *
 * Confirmed: the weapon identity + that a use is left-mouse toward the aim.
 * PROPOSED (standalone): the arc/reach/damage/cooldown values (from CombatConfig).
 *
 * Pure/deterministic — time passed in. One swing = one short active window with
 * a wedge hitbox in the aim direction; at most one target hit per swing.
 */

import { withinArc, bodyHurtbox, center } from './geometry.js';

export class MeleeResolver {
  constructor(weapon) {
    this.w = weapon;                 // { combat: { reach, arcDegrees, activeTime, cooldown, damage } }
    this._cooldownUntil = 0;
    this._activeUntil = 0;
    this._aim = 0;
    this._connected = false;
  }

  get isActive() { return this._activeUntilNow; }
  cooldownRemaining(now) { return Math.max(0, this._cooldownUntil - now); }

  /** Begin a swing toward `aimAngle` if off cooldown. Returns true if started. */
  use(now, aimAngle) {
    if (now < this._cooldownUntil) return false;
    this._cooldownUntil = now + this.w.combat.cooldown;
    this._activeUntil = now + this.w.combat.activeTime;
    this._aim = aimAngle;
    this._connected = false;
    return true;
  }

  /** The hitbox wedge is "live" between use() and activeUntil. */
  active(now) { return now < this._activeUntil; }

  /**
   * Test the live swing against targets. Calls onHit(target, damage) once for
   * the first target the wedge overlaps this swing.
   * @param attackerBody { x, y, w, h }
   * @param targets [{ body, health }]
   */
  resolve(now, attackerBody, targets, hurtboxInset, onHit) {
    if (!this.active(now) || this._connected) return;
    const origin = center(bodyHurtbox(attackerBody));
    const reach = this.w.combat.reach;
    const arc = (this.w.combat.arcDegrees * Math.PI) / 180;
    for (const t of targets) {
      if (t.health && !t.health.alive) continue;
      const c = center(bodyHurtbox(t.body, hurtboxInset));
      if (withinArc(origin, c, reach, this._aim, arc)) {
        this._connected = true;
        onHit(t, this.w.combat.damage);
        return;
      }
    }
  }

  /** For rendering: the swing's reach/arc/aim while active, else null. */
  debugArc(now, attackerBody) {
    if (!this.active(now)) return null;
    const origin = center(bodyHurtbox(attackerBody));
    return { x: origin.x, y: origin.y, reach: this.w.combat.reach, aim: this._aim, arc: (this.w.combat.arcDegrees * Math.PI) / 180 };
  }

  /** Reset transient swing state (called by CombatSystem.reset for a rematch). */
  clear() {
    this._cooldownUntil = 0;
    this._activeUntil = 0;
    this._connected = false;
  }
}
