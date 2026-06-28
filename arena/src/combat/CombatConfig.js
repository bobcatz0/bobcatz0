/**
 * CombatConfig — Combat V1 tuning.
 *
 * IMPORTANT PROVENANCE:
 *   - Weapon IDENTITY (id, name, sprite, category) is CONFIRMED from the real
 *     Diggerz client/assets (see DiggerzWeaponCatalog).
 *   - Every NUMBER below (damage, reach, cooldown, projectile speed, health,
 *     respawn, invuln, FT target) is a *** PROPOSED standalone PvP value ***,
 *     NOT extracted from Diggerz. The original server combat logic is gone.
 *
 * All values live here so they can be tuned without touching combat logic.
 */

import { byId } from '../diggerz/DiggerzWeaponCatalog.js';

// ── Fighter / match (PROPOSED) ───────────────────────────────────────────────
export const FIGHTER = {
  maxHealth: 100,          // PROPOSED
  hurtboxInset: 2,         // px, PROPOSED
};

export const MATCH = {
  ftTarget: 20,            // FT20 — first to 20 KILLS (PROPOSED rule set)
};

export const RESPAWN = {
  delay: 1.5,              // s before a dead fighter respawns — PROPOSED
  invuln: 1.0,             // s of spawn protection — PROPOSED
};

// ── Weapons (Combat V1) ──────────────────────────────────────────────────────
// Identity from the confirmed catalog; `combat` block is PROPOSED.
function weapon(id, combat) {
  const c = byId(id);
  if (!c) throw new Error(`weapon id ${id} not in DiggerzWeaponCatalog`);
  return {
    id: c.id,
    name: c.name,            // CONFIRMED (real Diggerz name)
    spriteKey: c.spriteKey,  // CONFIRMED
    rect: c.rect,            // CONFIRMED
    category: c.category,    // INFERRED (catalog)
    combat,                  // PROPOSED standalone values
  };
}

// 1. Fake Sword (id 55) — melee. PROPOSED values.
export const FAKE_SWORD = weapon(55, {
  kind: 'melee',
  damage: 34,              // PROPOSED (3 hits to drop 100 HP)
  reach: 46,               // px in front — PROPOSED
  arcDegrees: 70,          // swing arc around aim — PROPOSED
  activeTime: 0.12,        // s the hitbox is live — PROPOSED
  cooldown: 0.45,          // s between swings — PROPOSED
});

// 2. Blue Ray Gun (id 79) — ranged, single straight shot. PROPOSED values.
export const BLUE_RAY_GUN = weapon(79, {
  kind: 'projectile',
  damage: 25,              // PROPOSED (4 hits to drop 100 HP)
  projectileSpeed: 900,    // px/s — PROPOSED
  ttl: 1.2,                // s — PROPOSED
  cooldown: 0.6,           // s — PROPOSED
  projW: 24,               // px — PROPOSED
  projH: 6,                // px — PROPOSED
  pellets: 1,              // single shot
  spreadDegrees: 0,
});

// 3. Shotgun (id 248) — in the hotbar, but resolution is DEFERRED.
// Per the request, the shotgun's firing shape (pellet count / spread) will come
// from the real client's shotgun functions in diggerz_v-203.js, not invented —
// so it is selectable but does not resolve yet (kind 'unimplemented').
export const SHOTGUN = weapon(248, { kind: 'unimplemented' });

// The Combat V1 loadout, in hotbar order. Sword + Ray Gun resolve; Shotgun is
// shown/selectable but not yet wired (no damage).
export const COMBAT_V1_LOADOUT = [FAKE_SWORD, BLUE_RAY_GUN, SHOTGUN];

// Lookup by catalog id.
export const WEAPON_BY_ID = Object.fromEntries(COMBAT_V1_LOADOUT.map((w) => [w.id, w]));
