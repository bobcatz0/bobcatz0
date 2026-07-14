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
  // Playability knob: the strike point is tested against the hurtbox EXPANDED
  // by this radius (px). 0 = the pure authentic point. NOT extracted from
  // Diggerz — the server's real tolerance/hit logic is lost, so this is a
  // PROPOSED standalone forgiveness value, tunable in the playtest panel.
  proposedStrikeRadius: 6,  // px — PROPOSED (not extracted)
  provenance: {
    damage: 'PROPOSED (server-side, lost)',
    reach: 'CONFIRMED (client strike point: tileSize/1.5 in facing direction)',
    strikeYOffset: 'CONFIRMED (client: y - 10)',
    swingDuration: 'CONFIRMED (zswing 0.200s)',
    cooldown: 'CONFIRMED 9 game ticks; tick rate ASSUMED 30/s',
    proposedStrikeRadius: 'PROPOSED (not extracted — server hit tolerance unknown)',
    note: 'NOT a real client hitbox — the client sent a strike point via op 287 mode 25; hit resolution was server-side.',
  },
});

// 2. Blue Ray Gun (id 79) — BEAM weapon (docs/FRAME_DATA_TERMINOLOGY.md): the
// whole beam line exists muzzle -> max range/impact, in frame-data phases
// (startup shine -> 1-2f active line hitbox -> fading recovery). NOT a
// traveling projectile. Gameplay numbers are PROPOSED (server-side lost); the
// VISUALS are CONFIRMED from the client (docs/WEAPON_FUNCTION_AUDIT.md): grey
// RAILGUN_PNG tinted h4(4) blue, muzzle at the weapon origin, blue tracer
// (u41=4) + type-28 laser beam timings.
export const BLUE_RAY_GUN = weapon(79, {
  kind: 'beam',
  damage: 25,              // PROPOSED (4 hits to drop 100 HP)
  range: 285,              // px ≈ 7.1 tiles — PROPOSED_STANDALONE "medium-range
                           // beam test" cap. NOT the OG long-range raygun (that
                           // would be a much longer beam with much lower damage,
                           // later). Close to the Shotgun's 250px on purpose,
                           // for this test only.
  startupFrames: 4,        // design frames @60 — muzzle shine/flash, NO hitbox yet (PROPOSED)
  activeFrames: 2,         // beam line hitbox exists 1-2 frames only (PROPOSED)
  recoveryFrames: 12,      // beam fades on screen — VISUAL ONLY, no damage.
                           // 12f = 0.2s = the CONFIRMED type-28 laser fade,
                           // intentionally longer than the active window.
  cooldown: 0.6,           // s = 36 design frames — PROPOSED (client shows 50 ticks; not adopted)
  provenance: {
    damage: 'PROPOSED (server-side, lost)',
    cooldown: 'PROPOSED (server-side, lost)',
    range: 'PROPOSED_STANDALONE 285px medium-range beam test — not the OG long-range raygun (longer beam, much lower damage, later)',
    frames: 'PROPOSED_STANDALONE frame data (startup/active); recovery length = the CONFIRMED 200ms type-28 laser fade',
  },
});
// CONFIRMED visual identity for the Blue Ray Gun (client item table + ul effect).
BLUE_RAY_GUN.visual = {
  tintIndex: 4,                 // h4(4) blue — CONFIRMED (item table)
  muzzle: { x: 0, y: 0 },       // gun_tip on the weapon sprite — CONFIRMED (P29)
  shotColor: 4,                 // beam tint u41 — CONFIRMED
  laserFadeMs: 200,             // type-28 BEAM alpha .7->0 — CONFIRMED (ul); = recoveryFrames
  provenance: 'CONFIRMED (client item-definition table + ul shot effect)',
};

// 3. Shotgun (id 248) — V1, per docs/SHOTGUN_FUNCTION_AUDIT.md.
// CONFIRMED_FROM_CLIENT: same gun class as the ray guns (tm), straight shot
// (gravity 0), fires op 287 mode 26 from the gun_tip muzzle, cooldown 40 game
// ticks, thin WHITE quick-fade tracer (h4(26) untinted, no beam).
// UNKNOWN_SERVER_SIDE: range, damage, pellets/spread — V1 uses a single short
// ray with PROPOSED_STANDALONE numbers (range default = owner recollection).
export const SHOTGUN = weapon(248, {
  kind: 'projectile',
  damage: 40,              // PROPOSED_STANDALONE (close-range reward)
  projectileSpeed: 900,    // px/s — PROPOSED_STANDALONE (client preview uses 3600)
  range: 250,              // px = 6.25 tiles — PROPOSED_STANDALONE cap (owner:
                           // capped to 250px, kept below the ray beam's 285px;
                           // earlier "~7 tiles" recollection was 280px)
  cooldownTicks: 40,       // CONFIRMED_FROM_CLIENT (u39 case 26: o33 = 40)
  cooldown: 40 / TICK_RATE_ASSUMED, // s — 40 ticks confirmed, tick RATE assumed 30/s
  projW: 18,               // px — PROPOSED_STANDALONE
  projH: 5,                // px — PROPOSED_STANDALONE
  pellets: 1,              // single ray — spread/pellets UNKNOWN_SERVER_SIDE
  spreadDegrees: 0,
  provenance: {
    damage: 'PROPOSED_STANDALONE (server-side, lost)',
    range: 'PROPOSED_STANDALONE cap 250px = 6.25 tiles (owner-set test value; not in client)',
    cooldown: 'CONFIRMED_FROM_CLIENT 40 game ticks; tick rate ASSUMED 30/s',
    spread: 'UNKNOWN_SERVER_SIDE — single ray in V1, no pellets without evidence',
    projectileSpeed: 'PROPOSED_STANDALONE (client aim preview uses 3600 px/s)',
  },
});
// CONFIRMED visual identity (client item table + u39 fire case + ul effect).
SHOTGUN.visual = {
  tintIndex: null,              // h4(26) = untinted — CONFIRMED_FROM_CLIENT
  muzzle: { x: -8, y: 28 },     // gun_tip on the weapon sprite — CONFIRMED_FROM_CLIENT (P29)
  shotColor: 26,                // white tracer — CONFIRMED_FROM_CLIENT
  tracerStyle: 'quick',         // type-26: alpha .7->0 over 200ms, thin, NO beam — CONFIRMED_FROM_CLIENT
  provenance: 'CONFIRMED_FROM_CLIENT (item table case 248 + u39 case 26 + ul type-26 effect)',
};

// The Combat V1 loadout, in hotbar order. All three weapons resolve.
export const COMBAT_V1_LOADOUT = [FAKE_SWORD, BLUE_RAY_GUN, SHOTGUN];

// Lookup by catalog id.
export const WEAPON_BY_ID = Object.fromEntries(COMBAT_V1_LOADOUT.map((w) => [w.id, w]));
