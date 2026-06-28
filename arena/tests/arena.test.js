import assert from 'node:assert';
import { buildArenaMap } from '../src/game/arenaMap.js';
import { TileCollision } from '../src/game/TileCollision.js';
import { MovementController } from '../src/game/MovementController.js';
import { Camera } from '../src/game/Camera.js';
import { facingScale } from '../src/diggerz/CharacterRig.js';
import { hotbarSlotForCode } from '../src/diggerz/InputBindings.js';
import { Hotbar } from '../src/diggerz/ItemSystem.js';
import { byId } from '../src/diggerz/DiggerzWeaponCatalog.js';

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
  assert.ok(map.cols >= 78 && map.cols <= 82, 'about 80 tiles wide');
  assert.ok(map.rows >= 32 && map.rows <= 36, 'height in 32–36 tiles');
  assert.ok(map.worldW > 3 * VIEW_W && map.worldH > VIEW_H, 'world much larger than viewport');
  ok('arena is much larger than the viewport (~80 x 34 tiles)');
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

// 8. Camera zoom: clamps to [min,max], keeps centred, screen->world is zoom-aware.
(function zoom() {
  const cam = new Camera(VIEW_W, VIEW_H, map.worldW, map.worldH);
  assert.strictEqual(cam.zoom, 1, 'default zoom 1');
  // clamp
  assert.strictEqual(cam.setZoom(5, 1600, 680), cam.maxZoom, 'clamps to maxZoom');
  assert.strictEqual(cam.setZoom(0.1, 1600, 680), cam.minZoom, 'clamps to minZoom');
  // zooming in shrinks the visible world span
  cam.setZoom(1, 1600, 680);
  const span1 = cam.viewWorldW;
  cam.setZoom(2, 1600, 680);
  assert.ok(cam.viewWorldW < span1, 'zoom in shows less world');
  // centred: the player's world point maps back near the viewport centre
  cam.setZoom(1.5, 1600, 680);
  const w = cam.screenToWorld(VIEW_W / 2, VIEW_H / 2);
  assert.ok(Math.abs(w.x - 1600) < 1 && Math.abs(w.y - 680) < 1, 'player stays centred under zoom');
  // screen->world halves the offset at 2x
  cam.setZoom(2, 1600, 680);
  const a = cam.screenToWorld(0, 0), b = cam.screenToWorld(200, 0);
  assert.ok(Math.abs((b.x - a.x) - 100) < 1e-6, '200 screen px = 100 world px at 2x');
  ok('camera zoom clamps to [0.75, 2.0], keeps the player centred, screen->world zoom-aware');
})();

// 9. Facing helper sign is stable (guards against the moonwalk inversion).
(function facing() {
  assert.strictEqual(facingScale(1), 1, 'facing right -> +1 (no mirror)');
  assert.strictEqual(facingScale(-1), -1, 'facing left -> -1 (mirror)');
  assert.strictEqual(facingScale(0), 1, 'neutral -> +1');
  ok('facing scale sign is stable (right=+1, left=-1)');
})();

// 10. Number keys select hotbar weapons (standalone divergence from Diggerz's
//     mouse-wheel selection); the wheel now zooms instead.
(function numberKeys() {
  // code -> slot mapping (Digit1/2/3 + Numpad1/2/3; everything else is null).
  assert.strictEqual(hotbarSlotForCode('Digit1'), 0, '1 -> slot 0');
  assert.strictEqual(hotbarSlotForCode('Digit2'), 1, '2 -> slot 1');
  assert.strictEqual(hotbarSlotForCode('Digit3'), 2, '3 -> slot 2');
  assert.strictEqual(hotbarSlotForCode('Numpad1'), 0, 'numpad 1 -> slot 0');
  assert.strictEqual(hotbarSlotForCode('Numpad3'), 2, 'numpad 3 -> slot 2');
  assert.strictEqual(hotbarSlotForCode('Digit4'), null, 'no slot 4');
  assert.strictEqual(hotbarSlotForCode('KeyW'), null, 'movement key is not a slot');

  // pressing a number key updates the selected hotbar slot.
  const hb = new Hotbar([55, 79, 248].map((id) => byId(id)));
  hb.select(hotbarSlotForCode('Digit2'));
  assert.strictEqual(hb.selected, 1, 'pressing 2 selects Blue Ray Gun');
  assert.strictEqual(hb.selectedItem.name, 'Blue Ray Gun', 'slot 1 is Blue Ray Gun');
  hb.select(hotbarSlotForCode('Digit3'));
  assert.strictEqual(hb.selected, 2, 'pressing 3 selects Shotgun');
  hb.select(hotbarSlotForCode('Digit1'));
  assert.strictEqual(hb.selected, 0, 'pressing 1 selects Fake Sword');
  ok('number keys 1/2/3 select the hotbar weapon (and update the selected slot)');
})();

// 11. Mouse wheel zooms the camera (up = in, down = out) and clamps to [min,max].
(function wheelZoom() {
  const cam = new Camera(VIEW_W, VIEW_H, map.worldW, map.worldH);
  // Mirror ArenaScene's wheel mapping: deltaY<0 (wheel up) -> zoom in.
  const onWheel = (dir) => { if (dir < 0) cam.zoomBy(1.15, 1600, 680); else if (dir > 0) cam.zoomBy(1 / 1.15, 1600, 680); };
  assert.strictEqual(cam.zoom, 1, 'starts at 1.0');
  onWheel(-1); assert.ok(cam.zoom > 1, 'wheel up zooms in');
  onWheel(1); onWheel(1); assert.ok(cam.zoom < 1, 'wheel down zooms out');
  // spamming the wheel never escapes the clamp range
  for (let i = 0; i < 60; i++) onWheel(-1);
  assert.strictEqual(cam.zoom, cam.maxZoom, 'clamps at maxZoom (2.0)');
  for (let i = 0; i < 60; i++) onWheel(1);
  assert.strictEqual(cam.zoom, cam.minZoom, 'clamps at minZoom (0.75)');
  ok('mouse wheel zooms the camera and clamps to [0.75, 2.0]');
})();

console.log(`\nAll ${passed} arena checks passed.`);
