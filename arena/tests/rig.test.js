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

// 2. Eyes sit HIGH and FORWARD, embedded ON the upper-front face (head visible
//    above + around them) like the loading-screen character — not centred, not
//    floating above the head: the eye overlaps the head and only its front edge
//    may bulge a little past the face.
(function eyesOnHead() {
  const head = RIG.head, eyes = RIG.eyes;
  const hx0 = head.dx, hx1 = head.dx + head.w, hy0 = head.dy, hy1 = head.dy + head.h;
  const hMidY = head.dy + head.h / 2, hMidX = head.dx + head.w / 2;
  const ey0 = eyes.dy, ey1 = eyes.dy + eyes.h;
  const eMidY = eyes.dy + eyes.h / 2, eMidX = eyes.dx + eyes.w / 2;
  // high on the head: eye centre is in the UPPER half (not vertically centred)
  assert.ok(eMidY < hMidY, 'eyes sit in the upper half of the head (not centred)');
  // on the face, not floating: the eye top is within the head (a small overhang
  // tolerance) and the eye bottom is inside the head, with most of the eye on it
  assert.ok(ey0 >= hy0 - 2, 'eye top is on the head (not floating above)');
  assert.ok(ey1 <= hy1, 'eye bottom is inside the head');
  const overlap = Math.min(ey1, hy1) - Math.max(ey0, hy0);
  assert.ok(overlap >= eyes.h * 0.7, 'most of the eye (>=70%) overlaps the head vertically');
  // pushed toward the FRONT (+x) face, but still ON the face: there is head both
  // in front of and behind the eyes (not jammed against / past the front edge)
  assert.ok(eMidX > hMidX, 'eyes pushed toward the front (+x) of the head');
  assert.ok(eyes.dx >= hx0, 'eye back edge stays within the head (head behind the eyes)');
  assert.ok(eyes.dx + eyes.w <= hx1 + 1, 'eye front edge stays on the face (head in front of the eyes)');
  ok('eyes sit high + forward, embedded on the upper-front face (loading-screen placement)');
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
