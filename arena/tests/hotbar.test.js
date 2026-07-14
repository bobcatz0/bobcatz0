import assert from 'node:assert';
import { Hotbar, ITEM_TYPE } from '../src/diggerz/ItemSystem.js';
import { byId } from '../src/diggerz/DiggerzWeaponCatalog.js';
import { CombatController } from '../src/diggerz/CombatController.js';

// Hotbar + weapon selection + use-INTENT (no combat resolution). Mirrors how
// ArenaScene wires the confirmed Diggerz modules.

const LOADOUT_IDS = [55, 79, 248]; // Fake Sword, Blue Ray Gun, Shotgun
const slot = (id) => ({ ...byId(id), type: ITEM_TYPE.WEAPON });

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

// 1. The 3 slots are the confirmed Diggerz weapons (no invented names).
(function loadout() {
  const hb = new Hotbar(LOADOUT_IDS.map(slot));
  assert.strictEqual(hb.slots.length, 3, '3 hotbar slots');
  assert.deepStrictEqual(hb.slots.map((s) => s.name), ['Fake Sword', 'Blue Ray Gun', 'Shotgun']);
  assert.deepStrictEqual(hb.slots.map((s) => s.id), [55, 79, 248]);
  assert.ok(hb.slots.every((s) => s.spriteKey && s.rect), 'each slot has a real sprite + rect');
  ok('hotbar holds the 3 confirmed weapons (Fake Sword / Blue Ray Gun / Shotgun)');
})();

// 2. Mouse wheel cycles the selected slot (and wraps).
(function wheel() {
  const hb = new Hotbar(LOADOUT_IDS.map(slot));
  assert.strictEqual(hb.selected, 0, 'starts on slot 0');
  hb.scroll(1); assert.strictEqual(hb.selected, 1, 'wheel +1 -> slot 1');
  hb.scroll(1); assert.strictEqual(hb.selected, 2, 'wheel +1 -> slot 2');
  hb.scroll(1); assert.strictEqual(hb.selected, 0, 'wraps to 0');
  hb.scroll(-1); assert.strictEqual(hb.selected, 2, 'wheel -1 wraps to 2');
  ok('mouse wheel changes the selected slot (with wrap)');
})();

// 3. Left-click emits the confirmed opcode-287 use intent — and NOTHING else
//    (no damage / hit / projectile resolution).
(function useIntent() {
  const hb = new Hotbar(LOADOUT_IDS.map(slot));
  const emitted = [];
  const cc = new CombatController({
    hotbar: hb,
    isMelee: (it) => it?.category === 'melee',
    onUseIntent: (intent, used) => emitted.push({ intent, used }),
  });
  const player = { x: 100, y: 100, grounded: true, moving: false, facing: 1 };

  // press edge of left mouse -> one intent for the selected weapon (sword)
  cc.step({ keyState: {}, mouse: { state: 1, wheel: 0 } }, player, { x: 150, y: 100 });
  assert.strictEqual(emitted.length, 1, 'one use intent per press');
  const { intent, used } = emitted[0];
  assert.strictEqual(intent.opcode, 287, 'opcode 287 use intent');
  assert.strictEqual(intent.slot, 0, 'carries the selected slot');
  assert.strictEqual(used.item.name, 'Fake Sword', 'intent is for the selected weapon');
  // no resolution leaked into the intent
  for (const k of ['damage', 'hit', 'health', 'projectile', 'hurtbox', 'score']) {
    assert.ok(!(k in intent), `intent has no '${k}' field`);
  }
  // holding does not re-fire on the same press
  cc.step({ keyState: {}, mouse: { state: 1, wheel: 0 } }, player, { x: 150, y: 100 });
  assert.strictEqual(emitted.length, 1, 'held button does not re-emit');

  // wheel to the ray gun, then a fresh click emits an intent for slot 1
  cc.step({ keyState: {}, mouse: { state: 0, wheel: 1 } }, player, { x: 150, y: 100 });
  cc.step({ keyState: {}, mouse: { state: 1, wheel: 0 } }, player, { x: 150, y: 100 });
  assert.strictEqual(emitted.length, 2, 'second click emits again');
  assert.strictEqual(emitted[1].intent.slot, 1, 'slot 1 (Blue Ray Gun)');
  ok('left-click emits the confirmed op-287 use intent only (no resolution)');
})();

console.log(`\nAll ${passed} hotbar checks passed.`);
