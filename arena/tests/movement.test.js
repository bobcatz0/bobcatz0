import assert from 'node:assert';
import { buildArenaMap } from '../src/game/arenaMap.js';
import { TileCollision } from '../src/game/TileCollision.js';
import { MovementController } from '../src/game/MovementController.js';

// Pure-logic test of the movement feel (no DOM). Proves gravity, landing,
// horizontal accel, jumping, wall collision, facing and animation states.

const map = buildArenaMap(40);
const collider = new TileCollision(map);
const mc = new MovementController();
const DT = 1 / 120;

const FLOOR_TOP = map.floorRow * map.tileSize; // top of the (now 2-tile) floor
const PLAYER_H = 36;
const RESTING_Y = FLOOR_TOP - PLAYER_H;

const NONE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const RIGHT = { left: false, right: true, jumpHeld: false, jumpPressed: false };
const LEFT = { left: true, right: false, jumpHeld: false, jumpPressed: false };

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };
const body = (x, y) => MovementController.createBody(x, y, 24, PLAYER_H);

function run(b, input, seconds) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) mc.step(b, input, DT, collider);
}

// 1. Gravity + landing
(function gravity() {
  const b = body(80, 200);
  run(b, NONE, 2.0);
  assert.strictEqual(b.grounded, true, 'grounded after falling');
  assert.ok(Math.abs(b.vy) < 1, `vy settled (${b.vy})`);
  assert.ok(Math.abs(b.y - RESTING_Y) < 0.5, `rests on floor (y=${b.y}, want ${RESTING_Y})`);
  ok('gravity pulls the player down and it lands on the floor');
})();

// 2. Horizontal movement
(function horizontal() {
  const b = body(80, RESTING_Y);
  run(b, NONE, 0.05);
  const x0 = b.x;
  run(b, RIGHT, 0.5);
  assert.ok(b.vx > 0, `vx positive (${b.vx})`);
  assert.ok(b.vx <= mc.cfg.moveSpeed + 0.001, `vx capped at moveSpeed (${b.vx})`);
  assert.ok(b.x > x0 + 30, `moved right (${x0} -> ${b.x})`);
  assert.strictEqual(b.facing, 1, 'facing right');
  ok('horizontal input accelerates to top speed and moves right');
})();

// 3. Jump
(function jump() {
  const b = body(80, RESTING_Y);
  run(b, NONE, 0.05);
  assert.strictEqual(b.grounded, true, 'grounded before jump');

  mc.step(b, { left: false, right: false, jumpHeld: true, jumpPressed: true }, DT, collider);
  assert.ok(b.vy < -400, `launched upward (vy=${b.vy})`);
  assert.strictEqual(b.grounded, false, 'airborne after jump');
  assert.strictEqual(b.anim, 'jump', 'anim is jump while rising');

  const apexY = b.y;
  run(b, { left: false, right: false, jumpHeld: true, jumpPressed: false }, 0.15);
  assert.ok(b.y < apexY, `rose above launch point (${apexY} -> ${b.y})`);

  run(b, NONE, 1.5);
  assert.strictEqual(b.grounded, true, 'landed again');
  assert.ok(Math.abs(b.y - RESTING_Y) < 0.5, 'back on the floor');
  ok('jump launches up, rises, and lands back on the floor');
})();

// 4. Wall collision
(function wall() {
  const b = body(60, RESTING_Y);
  run(b, NONE, 0.05);
  run(b, LEFT, 1.0);
  const wallRight = map.tileSize;
  assert.ok(b.x >= wallRight - 0.001, `stopped at wall (x=${b.x}, wall=${wallRight})`);
  assert.ok(Math.abs(b.vx) < 0.001, `horizontal velocity killed on impact (vx=${b.vx})`);
  ok('player collides with walls and cannot pass through');
})();

// 5. Facing
(function facing() {
  const b = body(200, RESTING_Y);
  run(b, NONE, 0.05);
  run(b, LEFT, 0.1);
  assert.strictEqual(b.facing, -1, 'faces left');
  run(b, RIGHT, 0.1);
  assert.strictEqual(b.facing, 1, 'faces right');
  ok('facing direction tracks input');
})();

// 6. Animation states (use the open left column so the jump is unobstructed).
(function anim() {
  const b = body(80, RESTING_Y);
  run(b, NONE, 0.3);
  assert.strictEqual(b.anim, 'idle', 'idle when still on ground');

  run(b, RIGHT, 0.3);
  assert.strictEqual(b.anim, 'run', 'run when moving on ground');

  // Jump straight up from a clear column (no horizontal drift into platforms).
  const j = body(80, RESTING_Y);
  run(j, NONE, 0.05);
  mc.step(j, { left: false, right: false, jumpHeld: true, jumpPressed: true }, DT, collider);
  assert.strictEqual(j.anim, 'jump', 'jump while rising');

  run(j, { left: false, right: false, jumpHeld: true, jumpPressed: false }, 0.4);
  assert.strictEqual(j.anim, 'fall', 'fall while descending');
  ok('animation state values reflect idle / run / jump / fall');
})();

console.log(`\nAll ${passed} movement checks passed.`);
