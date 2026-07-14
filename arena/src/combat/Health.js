/**
 * Health — per-fighter health, death, respawn and spawn-invulnerability.
 * Pure/deterministic: all time is passed in (seconds), no Date.now / no DOM.
 * Values come from CombatConfig (PROPOSED standalone — not Diggerz).
 */
export class Health {
  constructor({ maxHealth, respawnDelay, invuln }) {
    this.max = maxHealth;
    this.respawnDelay = respawnDelay;
    this.invulnTime = invuln;
    this.hp = maxHealth;
    this.alive = true;
    this._invulnUntil = 0;     // sim-time until which damage is ignored
    this._respawnAt = null;    // sim-time at which to respawn (when dead)
  }

  isInvulnerable(now) {
    return now < this._invulnUntil;
  }

  /**
   * Apply damage. Returns { damaged, died, blocked }.
   * Blocked while invulnerable or already dead.
   */
  takeDamage(amount, now) {
    if (!this.alive || this.isInvulnerable(now)) return { damaged: false, died: false, blocked: true };
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.alive = false;
      this._respawnAt = now + this.respawnDelay;
      return { damaged: true, died: true, blocked: false };
    }
    return { damaged: true, died: false, blocked: false };
  }

  /** Tick respawn timing. Returns true on the step the fighter respawns. */
  update(now) {
    if (!this.alive && this._respawnAt !== null && now >= this._respawnAt) {
      this.respawn(now);
      return true;
    }
    return false;
  }

  respawn(now) {
    this.hp = this.max;
    this.alive = true;
    this._respawnAt = null;
    this._invulnUntil = now + this.invulnTime; // brief spawn protection
  }

  reset(now = 0) {
    this.hp = this.max;
    this.alive = true;
    this._respawnAt = null;
    this._invulnUntil = now + this.invulnTime;
  }
}
