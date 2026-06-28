import assert from 'node:assert';
import { MovementController } from '../src/game/MovementController.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { FAKE_SWORD, BLUE_RAY_GUN, FIGHTER, MATCH, RESPAWN } from '../src/combat/CombatConfig.js';

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

// 1. Sword hit: melee swing in reach damages the dummy.
(function swordHit() {
  const { combat } = setup(140); // ~40px away, within sword reach (46)
  assert.strictEqual(combat.selectedWeapon.id, 55, 'sword selected by default');
  const hp0 = combat.dummy.health.hp;
  combat.use(1.0, AIM_RIGHT);
  combat.update(DT, 1.0);
  assert.strictEqual(combat.dummy.health.hp, hp0 - FAKE_SWORD.combat.damage, 'dummy took sword damage');
  ok('sword hit: melee swing in reach reduces dummy HP');
})();

// 1b. Sword miss: target out of reach takes no damage.
(function swordMiss() {
  const { combat } = setup(400); // far away
  combat.use(1.0, AIM_RIGHT);
  combat.update(DT, 1.0);
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'no damage out of reach');
  ok('sword miss: out-of-reach target takes no damage');
})();

// 2. Ray gun hit: projectile travels and damages the dummy.
(function rayGunHit() {
  const { combat } = setup(180);
  combat.selectWheel(1); // wheel to Blue Ray Gun
  assert.strictEqual(combat.selectedWeapon.id, 79, 'ray gun selected after wheel');
  let now = 5.0;
  combat.use(now, AIM_RIGHT);
  const hp0 = combat.dummy.health.hp;
  for (let i = 0; i < 60 && combat.dummy.health.hp === hp0; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, hp0 - BLUE_RAY_GUN.combat.damage, 'dummy took ray gun damage');
  assert.strictEqual(combat.projectilesOf(79).length, 0, 'projectile consumed on hit');
  ok('ray gun hit: projectile travels, hits, and is consumed');
})();

// 2b. Ray gun blocked by a wall (no damage).
(function rayGunWall() {
  const wall = { tile: 40, isSolid: (c) => c === 3 }; // column 3 = x 120..160
  const attacker = { body: MovementController.createBody(100, 100, 24, 36) };
  const dummy = { body: MovementController.createBody(300, 100, 24, 36) };
  const combat = new CombatSystem({ collider: wall, attacker, dummy });
  combat.selectWheel(1);
  let now = 5;
  combat.use(now, AIM_RIGHT);
  for (let i = 0; i < 120; i++) { now += DT; combat.update(DT, now); }
  assert.strictEqual(combat.dummy.health.hp, FIGHTER.maxHealth, 'no damage: blocked by wall');
  assert.strictEqual(combat.projectilesOf(79).length, 0, 'projectile died on wall');
  ok('ray gun blocked by a wall deals no damage');
})();

// 3. Death + score: enough sword hits kill the dummy and award P1 a kill.
(function deathAndScore() {
  const { combat } = setup(140);
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
  ok('reset clears scores/winner and revives the dummy');
})();

console.log(`\nAll ${passed} combat checks passed.`);
