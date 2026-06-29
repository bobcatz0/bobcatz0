import assert from 'node:assert';
import {
  RIG, ARM, WEAPON_RIG, DEFAULT_WEAPON_RIG, weaponRig, bodyRenderFacing,
} from '../src/render/CharacterRigConfig.js';
import { byId } from '../src/diggerz/DiggerzWeaponCatalog.js';

// Character rig calibration config + facing rule (pure, no DOM). Visual only —
// these guard the offsets/anchors and the body-facing rule against regressions.

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

// 1. The rig config exposes every body part the renderer needs, with sizes.
(function rigParts() {
  for (const key of ['backFoot', 'frontFoot', 'backLeg', 'frontLeg', 'pants', 'torso', 'head', 'eyes']) {
    const p = RIG[key];
    assert.ok(p, `RIG.${key} exists`);
    assert.ok(p.key && p.w > 0 && p.h > 0, `RIG.${key} has sprite key + size`);
    assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dy), `RIG.${key} has offsets`);
  }
  // arm/hand anchors present
  assert.ok(ARM.shoulder && Number.isFinite(ARM.shoulder.dx) && Number.isFinite(ARM.shoulder.dy), 'shoulder anchor');
  assert.ok(ARM.length > 0, 'arm length');
  assert.ok(ARM.handSprite && ARM.armSprite, 'arm + hand sprite sizes');
  ok('rig config has head/eyes/torso/pants/legs/feet offsets + arm/hand anchors');
})();

// 2. Eyes sit on the head's box (so they read as attached to the face).
(function eyesOnHead() {
  const head = RIG.head, eyes = RIG.eyes;
  const hx0 = head.dx, hx1 = head.dx + head.w, hy0 = head.dy, hy1 = head.dy + head.h;
  const ex0 = eyes.dx, ex1 = eyes.dx + eyes.w, ey0 = eyes.dy, ey1 = eyes.dy + eyes.h;
  assert.ok(ex0 >= hx0 && ex1 <= hx1, 'eyes within the head horizontally');
  assert.ok(ey0 >= hy0 && ey1 <= hy1, 'eyes within the head vertically');
  // and shifted toward the front (+x) so the character reads as looking forward
  const eyeMid = eyes.dx + eyes.w / 2, headMid = head.dx + head.w / 2;
  assert.ok(eyeMid > headMid, 'eyes shifted to the front (+x) of the head');
  ok('eyes are positioned on the head and front-shifted (no floating)');
})();

// 3. Each Combat V1 weapon has its own held rig (grip/rotation/scale), and they
//    differ — the sword, ray gun and shotgun cannot share one rule.
(function perWeapon() {
  const sword = byId(55).spriteKey, ray = byId(79).spriteKey, shot = byId(248).spriteKey;
  for (const key of [sword, ray, shot]) {
    const r = WEAPON_RIG[key];
    assert.ok(r, `WEAPON_RIG[${key}] exists`);
    assert.ok(r.grip && r.grip.x >= 0 && r.grip.x <= 1 && r.grip.y >= 0 && r.grip.y <= 1, `${key} grip is a 0..1 fraction`);
    assert.ok(Number.isFinite(r.rot), `${key} has a rotation offset`);
    assert.ok(r.scale > 0 && r.scale < 2, `${key} has a sane scale`);
  }
  // the three rotation offsets are genuinely different (sword vs the two guns)
  assert.notStrictEqual(WEAPON_RIG[sword].rot, WEAPON_RIG[ray].rot, 'sword vs ray gun rotation differ');
  assert.notStrictEqual(WEAPON_RIG[ray].rot, WEAPON_RIG[shot].rot, 'ray gun vs shotgun rotation differ');
  // unknown weapon falls back to the default rig
  assert.strictEqual(weaponRig('NOPE_PNG'), DEFAULT_WEAPON_RIG, 'unknown weapon -> default rig');
  assert.strictEqual(weaponRig(sword), WEAPON_RIG[sword], 'known weapon -> its rig');
  ok('each weapon (sword/ray gun/shotgun) has its own grip/rotation/scale; unknown -> default');
})();

// 4. Body-facing rule: aim direction while using, else movement; idle keeps last.
(function facingRule() {
  // using -> follow the aim's horizontal sign
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: 0, movementFacing: -1 }), 1, 'using + aim right -> face right');
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: Math.PI, movementFacing: 1 }), -1, 'using + aim left -> face left');
  assert.strictEqual(bodyRenderFacing({ using: true, aimAngle: -Math.PI / 4, movementFacing: -1 }), 1, 'using + aim up-right -> face right');
  // not using -> follow movement facing (which carries the last facing while idle)
  assert.strictEqual(bodyRenderFacing({ using: false, aimAngle: Math.PI, movementFacing: 1 }), 1, 'idle keeps movement facing R (ignores aim)');
  assert.strictEqual(bodyRenderFacing({ using: false, aimAngle: 0, movementFacing: -1 }), -1, 'idle keeps movement facing L (ignores aim)');
  ok('body facing follows aim while using, else movement (idle keeps last)');
})();

console.log(`\nAll ${passed} rig checks passed.`);
