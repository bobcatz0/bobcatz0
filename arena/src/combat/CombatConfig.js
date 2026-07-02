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

// 1. Fake Sword (id 55) — melee. Mixed provenance (see docs/WEAPON_FUNCTION_AUDIT.md):
// the client's real melee model is a STRIKE POINT sent to the server (op 287
// mode 25) at x + tileSize/1.5 * facing, y - 10; the server resolved the hit
// (that logic is lost). We test that point against the hurtbox locally.
const TICK_RATE_ASSUMED = 30; // ticks/s — ASSUMED; only the 9-tick count is confirmed
export const FAKE_SWORD = weapon(55, {
  kind: 'melee',
  damage: 34,               // PROPOSED (server damage lost)
  reach: 40 / 1.5,          // px in front — CONFIRMED formula: tileSize / 1.5
  strikeYOffset: -10,       // px above centre — CONFIRMED (client strike point)
  swingDuration: 0.2,       // s — CONFIRMED (zswing animation length)
  cooldownTicks: 9,         // CONFIRMED (client o33 = 9 game ticks)
  cooldown: 9 / TICK_RATE_ASSUMED, // s — 9 ticks confirmed, tick RATE assumed 30/s
  provenance: {
    damage: 'PROPOSED (server-side, lost)',
    reach: 'CONFIRMED (client strike point: tileSize/1.5 in facing direction)',
    strikeYOffset: 'CONFIRMED (client: y - 10)',
    swingDuration: 'CONFIRMED (zswing 0.200s)',
    cooldown: 'CONFIRMED 9 game ticks; tick rate ASSUMED 30/s',
    note: 'NOT a real client hitbox — the client sent a strike point via op 287 mode 25; hit resolution was server-side.',
  },
});

// 2. Blue Ray Gun (id 79) — ranged, single straight shot. Gameplay numbers are
// PROPOSED (server-side lost); the VISUALS are CONFIRMED from the client
// (docs/WEAPON_FUNCTION_AUDIT.md): grey RAILGUN_PNG tinted h4(4) blue, muzzle
// at the weapon origin, blue tracer (u41=4) + type-28 laser beam timings.
export const BLUE_RAY_GUN = weapon(79, {
  kind: 'projectile',
  damage: 25,              // PROPOSED (4 hits to drop 100 HP)
  projectileSpeed: 900,    // px/s — PROPOSED (client aim-preview uses 3600; kept for feel)
  ttl: 1.2,                // s — PROPOSED
  cooldown: 0.6,           // s — PROPOSED (server-side lost)
  projW: 24,               // px — PROPOSED
  projH: 6,                // px — PROPOSED
  pellets: 1,              // single shot
  spreadDegrees: 0,
  provenance: {
    damage: 'PROPOSED (server-side, lost)',
    cooldown: 'PROPOSED (server-side, lost)',
    projectileSpeed: 'PROPOSED (client trajectory preview uses 3600 px/s — adoptable later)',
  },
});
// CONFIRMED visual identity for the Blue Ray Gun (client item table + ul effect).
BLUE_RAY_GUN.visual = {
  tintIndex: 4,                 // h4(4) blue — CONFIRMED (item table)
  muzzle: { x: 0, y: 0 },       // gun_tip on the weapon sprite — CONFIRMED (P29)
  shotColor: 4,                 // tracer tint u41 — CONFIRMED
  tracerFadeMs: 500,            // tracer yScale 3->1 fade — CONFIRMED (ul)
  laserFadeMs: 200,             // type-28 BEAM alpha .7->0 — CONFIRMED (ul)
  provenance: 'CONFIRMED (client item-definition table + ul shot effect)',
};

// 3. Shotgun (id 248) — in the hotbar, but resolution is DEFERRED.
//
// PROVENANCE / what is actually known:
//   - CONFIRMED: only the identity (id 248, name, sprite, atlas rect) from the
//     real catalog — i.e. that the Shotgun exists and is a Diggerz weapon.
//   - MISSING (server-side, lost): its damage, pellet count, spread, range and
//     cooldown. Diggerz resolved combat on the server; that logic is NOT in the
//     repo, so these numbers are NOT extracted and are deliberately absent.
//
// We will NOT invent them and will NOT claim client/server shotgun logic exists
// unless it can be shown in the decompiled client. Until then the Shotgun is
// selectable/held but inert (kind 'unimplemented' -> no resolver, no damage).
export const SHOTGUN = weapon(248, { kind: 'unimplemented' }); // combat numbers: MISSING (server-side)

// The Combat V1 loadout, in hotbar order. Sword + Ray Gun resolve; Shotgun is
// shown/selectable but not yet wired (no damage).
export const COMBAT_V1_LOADOUT = [FAKE_SWORD, BLUE_RAY_GUN, SHOTGUN];

// Lookup by catalog id.
export const WEAPON_BY_ID = Object.fromEntries(COMBAT_V1_LOADOUT.map((w) => [w.id, w]));
