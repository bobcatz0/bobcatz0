'use strict';

/**
 * Tests for the reusable MovementValidator. Run with:  npm test
 */

const assert = require('assert');
const MovementValidator = require('../src/movement/MovementValidator');

let passed = 0;
function ok(label) { console.log('  ok -', label); passed++; }

// Helper: a validator with small, easy-to-reason-about limits.
function makeValidator(extra = {}) {
  return new MovementValidator({
    minX: 0, maxX: 100,
    minY: 0, maxY: 100,
    maxHorizontalSpeed: 10,    // units/sec
    maxVerticalSpeed: 10,
    maxTeleportDistance: 8,
    rateLimitWindowMs: 1000,
    rateLimitMaxPackets: 5,
    suspicionFlagThreshold: 3,
    suspicionDecayPerSecond: 0, // disable decay for deterministic tests
    ...extra,
  });
}

// 1. Normal movement is accepted unchanged.
(function testNormal() {
  const v = makeValidator();
  const s = v.createState(50, 50);
  let t = 1000;
  v.check(s, { x: 50, y: 50, vx: 0, vy: 0 }, t); // baseline
  t += 100; // 0.1s -> max 1 unit/axis
  const r = v.check(s, { x: 50.5, y: 50, vx: 5, vy: 0 }, t);
  assert.strictEqual(r.accepted, true);
  assert.strictEqual(r.corrected, false);
  assert.strictEqual(r.x, 50.5, 'x unchanged');
  assert.strictEqual(r.violations.length, 0);
  ok('normal movement accepted unchanged');
})();

// 2. Horizontal overspeed is clamped.
(function testHSpeed() {
  const v = makeValidator();
  const s = v.createState(50, 50);
  let t = 1000;
  v.check(s, { x: 50, y: 50 }, t);
  t += 100; // 0.1s -> max 1 unit horizontally
  const r = v.check(s, { x: 60, y: 50 }, t); // tried to move 10 units
  assert.ok(r.violations.includes('h_speed'), 'h_speed flagged');
  assert.strictEqual(r.corrected, true);
  assert.ok(r.x <= 51.0001 && r.x >= 50.9999, `x clamped to ~51, got ${r.x}`);
  ok('horizontal overspeed clamped');
})();

// 3. Vertical overspeed is clamped.
(function testVSpeed() {
  const v = makeValidator();
  const s = v.createState(50, 50);
  let t = 1000;
  v.check(s, { x: 50, y: 50 }, t);
  t += 100;
  const r = v.check(s, { x: 50, y: 70 }, t);
  assert.ok(r.violations.includes('v_speed'), 'v_speed flagged');
  assert.ok(r.y <= 51.0001, `y clamped, got ${r.y}`);
  ok('vertical overspeed clamped');
})();

// 4. Teleport distance is clamped (large dt, within speed but huge jump).
(function testTeleport() {
  const v = makeValidator();
  const s = v.createState(10, 10);
  let t = 1000;
  v.check(s, { x: 10, y: 10 }, t);
  t += 500; // 0.5s -> per-axis cap 5 units, but euclidean teleport cap is 8
  const r = v.check(s, { x: 15, y: 15 }, t); // dist ~7.07 within axis caps...
  // here both axes (5,5) are within 0.5s*10=5 cap, euclid 7.07 < 8 -> accepted
  assert.ok(!r.violations.includes('teleport'), 'within teleport cap accepted');
  // now force a teleport: bump caps so axis clamp does not pre-limit
  const v2 = makeValidator({ maxHorizontalSpeed: 1000, maxVerticalSpeed: 1000 });
  const s2 = v2.createState(10, 10);
  v2.check(s2, { x: 10, y: 10 }, 1000);
  const r2 = v2.check(s2, { x: 100, y: 100 }, 1100); // dist ~127 >> 8
  assert.ok(r2.violations.includes('teleport'), 'teleport flagged');
  const dist = Math.hypot(r2.x - 10, r2.y - 10);
  assert.ok(dist <= 8.0001, `teleport clamped to <=8, got ${dist}`);
  ok('teleport distance clamped');
})();

// 5. Out-of-bounds is clamped into the world.
(function testBounds() {
  const v = makeValidator({ maxHorizontalSpeed: 1e9, maxVerticalSpeed: 1e9, maxTeleportDistance: 1e9 });
  const s = v.createState(50, 50);
  v.check(s, { x: 50, y: 50 }, 1000);
  const r = v.check(s, { x: 150, y: -30 }, 1100);
  assert.ok(r.violations.includes('out_of_bounds'), 'oob flagged');
  assert.strictEqual(r.x, 100, 'x clamped to maxX');
  assert.strictEqual(r.y, 0, 'y clamped to minY');
  ok('out-of-bounds clamped');
})();

// 6. Impossible coordinates (NaN / Infinity) are ignored; player frozen.
(function testImpossible() {
  const v = makeValidator();
  const s = v.createState(50, 50);
  v.check(s, { x: 50, y: 50 }, 1000);
  const r = v.check(s, { x: NaN, y: Infinity, vx: 0, vy: 0 }, 1100);
  assert.strictEqual(r.accepted, false, 'not accepted');
  assert.ok(r.violations.includes('impossible'), 'impossible flagged');
  assert.strictEqual(r.x, 50, 'x stays at last good');
  assert.strictEqual(r.y, 50, 'y stays at last good');
  ok('impossible coordinates ignored (player frozen)');
})();

// 7. Rate limiting drops excess packets.
(function testRateLimit() {
  const v = makeValidator(); // max 5 packets / 1000ms
  const s = v.createState(0, 0);
  let dropped = 0;
  for (let i = 0; i < 8; i++) {
    const r = v.check(s, { x: 0, y: 0 }, 1000 + i); // all within the same window
    if (r.dropped) dropped++;
  }
  assert.ok(dropped >= 3, `at least 3 packets dropped, got ${dropped}`);
  ok('rate limit drops excess packets');
})();

// 8. Suspicion accrues and flags for review (no instant ban).
(function testFlag() {
  const v = makeValidator({ suspicionFlagThreshold: 3 });
  const s = v.createState(50, 50);
  let t = 1000;
  v.check(s, { x: 50, y: 50 }, t);
  for (let i = 0; i < 3; i++) {
    t += 100;
    v.check(s, { x: 50 + 50 * (i + 1), y: 50 }, t); // repeated overspeed
  }
  assert.strictEqual(s.flagged, true, 'player flagged after threshold');
  assert.ok(s.totalViolations >= 3, 'violations counted');
  assert.ok(s.reasonCounts.h_speed >= 1, 'reasons recorded for review');
  ok('suspicion accrues and flags for admin review (no ban)');
})();

console.log(`\nAll ${passed} movement-validator checks passed.`);
