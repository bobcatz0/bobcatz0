import assert from 'node:assert';
import { GUY_SKELETON } from '../src/render/guySkeleton.js';
import { WEAPON_RIG, DEFAULT_WEAPON_RIG, weaponRig, BODY_TINTS, bodyRenderFacing } from '../src/render/CharacterRigConfig.js';
import { byId } from '../src/diggerz/DiggerzWeaponCatalog.js';

// Character = the REAL Spine skeleton extracted from the client (guySkeleton.js).
// These guard the skeleton data, the held-weapon rigs, the body tints, and the
// facing rule. Pure, no DOM.

let passed = 0;
const ok = (l) => { console.log('  ok -', l); passed++; };

// 1. The extracted skeleton is well-formed (real bone hierarchy + draw order).
(function skeleton() {
  const sk = GUY_SKELETON;
  assert.ok(Array.isArray(sk.bones) && sk.bones.length >= 14, 'has the real bones');
  assert.ok(Array.isArray(sk.slots) && sk.slots.length >= 10, 'has the draw-order slots');
  const names = new Set(sk.bones.map((b) => b.name));
  // every non-root bone references a parent that exists (valid FK tree)
  let roots = 0;
  for (const b of sk.bones) {
    if (!b.parent) { roots++; continue; }
    assert.ok(names.has(b.parent), `bone ${b.name} parent ${b.parent} exists`);
  }
  assert.strictEqual(roots, 1, 'exactly one root bone');
  // key parts are present in the draw order, head before the front arm
  const slotImgs = sk.slots.map((s) => s.img);
  for (const need of ['HEAD_PNG', 'TORSO_PNG', 'LEG_PNG', 'EYES_PNG'])
    assert.ok(slotImgs.includes(need), `draws ${need}`);
  const headI = sk.slots.findIndex((s) => s.img === 'HEAD_PNG');
  const eyesI = sk.slots.findIndex((s) => s.img === 'EYES_PNG');
  assert.ok(eyesI > headI, 'eyes draw on top of the head');
  assert.ok(sk.handBone && names.has(sk.handBone), 'front hand bone exists for the weapon');
  ok('real Spine skeleton: valid bone tree, draw order, head+eyes+body parts');
})();

// 2. Body tints colour the WHITE base parts (navy body, blue/purple legs/shoes).
(function tints() {
  for (const key of ['TORSO_PNG', 'LEG_PNG', 'PANTS_PNG', 'FOOT_PNG']) {
    const t = BODY_TINTS[key];
    assert.ok(t && t.white && /WHITE/.test(t.white), `${key} tints a WHITE base part`);
    assert.ok(/^#[0-9a-f]{6}$/i.test(t.tint), `${key} has a colour`);
  }
  // legs/pants share the blue; shoes are a distinct purple; torso is the navy
  assert.notStrictEqual(BODY_TINTS.FOOT_PNG.tint, BODY_TINTS.LEG_PNG.tint, 'shoes differ from legs');
  assert.notStrictEqual(BODY_TINTS.TORSO_PNG.tint, BODY_TINTS.LEG_PNG.tint, 'torso differs from legs');
  ok('body tints recolour the white base parts (navy torso, blue legs, purple shoes)');
})();

// 3. Each Combat V1 weapon has its own held rig; unknown -> default.
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
