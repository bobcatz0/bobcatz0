/**
 * CombatSystem — Combat V1 orchestration (pure / headless, per the design's
 * authority model: runs locally now, same resolver usable server-side later).
 *
 * Confirmed from Diggerz: weapon roster (Fake Sword id 55, Blue Ray Gun id 79),
 * hotbar selection (wheel), left-mouse use, mouse aim. PROPOSED standalone: all
 * combat numbers (CombatConfig). No client-trusted damage — the resolver here
 * is the single source of truth.
 *
 * Time is passed in (sim seconds + dt); no Date.now / no DOM.
 */

import { Hotbar } from '../diggerz/ItemSystem.js';
import { Health } from './Health.js';
import { MeleeResolver } from './MeleeResolver.js';
import { ProjectileResolver } from './ProjectileResolver.js';
import { MatchState } from './MatchState.js';
import { FIGHTER, MATCH, RESPAWN, COMBAT_V1_LOADOUT } from './CombatConfig.js';

export class CombatSystem {
  constructor({ collider, attacker, dummy }) {
    this.collider = collider;

    const mkHealth = () => new Health({
      maxHealth: FIGHTER.maxHealth,
      respawnDelay: RESPAWN.delay,
      invuln: RESPAWN.invuln,
    });

    // P1 attacker (uses the PlayerController body) and the P2 dummy.
    this.attacker = { id: 'p1', body: attacker.body, health: mkHealth() };
    this.dummy = { id: 'p2', body: dummy.body, health: mkHealth(), spawn: { x: dummy.body.x, y: dummy.body.y } };

    // Hotbar = the confirmed loadout (Fake Sword, Blue Ray Gun); wheel selects.
    this.hotbar = new Hotbar(COMBAT_V1_LOADOUT.slice());

    // One resolver per weapon id (only for weapons that resolve in V1).
    this.resolvers = {};
    for (const w of COMBAT_V1_LOADOUT) {
      if (w.combat.kind === 'melee') this.resolvers[w.id] = new MeleeResolver(w);
      else if (w.combat.kind === 'projectile') this.resolvers[w.id] = new ProjectileResolver(w, collider);
      // 'unimplemented' (e.g. Shotgun) -> no resolver, no damage yet.
    }

    this.match = new MatchState({ ftTarget: MATCH.ftTarget });
    this.lastEvent = null;
  }

  get selectedWeapon() { return this.hotbar.selectedItem; }

  // ── Inputs ──────────────────────────────────────────────────────────────────

  selectWheel(dir) { if (dir !== 0) this.hotbar.scroll(dir); }
  selectSlot(i) { this.hotbar.select(i); }

  /** Use the selected weapon toward `aimAngle` from the attacker. */
  use(now, aimAngle) {
    if (this.match.winner || !this.attacker.health.alive) return false;
    const w = this.selectedWeapon;
    const r = this.resolvers[w.id];
    if (!r) { this.lastEvent = { type: 'unimplemented', weapon: w.name }; return false; } // e.g. Shotgun
    if (w.combat.kind === 'melee') {
      // Real client melee is facing-based (strike point in the facing
      // direction), so the aim only picks which way the swing faces.
      return r.use(now, Math.cos(aimAngle) >= 0 ? 1 : -1);
    }
    // projectile muzzle: from attacker centre, nudged toward the aim
    const b = this.attacker.body;
    const cx = b.x + b.w / 2 + Math.cos(aimAngle) * (b.w / 2 + 4);
    const cy = b.y + b.h * 0.4 + Math.sin(aimAngle) * (b.w / 2 + 4);
    return r.use(now, cx, cy, aimAngle, this.attacker.id);
  }

  // ── Step ────────────────────────────────────────────────────────────────────

  update(dt, now) {
    const targets = [this.dummy]; // P1 attacks the dummy (V1)

    const onHit = (target, damage) => this._applyDamage(target, damage, now, 'p1');

    // Melee swing resolution (selected or not — a swing in flight still resolves).
    for (const w of COMBAT_V1_LOADOUT) {
      const r = this.resolvers[w.id];
      if (!r) continue; // unimplemented weapon (Shotgun)
      if (w.combat.kind === 'melee') r.resolve(now, this.attacker.body, targets, FIGHTER.hurtboxInset, onHit);
      else r.update(dt, targets, FIGHTER.hurtboxInset, onHit);
    }

    // Respawn timers; reposition the dummy on respawn.
    if (this.dummy.health.update(now)) this._respawn(this.dummy);
    this.attacker.health.update(now);
  }

  _applyDamage(target, damage, now, scorerId) {
    const res = target.health.takeDamage(damage, now);
    if (res.died) {
      const ended = this.match.addKill(scorerId);
      this.lastEvent = { type: 'kill', scorer: scorerId, ended };
    } else if (res.damaged) {
      this.lastEvent = { type: 'hit', target: target.id, damage };
    }
  }

  _respawn(fighter) {
    if (fighter.spawn) { fighter.body.x = fighter.spawn.x; fighter.body.y = fighter.spawn.y; }
  }

  // ── Match control ──────────────────────────────────────────────────────────

  reset(now = 0) {
    this.match.reset();
    this.attacker.health.reset(now);
    this.dummy.health.reset(now);
    this._respawn(this.dummy);
    for (const id in this.resolvers) {
      const r = this.resolvers[id];
      if (r.clear) r.clear();
    }
    this.lastEvent = null;
  }

  // ── Render state (read-only) ───────────────────────────────────────────────

  projectilesOf(weaponId) {
    const r = this.resolvers[weaponId];
    return r.projectiles || [];
  }
}
