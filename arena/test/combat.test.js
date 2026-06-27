import assert from 'node:assert';
import { overlaps } from '../src/combat/aabb.js';
import { bodyHurtbox } from '../src/combat/Hurtbox.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';

// Pure-logic tests for Combat Prototype V1 (no DOM).

const DT = 1 / 120;
let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

function makeBody(x, y, facing = 1) {
  return { x, y, w: 24, h: 36, vx: 0, vy: 0, grounded: true, facing, anim: 'idle' };
}
// collider for projectile tests: solid cells in a Set "col,row", tile=40.
function makeCollider(solids = []) {
  const set = new Set(solids);
  return { tile: 40, isSolid: (c, r) => set.has(`${c},${r}`) };
}
function setup(p2x, opts = {}) {
  const attacker = { body: makeBody(100, 100, 1) };
  const target = { body: makeBody(p2x, 100, -1), hits: 0, flash: 0 };
  const combat = new CombatSystem({
    collider: opts.collider || makeCollider(),
    attacker,
    targets: [target],
    config: { target: opts.target ?? 20, ...opts.config },
  });
  return { combat, attacker, target };
}

// 1. aabb overlap sanity.
(function aabbTest() {
  assert.strictEqual(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.strictEqual(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 }), false);
  ok('aabb overlap detects hit/miss');
})();

// 2. Melee connects when the target is in front and within reach.
(function meleeHit() {
  const { combat, attacker } = setup(attacker_front()); // target just in front
  function attacker_front() { return 100 + 24 + 2; } // right at the body's front edge
  assert.strictEqual(combat.meleeAttack(), true, 'swing starts');
  // step through the active window
  for (let i = 0; i < 20; i++) combat.update(DT);
  assert.strictEqual(combat.scores.p1, 1, 'one hit scored');
  ok('melee hits a target in front within reach');
})();

// 3. Melee misses a target behind the attacker.
(function meleeMissBehind() {
  const { combat } = setup(40); // target to the LEFT; attacker faces right
  combat.meleeAttack();
  for (let i = 0; i < 20; i++) combat.update(DT);
  assert.strictEqual(combat.scores.p1, 0, 'no hit when target is behind');
  ok('melee misses a target behind the attacker');
})();

// 4. One swing scores at most once; cooldown blocks instant re-swing.
(function meleeCooldown() {
  const { combat } = setup(126);
  combat.meleeAttack();
  for (let i = 0; i < 20; i++) combat.update(DT); // full active window
  assert.strictEqual(combat.scores.p1, 1, 'single hit per swing');
  assert.strictEqual(combat.meleeAttack(), false, 'cannot swing again (cooldown)');
  // advance past cooldown then swing again
  for (let i = 0; i < 60; i++) combat.update(DT);
  assert.strictEqual(combat.meleeAttack(), true, 'can swing again after cooldown');
  ok('melee scores once per swing and respects cooldown');
})();

// 5. Projectile hits a target and is consumed.
(function projectileHit() {
  const { combat } = setup(300); // far to the right, clear path
  assert.strictEqual(combat.fireProjectile(), true, 'projectile fired');
  let safety = 0;
  while (combat.scores.p1 === 0 && safety++ < 600) combat.update(DT);
  assert.strictEqual(combat.scores.p1, 1, 'projectile scored a hit');
  assert.strictEqual(combat.projectiles.length, 0, 'projectile consumed on hit');
  ok('projectile travels, hits the target, and is consumed');
})();

// 6. Projectile dies on a wall before reaching the target (no score).
(function projectileWall() {
  // wall at column 4 (x 160..200); target beyond it at x=300; attacker at x=100.
  const collider = makeCollider(['4,2', '4,3']); // rows around y=100 (row 2-3 at tile40)
  const { combat } = setup(300, { collider });
  combat.fireProjectile();
  for (let i = 0; i < 600; i++) combat.update(DT);
  assert.strictEqual(combat.scores.p1, 0, 'no score: blocked by wall');
  assert.strictEqual(combat.projectiles.length, 0, 'projectile removed on wall hit');
  ok('projectile is stopped by a wall and scores nothing');
})();

// 7. FT target ends the match; further hits do not count.
(function ft20() {
  const { combat } = setup(126, { target: 3 });
  for (let s = 0; s < 5; s++) {
    combat.meleeAttack();
    for (let i = 0; i < 20; i++) combat.update(DT);
    for (let i = 0; i < 60; i++) combat.update(DT); // clear cooldown
  }
  assert.strictEqual(combat.winner, 'P1', 'winner declared at target');
  assert.strictEqual(combat.scores.p1, 3, 'score capped at FT target');
  ok('reaching the FT target declares a winner and stops scoring');
})();

// 8. Reset clears scores, winner and projectiles.
(function reset() {
  const { combat } = setup(300, { target: 1 });
  combat.fireProjectile();
  for (let i = 0; i < 600 && !combat.winner; i++) combat.update(DT);
  assert.strictEqual(combat.winner, 'P1');
  combat.reset();
  assert.strictEqual(combat.winner, null, 'winner cleared');
  assert.strictEqual(combat.scores.p1, 0, 'score cleared');
  assert.strictEqual(combat.projectiles.length, 0, 'projectiles cleared');
  ok('reset clears scores, winner and projectiles');
})();

console.log(`\nAll ${passed} combat checks passed.`);
