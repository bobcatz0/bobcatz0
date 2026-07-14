import assert from 'node:assert';
import { readMovement, readMouse, KEY, isDown } from '../src/diggerz/InputBindings.js';
import { ANIM, locomotionAnim, facingScale, aimAngle, encodeAim, decodeAim } from '../src/diggerz/CharacterRig.js';
import { Hotbar, makeItem, ITEM_TYPE } from '../src/diggerz/ItemSystem.js';
import { buildUseIntent, useAnimation, resolveUse } from '../src/diggerz/WeaponSystem.js';
import { CombatController } from '../src/diggerz/CombatController.js';

// Tests for the recreated, CONFIRMED Diggerz systems. They verify the client's
// real bindings/encodings — they do NOT assert any invented combat numbers.

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

// 1. Input bindings match the client's q.KeyDown(...) codes.
(function bindings() {
  assert.deepStrictEqual(readMovement(new Set([KEY.A])).axis, -1, 'A = left');
  assert.deepStrictEqual(readMovement(new Set([KEY.LEFT])).axis, -1, 'ArrowLeft = left');
  assert.deepStrictEqual(readMovement(new Set([KEY.D])).axis, 1, 'D = right');
  assert.strictEqual(readMovement(new Set([KEY.W])).jump, true, 'W = jump');
  assert.strictEqual(readMovement(new Set([KEY.UP])).jump, true, 'ArrowUp = jump');
  assert.strictEqual(readMovement(new Set([KEY.SPACE])).jump, true, 'Space = jump');
  assert.strictEqual(readMovement(new Set([KEY.S])).down, true, 'S = down');
  // No invented attack keys: J/K are not bound to anything.
  assert.strictEqual(isDown(new Set([74]), 'jump'), false, 'J is not bound');
  assert.strictEqual(isDown(new Set([75]), 'jump'), false, 'K is not bound');
  ok('input bindings match the client (WASD/arrows/space; no J/K)');
})();

// 2. Mouse: left held = use, wheel = slot change.
(function mouse() {
  assert.deepStrictEqual(readMouse({ state: 1, wheel: 0 }).using, true, 'left held = using');
  assert.deepStrictEqual(readMouse({ state: 0, wheel: 0 }).using, false, 'left up = not using');
  assert.strictEqual(readMouse({ state: 0, wheel: 3 }).wheel, 1, 'wheel normalized to +1');
  ok('mouse: left-held = use, wheel = slot change');
})();

// 3. Aim encoding matches the client formula exactly.
(function aim() {
  const ang = aimAngle(100, 100, 200, 100); // straight right -> 0 rad
  assert.ok(Math.abs(ang - 0) < 1e-9, 'atan2 right = 0');
  const packed = encodeAim(ang);
  assert.strictEqual(packed, Math.floor((ang + 2 * Math.PI) * 600) & 0xffff, 'encode = floor((θ+2π)*600)');
  assert.ok(Math.abs(decodeAim(packed) - ang) < 0.01, 'decode round-trips');
  ok('aim angle uses the client encoding floor((θ+2π)*600)');
})();

// 4. Animation state names are the real ones (idle/walk/jump_in), not run/fall.
(function anims() {
  assert.strictEqual(locomotionAnim({ grounded: true, moving: false }), ANIM.IDLE);
  assert.strictEqual(locomotionAnim({ grounded: true, moving: true }), 'walk');
  assert.strictEqual(locomotionAnim({ grounded: false, moving: false }), 'jump_in');
  assert.strictEqual(facingScale(-1), -1);
  ok('animation states are the real names (idle / walk / jump_in)');
})();

// 5. Hotbar: wheel selection cycles; item types are 1=block, 2=weapon.
(function hotbar() {
  const hb = new Hotbar([
    makeItem({ id: 108, type: ITEM_TYPE.BLOCK, count: 20, name: 'dirt' }),
    makeItem({ id: 1, type: ITEM_TYPE.WEAPON, name: 'sword' }),
  ]);
  assert.strictEqual(hb.selected, 0, 'starts on slot 0');
  assert.strictEqual(hb.canBuildSelected(), true, 'block selectable to build');
  hb.scroll(1);
  assert.strictEqual(hb.selected, 1, 'wheel +1 -> slot 1');
  assert.strictEqual(hb.isWeaponSelected(), true, 'weapon selected');
  hb.scroll(1);
  assert.strictEqual(hb.selected, 0, 'wheel wraps around');
  hb.scroll(-1);
  assert.strictEqual(hb.selected, 1, 'wheel -1 wraps back');
  ok('hotbar wheel-cycles slots; types block(1)/weapon(2)');
})();

// 6. Use intent matches opcode 287 shape; animation per item type.
(function useIntent() {
  const intent = buildUseIntent({ origin: { x: 10, y: 5 }, target: { x: 20, y: 5 }, slot: 1 });
  assert.strictEqual(intent.opcode, 287, 'opcode 287');
  assert.strictEqual(intent.slot, 1, 'carries selected slot');
  assert.strictEqual(useAnimation(makeItem({ id: 108, type: ITEM_TYPE.BLOCK })), ANIM.BUILD, 'block -> build');
  assert.strictEqual(useAnimation(makeItem({ id: 1, type: ITEM_TYPE.WEAPON }), { isMelee: false }), ANIM.GUN_POSE, 'ranged -> gun_pose');
  assert.strictEqual(useAnimation(makeItem({ id: 2, type: ITEM_TYPE.WEAPON }), { isMelee: true }), ANIM.HIT, 'melee -> hit');
  ok('use intent is opcode-287-shaped; animation matches item type');
})();

// 7. CombatController wires the flow and delegates resolution (no fake combat).
(function controller() {
  const hb = new Hotbar([makeItem({ id: 1, type: ITEM_TYPE.WEAPON, name: 'sword' })]);
  const emitted = [];
  const cc = new CombatController({ hotbar: hb, onUseIntent: (i) => emitted.push(i), isMelee: () => true });
  const player = { x: 100, y: 100, grounded: true, moving: false, facing: 1 };

  // press edge of left mouse -> one intent + hit anim
  let r = cc.step({ keyState: new Set(), mouse: { state: 1, wheel: 0 } }, player, { x: 130, y: 100 });
  assert.strictEqual(emitted.length, 1, 'one use intent on press');
  assert.strictEqual(r.anim, ANIM.HIT, 'melee weapon -> hit anim');
  // holding does not re-fire on the same press (no invented auto-fire)
  r = cc.step({ keyState: new Set(), mouse: { state: 1, wheel: 0 } }, player, { x: 130, y: 100 });
  assert.strictEqual(emitted.length, 1, 'held button does not re-emit');
  // the emitted intent is the confirmed opcode-287 shape, nothing more
  assert.strictEqual(emitted[0].opcode, 287);
  assert.ok(!('damage' in emitted[0]) && !('hit' in emitted[0]), 'no invented damage/hit fields');
  ok('CombatController emits confirmed intent and delegates resolution');
})();

console.log(`\nAll ${passed} diggerz-mechanics checks passed.`);
