import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  WEAPON_RIG, DEFAULT_WEAPON_RIG, weaponRig, weaponBehind, bodyRenderFacing,
} from '../src/render/CharacterRigConfig.js';
import { byId } from '../src/diggerz/DiggerzWeaponCatalog.js';

// Character rendering = the reference-image sprite + held-weapon rigs (see
// docs/CHARACTER_RENDERING.md). These guard the sprite metadata, the per-weapon
// held configs, the weapon draw-order rule, and the facing rule. Pure, no DOM.

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

// 1. The generated character sprite + metadata exist and are consistent.
(function spriteMeta() {
  const meta = JSON.parse(readFileSync(new URL('../assets/generated/default-diggerz-character-idle.json', import.meta.url), 'utf8'));
  const png = readFileSync(new URL('../assets/generated/default-diggerz-character-idle.png', import.meta.url));
  // PNG magic + IHDR dimensions match the metadata
  assert.strictEqual(png.slice(1, 4).toString(), 'PNG', 'sprite is a PNG');
  assert.strictEqual(png.readUInt32BE(16), meta.width, 'metadata width matches the PNG');
  assert.strictEqual(png.readUInt32BE(20), meta.height, 'metadata height matches the PNG');
  // anchors sit inside the sprite; ground anchor is at the bottom (feet)
  for (const key of ['groundAnchor', 'centerAnchor', 'headAnchor', 'handAnchor']) {
    const a = meta[key];
    assert.ok(a && a.x >= 0 && a.x <= meta.width && a.y >= 0 && a.y <= meta.height, `${key} within the sprite`);
  }
  assert.ok(meta.groundAnchor.y >= meta.height * 0.9, 'ground anchor at the sprite bottom (feet)');
  assert.ok(meta.headAnchor.y < meta.height * 0.4, 'head anchor in the upper part');
  assert.ok(meta.handAnchor.y > meta.headAnchor.y, 'hand anchor below the head (weapon starts at the hand, not the face)');
  assert.strictEqual(meta.facing, 'right', 'source facing recorded (mirror for left)');
  ok('reference sprite + metadata consistent (dimensions, anchors, facing)');
})();

// 2. Each Combat V1 weapon has its own held rig; unknown -> default.
(function perWeapon() {
  const sword = byId(55).spriteKey, ray = byId(79).spriteKey, shot = byId(248).spriteKey;
  for (const key of [sword, ray, shot]) {
    const r = WEAPON_RIG[key];
    assert.ok(r, `WEAPON_RIG[${key}] exists`);
    assert.ok(r.grip && r.grip.x >= 0 && r.grip.x <= 1 && r.grip.y >= 0 && r.grip.y <= 1, `${key} grip is a 0..1 fraction`);
    assert.ok(Number.isFinite(r.rot), `${key} has a rotation offset`);
    assert.ok(r.scale > 0 && r.scale < 2, `${key} has a sane scale`);
  }
  assert.notStrictEqual(WEAPON_RIG[sword].rot, WEAPON_RIG[ray].rot, 'sword vs ray gun rotation differ');
  assert.notStrictEqual(WEAPON_RIG[ray].rot, WEAPON_RIG[shot].rot, 'ray gun vs shotgun rotation differ');
  assert.strictEqual(weaponRig('NOPE_PNG'), DEFAULT_WEAPON_RIG, 'unknown weapon -> default rig');
  assert.strictEqual(weaponRig(sword), WEAPON_RIG[sword], 'known weapon -> its rig');
  ok('each weapon (sword/ray gun/shotgun) has its own grip/rotation/scale; unknown -> default');
})();

// 3. Held-weapon layering: aiming up draws the weapon BEHIND the character (so
//    it can't cover the face); horizontal/down draws it in front.
(function weaponLayering() {
  const D = Math.PI / 180;
  assert.strictEqual(weaponBehind(-90 * D), true, 'aim straight up -> behind');
  assert.strictEqual(weaponBehind(-135 * D), true, 'aim up-left -> behind');
  assert.strictEqual(weaponBehind(-45 * D), true, 'aim up-right -> behind');
  assert.strictEqual(weaponBehind(0), false, 'aim straight right -> in front');
  assert.strictEqual(weaponBehind(Math.PI), false, 'aim straight left -> in front');
  assert.strictEqual(weaponBehind(45 * D), false, 'aim down-right -> in front');
  assert.strictEqual(weaponBehind(90 * D), false, 'aim straight down -> in front');
  assert.strictEqual(weaponBehind(-10 * D), false, 'aim slightly up (shallow) -> still in front');
  assert.strictEqual(weaponBehind(null), false, 'no aim -> in front');
  ok('held weapon draws behind the character when aiming up, in front otherwise');
})();

// 4. Body-facing rule: aim direction while using, else movement; idle keeps last.
(function facingRule() {
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: 0, movementFacing: -1 }), 1, 'using + aim right -> face right');
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: Math.PI, movementFacing: 1 }), -1, 'using + aim left -> face left');
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: -Math.PI / 4, movementFacing: -1 }), 1, 'using + aim up-right -> face right');
  assert.strictEqual(bodyRenderFacing({ using: false, aimAngle: Math.PI, movementFacing: 1 }), 1, 'idle keeps movement facing R (ignores aim)');
  assert.strictEqual(bodyRenderFacing({ using: false, aimAngle: 0, movementFacing: -1 }), -1, 'idle keeps movement facing L (ignores aim)');
  ok('body facing follows aim while using, else movement (idle keeps last)');
})();

console.log(`\nAll ${passed} rig checks passed.`);
