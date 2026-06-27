import { overlaps } from './aabb.js';
import { bodyHurtbox } from './Hurtbox.js';
import { MeleeAttack } from './MeleeAttack.js';
import { Projectile } from './Projectile.js';

/**
 * CombatSystem — local combat orchestration for the prototype.
 *
 * One attacker (Player 1) can swing a melee or fire projectiles at one or more
 * targets (the Player 2 dummy). Each confirmed hit adds +1 to P1's score;
 * reaching the FT target ends the match (winner = 'P1') until reset().
 *
 * Pure logic (no DOM/canvas) so it's unit-testable. Rendering reads the
 * exposed state (`projectiles`, `meleeHitbox()`, target hurtboxes).
 *
 * Targets are plain objects: { body, hits, flash }. `body` has
 * { x, y, w, h, facing }; `hits`/`flash` are managed here.
 */

const DEFAULTS = {
  target: 20,                // FT20
  projectileCooldown: 0.5,   // s between shots
  hurtboxInset: 2,           // px inset for fairness
  flashTime: 0.15,           // s hit-flash feedback
};

export class CombatSystem {
  constructor({ collider, attacker, targets, config = {} }) {
    this.collider = collider;
    this.attacker = attacker;            // { body }
    this.targets = targets;              // [{ body, hits, flash }]
    this.cfg = { ...DEFAULTS, ...config };
    this._meleeCfg = config.melee || {};
    this._projCfg = config.projectile || {};

    this.melee = new MeleeAttack(this._meleeCfg);
    this.projectiles = [];
    this._projCooldown = 0;

    this.scores = { p1: 0, p2: 0 };
    this.winner = null;
    this.lastEvent = null;               // {type, score} for feedback/sound hooks
  }

  // ── Inputs ──────────────────────────────────────────────────────────────────

  /** Start a melee swing (respects cooldown). */
  meleeAttack() {
    if (this.winner) return false;
    return this.melee.tryStart();
  }

  /** Fire a projectile in the attacker's facing direction (respects cooldown). */
  fireProjectile() {
    if (this.winner) return false;
    if (this._projCooldown > 0) return false;
    this._projCooldown = this.cfg.projectileCooldown;
    const b = this.attacker.body;
    const dir = b.facing >= 0 ? 1 : -1;
    const x = dir >= 0 ? b.x + b.w + 2 : b.x - 2;
    const y = b.y + b.h * 0.4;
    this.projectiles.push(new Projectile(x, y, dir, this._projCfg));
    return true;
  }

  // ── Step ────────────────────────────────────────────────────────────────────

  update(dt) {
    if (this._projCooldown > 0) this._projCooldown -= dt;
    this.melee.update(dt);

    // Melee: while the swing is live and hasn't connected, test the hitbox.
    const hb = this.melee.hitbox(this.attacker.body);
    if (hb && !this.melee.connected) {
      for (const tgt of this.targets) {
        if (overlaps(hb, bodyHurtbox(tgt.body, this.cfg.hurtboxInset))) {
          this._scoreHit(tgt, 'melee');
          this.melee.markConnected();
          break;
        }
      }
    }

    // Projectiles: move, then test against targets; cull dead ones.
    for (const p of this.projectiles) {
      p.update(dt, this.collider);
      if (!p.alive) continue;
      for (const tgt of this.targets) {
        if (overlaps(p.aabb(), bodyHurtbox(tgt.body, this.cfg.hurtboxInset))) {
          this._scoreHit(tgt, 'projectile');
          p.alive = false;
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    // Hit-flash decay.
    for (const tgt of this.targets) {
      if (tgt.flash > 0) tgt.flash = Math.max(0, tgt.flash - dt);
    }
  }

  _scoreHit(tgt, type) {
    if (this.winner) return;
    tgt.hits = (tgt.hits || 0) + 1;
    tgt.flash = this.cfg.flashTime;
    this.scores.p1 += 1;
    this.lastEvent = { type, score: this.scores.p1 };
    if (this.scores.p1 >= this.cfg.target) this.winner = 'P1';
  }

  // ── Match control ─────────────────────────────────────────────────────────────

  reset() {
    this.scores = { p1: 0, p2: 0 };
    this.winner = null;
    this.projectiles = [];
    this._projCooldown = 0;
    this.lastEvent = null;
    this.melee = new MeleeAttack(this._meleeCfg);
    for (const tgt of this.targets) { tgt.hits = 0; tgt.flash = 0; }
  }

  // ── Render helpers (read-only state) ──────────────────────────────────────────

  /** Current melee hitbox AABB, or null. */
  meleeHitbox() {
    return this.melee.hitbox(this.attacker.body);
  }
}
