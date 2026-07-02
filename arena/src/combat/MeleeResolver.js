/**
 * MeleeResolver — resolves a melee weapon (Combat V1: Fake Sword, id 55) using
 * the REAL client melee model (docs/WEAPON_FUNCTION_AUDIT.md §4):
 *
 *   - On use, the client computes a STRIKE POINT at
 *       x + tileSize/1.5 * facing,  y - 10
 *     and sends it to the server (op 287 mode 25). The server resolved the hit
 *     — that logic is lost, so WE test the point against the target hurtbox.
 *     This is a real client strike point, NOT a real client hitbox.
 *   - Swing animation = zswing, 0.200 s (CONFIRMED).
 *   - Cooldown = 9 game ticks (CONFIRMED count; tick rate assumed — see config).
 *   - Damage stays a PROPOSED standalone value.
 *
 * Pure/deterministic — time passed in. One strike resolves at most once per
 * swing, on the first update after use (the client sent it instantly).
 */

import { bodyHurtbox } from './geometry.js';

export class MeleeResolver {
  constructor(weapon) {
    this.w = weapon;                 // { combat: { reach, strikeYOffset, swingDuration, cooldown, damage } }
    this._cooldownUntil = 0;
    this._swingStart = -Infinity;
    this._facing = 1;
    this._struck = true;
  }

  cooldownRemaining(now) { return Math.max(0, this._cooldownUntil - now); }

  /** Begin a swing facing +1/-1 if off cooldown. Returns true if started. */
  use(now, facing) {
    if (now < this._cooldownUntil) return false;
    this._cooldownUntil = now + this.w.combat.cooldown;
    this._swingStart = now;
    this._facing = facing >= 0 ? 1 : -1;
    this._struck = false;
    return true;
  }

  /** True while the 0.200s swing animation is playing. */
  isSwinging(now) { return now >= this._swingStart && now < this._swingStart + this.w.combat.swingDuration; }

  /** Swing progress 0..1 (clamped) since the swing started. */
  swingProgress(now) {
    const d = this.w.combat.swingDuration;
    return Math.max(0, Math.min(1, (now - this._swingStart) / d));
  }

  /** The client-authentic strike point for an attacker body, given the swing facing. */
  strikePoint(attackerBody) {
    const cx = attackerBody.x + attackerBody.w / 2;
    const cy = attackerBody.y + attackerBody.h / 2;
    return { x: cx + this.w.combat.reach * this._facing, y: cy + this.w.combat.strikeYOffset };
  }

  /**
   * Resolve the strike (once per swing): the strike point is tested against
   * each target's hurtbox; first containment hits. Calls onHit(target, damage).
   */
  resolve(now, attackerBody, targets, hurtboxInset, onHit) {
    if (this._struck || !this.isSwinging(now)) return;
    this._struck = true; // the client sends the strike once, instantly
    const p = this.strikePoint(attackerBody);
    for (const t of targets) {
      if (t.health && !t.health.alive) continue;
      const hb = bodyHurtbox(t.body, hurtboxInset);
      if (p.x >= hb.x && p.x <= hb.x + hb.w && p.y >= hb.y && p.y <= hb.y + hb.h) {
        onHit(t, this.w.combat.damage);
        return;
      }
    }
  }

  /** For debug rendering: the live strike point while swinging, else null. */
  debugStrike(now, attackerBody) {
    if (!this.isSwinging(now)) return null;
    return this.strikePoint(attackerBody);
  }

  /** Reset transient swing state (called by CombatSystem.reset for a rematch). */
  clear() {
    this._cooldownUntil = 0;
    this._swingStart = -Infinity;
    this._struck = true;
  }
}
