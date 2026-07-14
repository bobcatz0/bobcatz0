import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { MovementController } from '../src/game/MovementController.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { FAKE_SWORD, BLUE_RAY_GUN, SHOTGUN, FIGHTER, MATCH, RESPAWN } from '../src/combat/CombatConfig.js';
import {
  swordSwingAt, swordHoldPose, SWING_DURATION, SWING_KEYS,
  swordStancePose, SWORD_IDLE_POSE, SWORD_WALK_POSE, WALK_BOB_UNITS,
} from '../src/combat/swordSwing.js';
import { BeamResolver, castBeam, FRAME_S } from '../src/combat/BeamResolver.js';
import { h4 } from '../src/render/h4Palette.js';
import { ShotFx, tracerThickness, tracerAlpha, laserAlpha, TRACER_FADE_S, LASER_FADE_S } from '../src/game/ShotFx.js';

// Combat V1 tests (pure logic, no DOM). Confirmed Diggerz weapons (Fake Sword
// id 55, Blue Ray Gun id 79); combat numbers are the PROPOSED standalone values.

const DT = 1 / 120;
const noWall = { tile: 40, isSolid: () => false };
let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

function setup(dummyX = 140) {
  const attacker = { body: MovementController.createBody(100, 100, 24, 36) };
  const dummy = { body: MovementController.createBody(dummyX, 100, 24, 36) };
  const combat = new CombatSystem({ collider: noWall, attacker, dummy });
  return { combat, attacker, dummy };
}
// aim straight right (toward the dummy)
const AIM_RIGHT = 0;

// 0. Catalog identity is the real Diggerz weapons (not invented).
(function identity() {
  assert.strictEqual(FAKE_SWORD.id, 55);
  assert.strictEqual(FAKE_SWORD.name, 'Fake Sword');
  assert.strictEqual(BLUE_RAY_GUN.id, 79);
  assert.strictEqual(BLUE_RAY_GUN.name, 'Blue Ray Gun');
  ok('weapons are the confirmed Diggerz Fake Sword (55) + Blue Ray Gun (79)');
})();

// 1. Sword hit: strike point in the target hurtbox damages the dummy.
//    (Real client strike point = centre + tile/1.5 forward = ~26.7px reach.)
(function swordHit() {
  const { combat } = setup(132); // dummy 32px away — inside the real strike reach
  assert.strictEqual(combat.selectedWeapon.id, 55, 'sword selected by default');
  const hp0 = combat.dummy.health.hp;
  combat.use(1.0, AIM_RIGHT);
  combat.update(DT, 1.0);
  assert.strictEqual(combat.dummy.health.hp, hp0 - FAKE_SWORD.combat.damage, 'dummy took sword damage');
  ok('sword hit: strike point in the hurtbox reduces dummy HP');
})();

// 1b. Sword miss: target out of reach takes no damage.
(function swordMiss() {
  const { combat } = setup(400); // far away
  combat.use(1.0, AIM_RIGHT);
  combat.update(DT, 1.0);
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'no damage out of reach');
  ok('sword miss: out-of-reach target takes no damage');
})();

// 2. Ray gun BEAM hit: the whole beam line exists at the press (NOT a traveling
//    projectile); damage lands only during the ACTIVE frames after the startup
//    muzzle shine, and at most once per beam.
(function rayGunBeamHit() {
  const { combat } = setup(180);
  combat.selectSlot(1); // number key 2 -> Blue Ray Gun
  assert.strictEqual(combat.selectedWeapon.id, 79, 'ray gun selected on slot 1');
  assert.strictEqual(BLUE_RAY_GUN.combat.kind, 'beam', 'Blue Ray Gun is a BEAM weapon');
  let now = 5.0;
  combat.use(now, AIM_RIGHT);
  const r = combat.resolvers[79];
  assert.strictEqual(r.beams.length, 1, 'the whole beam exists at the press (no projectile travel)');
  assert.strictEqual(combat.projectilesOf(79).length, 0, 'no projectiles: it is a beam');
  const hp0 = combat.dummy.health.hp;
  // startup: the muzzle shine plays, NO hitbox yet (safe margin inside 4f)
  for (let i = 0; i < 6; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, hp0, 'no damage during startup frames');
  // active: the beam line hitbox lands
  for (let i = 0; i < 10 && combat.dummy.health.hp === hp0; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, hp0 - BLUE_RAY_GUN.combat.damage, 'dummy took beam damage during the active frames');
  // once per beam — extra sim time adds no damage
  for (let i = 0; i < 60; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, hp0 - BLUE_RAY_GUN.combat.damage, 'one damage application per beam');
  ok('ray gun beam: startup shine -> short active hit (once) -> no projectile');
})();

// 2b. Ray gun beam blocked by a wall: the beam ENDS at the wall (endpoint =
//     impact) and deals no damage behind it.
(function rayGunBeamWall() {
  const wall = { tile: 40, isSolid: (c) => c === 3 }; // column 3 = x 120..160
  const attacker = { body: MovementController.createBody(100, 100, 24, 36) };
  const dummy = { body: MovementController.createBody(300, 100, 24, 36) };
  const combat = new CombatSystem({ collider: wall, attacker, dummy });
  combat.selectSlot(1);
  let now = 5;
  combat.use(now, AIM_RIGHT);
  const b = combat.resolvers[79].beams[0];
  assert.strictEqual(b.impact, true, 'beam impacted the wall');
  assert.ok(b.x2 <= 160, 'beam endpoint stops at the wall, not max range');
  for (let i = 0; i < 60; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'no damage through the wall');
  ok('ray gun beam ends on wall impact and deals no damage behind it');
})();

// 2c. Beam fires in ALL directions (8 compass angles) and hits a target on the line.
(function beamAllDirections() {
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const r = new BeamResolver(BLUE_RAY_GUN, noWall);
    const tx = 400 + Math.cos(ang) * 150, ty = 400 + Math.sin(ang) * 150;
    const target = { id: 'p2', body: { x: tx - 12, y: ty - 18, w: 24, h: 36 }, health: { alive: true } };
    let hits = 0;
    r.use(0, 400, 400, ang, 'p1');
    let now = 0;
    for (let k = 0; k < 20; k++) { now += DT; r.update(DT, [target], 2, () => hits++, now); }
    assert.strictEqual(hits, 1, `direction ${i * 45}°: exactly one hit`);
  }
  ok('beam fires and hits in all 8 directions');
})();

// 2d. Beam range cap: endpoint at exactly max range (285px, white-endpoint
//     position); a target past the cap is never hit — NO unlimited range.
(function beamRangeCap() {
  assert.strictEqual(BLUE_RAY_GUN.combat.range, 285, 'range capped at 285px (medium-range beam TEST — not the OG long raygun)');
  const r = new BeamResolver(BLUE_RAY_GUN, noWall);
  r.use(0, 0, 0, 0, 'p1');
  const b = r.beams[0];
  assert.ok(Math.abs(b.x2 - 285) < 1e-9 && Math.abs(b.y2) < 1e-9, 'endpoint at exactly max range along the aim');
  assert.strictEqual(b.impact, false, 'open air: endpoint is the range cap, not an impact');
  const far = { id: 'p2', body: { x: 320, y: -18, w: 24, h: 36 }, health: { alive: true } };
  let hits = 0, now = 0;
  for (let k = 0; k < 20; k++) { now += DT; r.update(DT, [far], 2, () => hits++, now); }
  assert.strictEqual(hits, 0, 'target past 285px is untouched (no unlimited range)');
  ok('beam ends at max range with the white endpoint there; no unlimited range');
})();

// 2e. Frame-data phases: damage ONLY during active frames — the recovery fade
//     is visual cleanup (and intentionally longer than the active window).
(function beamActiveFramesOnly() {
  const c = BLUE_RAY_GUN.combat;
  const su = c.startupFrames * FRAME_S, act = c.activeFrames * FRAME_S, rec = c.recoveryFrames * FRAME_S;
  assert.ok(c.activeFrames >= 1 && c.activeFrames <= 2, 'active window is 1-2 frames');
  assert.ok(rec > act, 'visual fade lasts LONGER than the active hit frames');
  assert.ok(Math.abs(rec - BLUE_RAY_GUN.visual.laserFadeMs / 1000) < 1e-9, 'fade = the confirmed 200ms type-28 laser fade');
  const r = new BeamResolver(BLUE_RAY_GUN, noWall);
  const target = { id: 'p2', body: { x: 138, y: -18, w: 24, h: 36 }, health: { alive: true } };
  let hits = 0;
  r.use(0, 0, 0, 0, 'p1');
  // jump straight into the recovery fade — the target on the line takes nothing
  r.update(DT, [target], 2, () => hits++, su + act + 0.01);
  assert.strictEqual(hits, 0, 'recovery/fade deals NO damage');
  assert.strictEqual(r.beams.length, 1, 'beam still rendered while fading');
  assert.strictEqual(r.phase(r.beams[0], su + act + 0.01), 'recovery', 'phase reads recovery');
  r.update(DT, [target], 2, () => hits++, su + act + rec + 0.01);
  assert.strictEqual(r.beams.length, 0, 'beam culled after the fade window');
  ok('beam damages only during active frames; the fade is visual only');
})();

// 2f. Beam cooldown gates refire (36 design frames = 0.6s PROPOSED).
(function beamCooldown() {
  const { combat } = setup(180);
  combat.selectSlot(1);
  const cd = BLUE_RAY_GUN.combat.cooldown;
  assert.strictEqual(combat.use(50.0, AIM_RIGHT), true, 'first beam fires');
  assert.strictEqual(combat.use(50.0 + cd - 0.01, AIM_RIGHT), false, 'blocked during cooldown');
  assert.strictEqual(combat.use(50.0 + cd + 0.01, AIM_RIGHT), true, 'fires again after cooldown');
  ok('beam cooldown blocks refire until it elapses');
})();

// 3. Death + score: enough sword hits kill the dummy and award P1 a kill.
(function deathAndScore() {
  const { combat } = setup(132); // within the real strike reach
  let now = 1.0;
  const hits = Math.ceil(FIGHTER.maxHealth / FAKE_SWORD.combat.damage);
  for (let h = 0; h < hits; h++) {
    combat.use(now, AIM_RIGHT);
    combat.update(DT, now);
    now += FAKE_SWORD.combat.cooldown + 0.01; // wait out cooldown
  }
  assert.strictEqual(combat.dummy.health.alive, false, 'dummy died');
  assert.strictEqual(combat.match.scores.p1, 1, 'P1 scored a kill');
  ok('death + score: lethal damage kills the dummy and adds +1 to P1');
})();

// 4. Respawn + invulnerability.
(function respawn() {
  const { combat } = setup(140);
  // kill the dummy
  combat._applyDamage(combat.dummy, FIGHTER.maxHealth, 10.0, 'p1');
  assert.strictEqual(combat.dummy.health.alive, false, 'dead');
  // not yet respawned just before delay
  combat.update(DT, 10.0 + RESPAWN.delay - 0.1);
  assert.strictEqual(combat.dummy.health.alive, false, 'still dead before delay');
  // respawns at/after delay, back at spawn, full HP
  const respawnNow = 10.0 + RESPAWN.delay + 0.01;
  combat.update(DT, respawnNow);
  assert.strictEqual(combat.dummy.health.alive, true, 'respawned');
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'full HP');
  assert.strictEqual(combat.dummy.body.x, combat.dummy.spawn.x, 'back at spawn x');
  // invulnerable right after respawn -> damage blocked
  const r = combat.dummy.health.takeDamage(50, respawnNow + 0.1);
  assert.strictEqual(r.blocked, true, 'damage blocked during spawn invulnerability');
  ok('respawn: dummy returns at spawn with full HP and brief invulnerability');
})();

// 5. FT20: reaching the kill target ends the match (winner P1).
(function ft20() {
  const { combat } = setup(140);
  let now = 0;
  for (let k = 0; k < MATCH.ftTarget; k++) {
    now += RESPAWN.delay + 0.2;   // past respawn delay -> dummy respawns (with invuln)
    combat.update(DT, now);
    now += RESPAWN.invuln + 0.2;  // past the spawn-invulnerability window
    combat._applyDamage(combat.dummy, FIGHTER.maxHealth, now, 'p1'); // lethal
  }
  assert.strictEqual(combat.match.scores.p1, MATCH.ftTarget, `P1 reached ${MATCH.ftTarget} kills`);
  assert.strictEqual(combat.match.winner, 'P1', 'winner declared at FT target');
  // further kills do not exceed the target
  combat._applyDamage(combat.dummy, FIGHTER.maxHealth, now + 5, 'p1');
  assert.strictEqual(combat.match.scores.p1, MATCH.ftTarget, 'score capped at FT target');
  ok('FT20: first to 20 kills wins and scoring stops');
})();

// 6. Reset clears scores, winner and revives the dummy.
(function reset() {
  const { combat } = setup(140);
  combat._applyDamage(combat.dummy, FIGHTER.maxHealth, 1, 'p1');
  combat.match.addKill('p1');
  combat.reset(50);
  assert.strictEqual(combat.match.winner, null, 'winner cleared');
  assert.strictEqual(combat.match.scores.p1, 0, 'score cleared');
  assert.strictEqual(combat.dummy.health.alive, true, 'dummy revived');

  // Reset must also clear weapon cooldowns: a swing then an immediate rematch
  // reset must let a fresh swing connect at the same instant (no stuck cooldown).
  const c2 = setup(140).combat;
  c2.use(100, AIM_RIGHT); c2.update(DT, 100); // swing -> on cooldown
  assert.strictEqual(c2.use(100, AIM_RIGHT), false, 'sword on cooldown right after a swing');
  c2.reset(100);
  assert.strictEqual(c2.use(100, AIM_RIGHT), true, 'reset clears the melee cooldown (fresh swing lands)');
  ok('reset clears scores/winner, revives the dummy, and clears weapon cooldowns');
})();

// 7. Held weapon follows the selected slot: the sprite ArenaScene draws in the
//    hand is `selectedWeapon.spriteKey`, so it must track number-key selection
//    (including the not-yet-wired Shotgun, which is still shown/held).
(function heldWeaponFollowsSelection() {
  const { combat } = setup(140);
  const held = () => { const w = combat.selectedWeapon; return { id: w.id, key: w.spriteKey }; };
  combat.selectSlot(0);
  assert.strictEqual(held().id, FAKE_SWORD.id, 'slot 0 holds the Fake Sword');
  combat.selectSlot(1);
  assert.strictEqual(held().id, BLUE_RAY_GUN.id, 'slot 1 holds the Blue Ray Gun');
  combat.selectSlot(2);
  assert.strictEqual(held().id, SHOTGUN.id, 'slot 2 holds the Shotgun (selectable, inert)');
  // every held weapon has a real catalog sprite to render in the hand
  for (let i = 0; i < combat.hotbar.slots.length; i++) {
    combat.selectSlot(i);
    assert.ok(combat.selectedWeapon.spriteKey, `slot ${i} has a real sprite key`);
    assert.ok(combat.selectedWeapon.rect, `slot ${i} has a real atlas rect`);
  }
  ok('held weapon follows the selected weapon (sword/ray gun/shotgun)');
})();

// ── Weapon-authenticity pass (docs/WEAPON_FUNCTION_AUDIT.md) ──────────────────

// 8. Fake Sword swing: starts on use and ends after the real 0.200s.
(function swingTiming() {
  const { combat } = setup(132);
  const r = combat.resolvers[55];
  assert.strictEqual(SWING_DURATION, 0.2, 'zswing duration is 0.200s (CONFIRMED)');
  assert.strictEqual(FAKE_SWORD.combat.swingDuration, 0.2, 'config carries the real duration');
  combat.use(10.0, AIM_RIGHT);
  assert.strictEqual(r.isSwinging(10.0), true, 'swing starts at use');
  assert.strictEqual(r.isSwinging(10.19), true, 'still swinging at 0.19s');
  assert.strictEqual(r.isSwinging(10.21), false, 'swing over after 0.200s');
  assert.ok(Math.abs(r.swingProgress(10.1) - 0.5) < 1e-9, 'progress 0.5 mid-swing');
  // real swing keyframes: rest 157.8°, overhead chop 327.5° at t=0.10, back to rest
  assert.ok(Math.abs(swordSwingAt(0).deg - 157.8) < 1e-9, 'rest = sword_pose 157.8°');
  assert.ok(Math.abs(swordSwingAt(0.10).deg - 327.5) < 1e-9, 'chop at 327.5°');
  assert.ok(Math.abs(swordSwingAt(0.20).deg - 157.8) < 1e-9, 'returns to the hold pose');
  assert.strictEqual(swordHoldPose().deg, swordSwingAt(0).deg, 'hold pose = swing rest key');
  ok('Fake Sword swing starts on use and ends after the real 0.200s (zswing keys)');
})();

// 9. Fake Sword uses the real client strike point formula (NOT a client hitbox —
//    the client sent this point via op 287 mode 25; the server resolved hits).
(function strikeFormula() {
  const { combat, attacker } = setup(132);
  const r = combat.resolvers[55];
  const b = attacker.body;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  combat.use(20.0, AIM_RIGHT); // facing right
  let sp = r.debugStrike(20.05, b);
  assert.ok(Math.abs(sp.x - (cx + 40 / 1.5)) < 1e-9, 'x = cx + tileSize/1.5 * facing (right)');
  assert.ok(Math.abs(sp.y - (cy - 10)) < 1e-9, 'y = cy - 10');
  // facing left (aim left)
  combat.use(21.0, Math.PI);
  sp = r.debugStrike(21.05, b);
  assert.ok(Math.abs(sp.x - (cx - 40 / 1.5)) < 1e-9, 'x = cx - tileSize/1.5 (facing left)');
  assert.strictEqual(FAKE_SWORD.combat.cooldownTicks, 9, 'cooldown = 9 game ticks (CONFIRMED count)');
  ok('Fake Sword uses the real strike point formula (x ± tile/1.5, y − 10)');
})();

// 10. Blue Ray Gun carries the real visual metadata: h4(4) blue tint + muzzle.
(function rayVisualMeta() {
  const v = BLUE_RAY_GUN.visual;
  assert.ok(v, 'Blue Ray Gun has a visual block');
  assert.strictEqual(v.tintIndex, 4, 'tint = h4(4) (CONFIRMED item table)');
  assert.deepStrictEqual(h4(4), [0.3, 0.3, 1], 'h4(4) is the real blue multiply');
  assert.deepStrictEqual(v.muzzle, { x: 0, y: 0 }, 'muzzle = weapon origin (CONFIRMED P29)');
  assert.strictEqual(v.shotColor, 4, 'beam colour u41 = 4 (blue)');
  assert.strictEqual(v.laserFadeMs, 200, 'type-28 laser fade 200ms (CONFIRMED ul) — the recovery fade');
  ok('Blue Ray Gun uses the real h4(4) tint + muzzle point metadata');
})();

// 11. Damage (and gun cooldown) stay marked PROPOSED — server values are lost,
//     and nothing claims the server damage/hitbox logic was recovered.
(function provenance() {
  assert.ok(FAKE_SWORD.combat.provenance.damage.startsWith('PROPOSED'), 'sword damage PROPOSED');
  assert.ok(BLUE_RAY_GUN.combat.provenance.damage.startsWith('PROPOSED'), 'ray damage PROPOSED');
  assert.ok(BLUE_RAY_GUN.combat.provenance.cooldown.startsWith('PROPOSED'), 'ray cooldown PROPOSED');
  assert.ok(FAKE_SWORD.combat.provenance.reach.startsWith('CONFIRMED'), 'strike reach CONFIRMED');
  assert.ok(FAKE_SWORD.combat.provenance.note.includes('NOT a real client hitbox'), 'strike point ≠ hitbox, stated');
  // no recovery claims: damage provenance must never read CONFIRMED
  assert.ok(!FAKE_SWORD.combat.provenance.damage.includes('CONFIRMED'), 'no sword-damage recovery claim');
  assert.ok(!BLUE_RAY_GUN.combat.provenance.damage.includes('CONFIRMED'), 'no ray-damage recovery claim');
  assert.ok(FAKE_SWORD.combat.provenance.proposedStrikeRadius.startsWith('PROPOSED'), 'strike radius PROPOSED (not extracted)');
  ok('damage stays PROPOSED standalone; no claim server damage/hitboxes were recovered');
})();

// 12. Sword cooldown: a second swing is blocked until the cooldown elapses.
(function swordCooldown() {
  const { combat } = setup(132);
  const cd = FAKE_SWORD.combat.cooldown;
  assert.strictEqual(combat.use(30.0, AIM_RIGHT), true, 'first swing fires');
  assert.strictEqual(combat.use(30.0 + cd - 0.01, AIM_RIGHT), false, 'blocked during cooldown');
  assert.strictEqual(combat.use(30.0 + cd + 0.01, AIM_RIGHT), true, 'fires again after cooldown');
  ok('sword cooldown blocks re-swing until 9 ticks (0.3s assumed) elapse');
})();

// 13. proposedStrikeRadius: PROPOSED forgiveness expands the point test; 0 = pure point.
(function strikeRadius() {
  const saved = FAKE_SWORD.combat.proposedStrikeRadius;
  // dummy just OUT of point reach: strike x = 112 + 26.67 = 138.67; hurtbox starts at dummy.x+2
  const mk = (dx) => setup(dx).combat;
  FAKE_SWORD.combat.proposedStrikeRadius = 0;
  let c = mk(141); // hurtbox [143..163] — point 138.67 misses by ~4.3px
  c.use(1.0, AIM_RIGHT); c.update(DT, 1.0);
  assert.strictEqual(c.dummy.health.hp, FIGHTER.maxHealth, 'radius 0: pure point misses');
  FAKE_SWORD.combat.proposedStrikeRadius = 6;
  c = mk(141);
  c.use(1.0, AIM_RIGHT); c.update(DT, 1.0);
  assert.strictEqual(c.dummy.health.hp, FIGHTER.maxHealth - FAKE_SWORD.combat.damage, 'radius 6: same target hits');
  FAKE_SWORD.combat.proposedStrikeRadius = saved;
  ok('proposedStrikeRadius (PROPOSED) adds forgiveness; 0 keeps the authentic point');
})();

// 14. Shot fx: tracer + laser entries with the real client timings.
(function shotFx() {
  const fx = new ShotFx();
  fx.add(0, 0, 100, 0, 4, 10.0);
  assert.strictEqual(fx.fx.length, 1, 'tracer created on shot completion');
  assert.strictEqual(fx.fx[0].tint, 4, 'tracer carries the shot colour (u41=4 blue)');
  // real timings: tracer 3->1 thickness + fade over 500ms; laser .7->0 over 200ms
  assert.strictEqual(TRACER_FADE_S, 0.5, 'tracer window 500ms (CONFIRMED)');
  assert.strictEqual(LASER_FADE_S, 0.2, 'laser window 200ms (CONFIRMED)');
  assert.strictEqual(tracerThickness(0), 3, 'tracer starts at thickness 3');
  assert.strictEqual(tracerThickness(0.5), 1, 'tracer ends at thickness 1');
  assert.ok(Math.abs(tracerAlpha(0.25) - 0.5) < 1e-9, 'tracer alpha fades linearly');
  assert.ok(Math.abs(laserAlpha(0) - 0.7) < 1e-9, 'laser starts at alpha .7');
  assert.ok(Math.abs(laserAlpha(0.1) - 0.35) < 1e-9, 'laser halfway at .35');
  assert.strictEqual(laserAlpha(0.2), 0, 'laser gone after 200ms');
  fx.update(10.49);
  assert.strictEqual(fx.fx.length, 1, 'tracer alive within 500ms');
  fx.update(10.51);
  assert.strictEqual(fx.fx.length, 0, 'tracer culled after 500ms');
  ok('tracer/beam fx created with the real client fade timings (500ms / 200ms)');
})();

// ── Shotgun V1 (docs/SHOTGUN_FUNCTION_AUDIT.md) ───────────────────────────────

// 15. Shotgun metadata matches the extracted client weapon table.
(function shotgunMeta() {
  const table = JSON.parse(readFileSync(new URL('../docs/extracted/weapon_function_table.json', import.meta.url), 'utf8'));
  const entry = table.items.find((i) => i.id === 248);
  assert.ok(entry, 'shotgun present in the extracted weapon table');
  assert.strictEqual(SHOTGUN.spriteKey, entry.sprite, 'sprite key matches the client (SHOTGUN_PNG)');
  assert.deepStrictEqual(SHOTGUN.visual.muzzle, { x: entry.gun.muzzleX, y: entry.gun.muzzleY }, 'muzzle matches P29 (-8, 28)');
  assert.strictEqual(SHOTGUN.visual.shotColor, entry.gun.shotColor, 'shot colour u41 = 26 (white)');
  assert.strictEqual(SHOTGUN.visual.tracerStyle, 'quick', 'type-26 quick tracer (no beam)');
  assert.strictEqual(SHOTGUN.combat.kind, 'projectile', 'same ray-style shot system as the Blue Ray Gun');
  ok('shotgun metadata loaded from the extracted client weapon table');
})();

// 16. Range capped at 250px (below the ray beam's 285px); provenance stays honest.
(function shotgunProvenance() {
  assert.strictEqual(SHOTGUN.combat.range, 250, 'range capped at 250px = 6.25 tiles');
  assert.ok(SHOTGUN.combat.range < BLUE_RAY_GUN.combat.range, 'shotgun stays shorter than the ray beam');
  const p = SHOTGUN.combat.provenance;
  assert.ok(p.damage.startsWith('PROPOSED'), 'damage not claimed CONFIRMED');
  assert.ok(p.range.startsWith('PROPOSED'), 'range not claimed CONFIRMED');
  assert.ok(p.spread.startsWith('UNKNOWN_SERVER_SIDE'), 'spread unknown — single ray, no invented pellets');
  assert.ok(!p.damage.includes('CONFIRMED') && !p.range.includes('CONFIRMED'), 'no false recovery claims');
  assert.ok(p.cooldown.startsWith('CONFIRMED_FROM_CLIENT'), 'cooldown ticks genuinely found (u39 case 26: o33=40)');
  assert.strictEqual(SHOTGUN.combat.cooldownTicks, 40, '40 game ticks');
  assert.strictEqual(SHOTGUN.combat.pellets, 1, 'one short ray in V1');
  ok('shotgun range capped at 250px; damage/range/spread stay PROPOSED/UNKNOWN');
})();

// 17. Shotgun hits within its range, cannot hit past it.
(function shotgunRange() {
  // within range: dummy ~214px from the muzzle (< 250)
  let { combat } = setup(340);
  combat.selectSlot(2);
  assert.strictEqual(combat.selectedWeapon.id, 248, 'shotgun selected');
  let now = 5.0;
  assert.strictEqual(combat.use(now, AIM_RIGHT), true, 'shotgun fires (no longer inert)');
  const hp0 = combat.dummy.health.hp;
  for (let i = 0; i < 80 && combat.dummy.health.hp === hp0; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, hp0 - SHOTGUN.combat.damage, 'hits within 250px');
  assert.strictEqual(combat.projectilesOf(248).length, 0, 'ray consumed on hit');
  // beyond range: dummy ~334px from the muzzle (> 250) — the ray expires short
  ({ combat } = setup(460));
  combat.selectSlot(2);
  now = 10.0;
  combat.use(now, AIM_RIGHT);
  for (let i = 0; i < 120; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'cannot hit past the configured range');
  assert.strictEqual(combat.projectilesOf(248).length, 0, 'ray expired at range');
  ok('shotgun hits within 250px and cannot hit beyond its range');
})();

// 18. Shotgun is blocked by walls; range knob is live per shot.
(function shotgunWallAndKnob() {
  const wall = { tile: 40, isSolid: (c) => c === 4 }; // column 4 = x 160..200
  const attacker = { body: MovementController.createBody(100, 100, 24, 36) };
  const dummy = { body: MovementController.createBody(300, 100, 24, 36) };
  const combat = new CombatSystem({ collider: wall, attacker, dummy });
  combat.selectSlot(2);
  let now = 5;
  combat.use(now, AIM_RIGHT);
  for (let i = 0; i < 80; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'wall blocks the shotgun ray');
  // live range knob: shrink range -> the same in-range target is now out of reach
  const saved = SHOTGUN.combat.range;
  SHOTGUN.combat.range = 100;
  const c2 = setup(340).combat;
  c2.selectSlot(2);
  let n2 = 20;
  c2.use(n2, AIM_RIGHT);
  for (let i = 0; i < 120; i++) { n2 += DT; c2.update(DT, n2); }
  assert.strictEqual(c2.dummy.health.hp, FIGHTER.maxHealth, 'shrunk range (tuning knob) misses the same target');
  SHOTGUN.combat.range = saved;
  ok('shotgun respects walls; the range knob applies per shot');
})();

// ── Fake Sword held stances (owner spec: low diagonal guard) ──────────────────

// 19. Idle stance: blade diagonally DOWNWARD across the front, tip down-forward;
//     compact hold near the torso; NOT the old over-the-shoulder rest, NOT a
//     swing key. (Sprite blade = local -x, so on-screen blade tip direction =
//     (-cos deg, -sin deg), canvas y down, facing right.)
(function swordIdleStance() {
  const idle = swordStancePose(false);
  assert.deepStrictEqual(idle, SWORD_IDLE_POSE, 'idle stance = the low diagonal guard pose');
  const rad = (idle.deg * Math.PI) / 180;
  const tip = { x: -Math.cos(rad), y: -Math.sin(rad) };
  assert.ok(tip.x > 0.2, 'blade tip points FORWARD');
  assert.ok(tip.y > 0.2, 'blade tip points DOWN (low guard, not horizontal, not overhead)');
  assert.ok(Math.abs(tip.x) < 0.95 && Math.abs(tip.y) < 0.95, 'diagonal — not straight out, not straight down');
  assert.ok(idle.dx > 0 && idle.dx < 20, 'sword held in front, close to the torso (compact)');
  assert.ok(idle.dy > 10 && idle.dy < 40, 'hand/centre around the waist/chest, held LOW');
  assert.notStrictEqual(idle.deg, swordHoldPose().deg, 'NOT the old over-the-shoulder sword_pose rest');
  for (const k of SWING_KEYS) assert.notStrictEqual(idle.deg, k.deg, 'idle stance is not a zswing key (no attack anticipation)');
  assert.strictEqual(idle.behind, false, 'guard renders in FRONT of the body');
  ok('Fake Sword idle = low diagonal guard (tip down-forward, compact, in front)');
})();

// 20. Walk stance: same compact hold, blade diagonally forward/UPWARD; the
//     weapon only BOBS with the walk cycle — no rotation, no zswing.
(function swordWalkStance() {
  const walk = swordStancePose(true, 0);
  const rad = (walk.deg * Math.PI) / 180;
  const tip = { x: -Math.cos(rad), y: -Math.sin(rad) };
  assert.ok(tip.x > 0.2, 'blade tip points FORWARD while walking');
  assert.ok(tip.y < -0.2, 'blade tip points UP (diagonal forward/upward)');
  assert.ok(walk.dx > 0 && walk.dx < 20, 'carried in front, arm bent close to the torso');
  assert.strictEqual(walk.behind, false, 'carried in front of the body');
  for (const k of SWING_KEYS) assert.notStrictEqual(walk.deg, k.deg, 'walk stance is not a zswing key');
  // bob: dy varies slightly over the walk cycle; deg NEVER rotates
  let minDy = Infinity, maxDy = -Infinity;
  for (let t = 0; t < 1.0; t += 0.02) {
    const p = swordStancePose(true, t);
    assert.strictEqual(p.deg, SWORD_WALK_POSE.deg, 'no wild rotation during the walk');
    minDy = Math.min(minDy, p.dy); maxDy = Math.max(maxDy, p.dy);
  }
  assert.ok(maxDy - minDy > 0, 'weapon bobs with the walk cycle');
  assert.ok(maxDy - minDy <= WALK_BOB_UNITS + 1e-9, 'bob is slight (bounded)');
  ok('Fake Sword walk = compact hold, blade up-forward, slight bob, never zswing');
})();

console.log(`\nAll ${passed} combat checks passed.`);
