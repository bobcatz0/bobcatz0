import assert from 'node:assert';
import { buildArenaMap } from '../src/game/arenaMap.js';
import { TileCollision } from '../src/game/TileCollision.js';
import { MovementController } from '../src/game/MovementController.js';
import { Camera } from '../src/game/Camera.js';

// Arena scale + camera + spawns. No combat, no physics changes.

const map = buildArenaMap(40);
const collider = new TileCollision(map);
const mc = new MovementController();
const DT = 1 / 120;
const PLAYER_H = 36;
const VIEW_W = 1000, VIEW_H = 640;

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };
const body = (x, y) => MovementController.createBody(x, y, 24, PLAYER_H);
function run(b, input, seconds) { const n = Math.round(seconds / DT); for (let i = 0; i < n; i++) mc.step(b, input, DT, collider); }
const NONE = { left: false, right: false, jump: false, jumpHeld: false, jumpPressed: false };
const RIGHT = { left: false, right: true, jump: false, jumpHeld: false, jumpPressed: false };

// 1. The arena is large and bigger than the viewport.
(function size() {
  assert.strictEqual(map.cols, 80, '80 tiles wide');
  assert.ok(map.rows >= 32 && map.rows <= 36, 'height in 32–36 tiles');
  assert.ok(map.worldW > VIEW_W && map.worldH > VIEW_H, 'world larger than viewport');
  ok('arena is larger than the viewport (80 x 34 tiles)');
})();

// 2. Spawn points exist in the map config (P1 left, P2 right).
(function spawns() {
  assert.ok(map.spawns && map.spawns.p1 && map.spawns.p2, 'spawns present');
  assert.ok(Number.isFinite(map.spawns.p1.x) && Number.isFinite(map.spawns.p1.y), 'p1 has coords');
  assert.ok(Number.isFinite(map.spawns.p2.x) && Number.isFinite(map.spawns.p2.y), 'p2 has coords');
  assert.ok(map.spawns.p1.x < map.spawns.p2.x, 'P1 spawns left of P2');
  ok('spawn points exist (P1 left, P2 right) in the map config');
})();

// 3. Player lands on the (wider) floor.
(function lands() {
  const b = body(map.spawns.p1.x, map.spawns.p1.y - 200);
  run(b, NONE, 3.0);
  const restingY = map.floorRow * map.tileSize - PLAYER_H;
  assert.strictEqual(b.grounded, true, 'grounded');
  assert.ok(Math.abs(b.y - restingY) < 0.5, `rests on floor (y=${b.y})`);
  ok('player falls and lands on the floor');
})();

// 4. Player can move across the larger arena (well beyond the old test box).
(function traverse() {
  const b = body(map.spawns.p1.x, map.spawns.p1.y);
  run(b, NONE, 0.1);
  const x0 = b.x;
  run(b, RIGHT, 8.0);
  assert.ok(b.x - x0 > 1800, `crossed a large distance (${(b.x - x0).toFixed(0)}px)`);
  assert.ok(b.x < map.worldW, 'did not tunnel past the world');
  ok('player can traverse a large arena horizontally');
})();

// 5. Boundary walls block the player on both sides.
(function walls() {
  const t = map.tileSize;
  // left wall (column 0)
  const bl = body(60, map.floorRow * t - PLAYER_H);
  run(bl, { ...NONE, left: true }, 1.5);
  assert.ok(bl.x >= t - 0.001, `stopped at left wall (x=${bl.x})`);
  // right wall (column cols-1): the player's right edge must not pass it.
  const br = body((map.cols - 3) * t, map.floorRow * t - PLAYER_H);
  run(br, RIGHT, 1.5);
  const wallLeft = (map.cols - 1) * t;              // left edge of the right wall
  assert.ok(br.x + 24 <= wallLeft + 1, `stopped at right wall (right edge ${br.x + 24}, wall ${wallLeft})`);
  ok('player cannot pass the left or right boundary walls');
})();

// 6. Jump reachability: every platform sits within jump range of a lower surface.
(function reachable() {
  const t = map.tileSize;
  const maxRiseTiles = Math.floor((mc.cfg.jumpSpeed ** 2 / (2 * mc.cfg.gravity)) / t); // ~3
  assert.ok(maxRiseTiles >= 3, `jump reaches ~${maxRiseTiles} tiles`);
  const solid = (c, r) => collider.isSolid(c, r);
  for (const [c0, c1, row] of map.platforms) {
    // a solid surface within maxRiseTiles rows below, within ±4 cols horizontally
    let found = false;
    for (let dr = 1; dr <= maxRiseTiles && !found; dr++)
      for (let c = c0 - 4; c <= c1 + 4 && !found; c++)
        if (solid(c, row + dr)) found = true;
    assert.ok(found, `platform [${c0}-${c1} @${row}] is reachable from below`);
  }
  ok('all platforms are reachable with the current jump (no impossible jumps)');
})();

// 7. Camera follows and clamps to the world bounds.
(function camera() {
  const cam = new Camera(VIEW_W, VIEW_H, map.worldW, map.worldH);
  // far left -> clamps to 0
  cam.snap(0, 0);
  assert.strictEqual(cam.x, 0, 'clamps left to 0');
  assert.strictEqual(cam.y, 0, 'clamps top to 0');
  // far right/bottom -> clamps to world - view
  cam.snap(map.worldW + 9999, map.worldH + 9999);
  assert.strictEqual(cam.x, map.worldW - VIEW_W, 'clamps right');
  assert.strictEqual(cam.y, map.worldH - VIEW_H, 'clamps bottom');
  // centre -> player centred and in bounds
  cam.snap(map.worldW / 2, map.worldH / 2);
  assert.ok(cam.x > 0 && cam.x < map.worldW - VIEW_W, 'centred horizontally');
  // smooth follow never leaves bounds
  cam.snap(0, 0);
  for (let i = 0; i < 600; i++) cam.follow(map.worldW + 5000, map.worldH + 5000, DT);
  assert.ok(cam.x <= map.worldW - VIEW_W + 1e-6 && cam.x >= 0, 'follow stays clamped x');
  assert.ok(cam.y <= map.worldH - VIEW_H + 1e-6 && cam.y >= 0, 'follow stays clamped y');
  ok('camera follows the player and clamps to map bounds');
})();

console.log(`\nAll ${passed} arena checks passed.`);
