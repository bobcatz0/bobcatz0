'use strict';

/**
 * Self-test: build the server's packets and read them back the SAME way the
 * client does (mirroring U34 / v30 / U36), asserting field-for-field. This
 * verifies the byte layouts without needing the browser game.
 *
 * Run with:  npm test
 */

const assert = require('assert');
const ByteReader = require('../src/net/ByteReader');
const ByteWriter = require('../src/net/ByteWriter');
const handshake = require('../src/protocol/handshake');
const { buildWorldMap, TILE } = require('../src/protocol/worldmap');
const { buildPlayerSpawn } = require('../src/protocol/spawn');
const World = require('../src/World');

let passed = 0;
function ok(label) { console.log('  ok -', label); passed++; }

// ── 1. Login round-trip (client V30 -> server parseLogin) ────────────────────
(function testLogin() {
  const w = new ByteWriter();
  w.writeUInt16(2);            // opcode
  w.writeUInt16(2);            // sub
  w.writeString('guest-123'); // auth
  w.writeString('pw');        // password
  w.writeString('CoolName');  // userName
  w.writeString('uid-xyz');   // uniqueId
  w.writeString('html5');     // platform
  w.writeSplitFloat(1.0);     // size
  w.writeInt32(7);            // color
  w.writeString('en');        // language
  w.writeByte(0);             // A45
  w.writeUUID([1, 2, 3, 4]);  // token
  w.writeByte(0);             // A46
  w.writeByte(0);             // A47
  w.writeByte(0);             // A48
  const buf = w.toBuffer();

  const r = new ByteReader(buf);
  assert.strictEqual(r.readUInt16(), 2, 'login opcode');
  assert.strictEqual(r.readUInt16(), 2, 'login sub');
  const login = handshake.parseLogin(r);
  assert.strictEqual(login.userName, 'CoolName');
  assert.strictEqual(login.platform, 'html5');
  assert.strictEqual(login.color, 7);
  ok('login parses (userName/platform/color)');
})();

// ── 2. Handshake round-trip (server build -> client U34 reads) ───────────────
(function testHandshake() {
  const session = [11, 22, 33, 44];
  const buf = handshake.buildHandshake(session, session);

  const r = new ByteReader(buf);
  assert.strictEqual(r.readUInt16(), 2, 'handshake opcode');
  const status = r.readUInt16();
  assert.notStrictEqual(status, 0, 'status must be non-zero (success)');
  const a43 = r.readUUID();
  assert.deepStrictEqual(a43, session, 'session uuid (l.a43)');
  r.readUUID();                       // pa.P34
  r.readUUID();                       // discarded
  const version = parseFloat(r.readString());
  assert.ok(version <= 0.955, `version ${version} must be <= 0.955`);
  r.readBool();                       // discarded
  const slot = parseInt(r.readString().split(':')[0], 10) % 7;
  assert.strictEqual(slot, 0, 'key slot 0');
  for (let i = 0; i < 7; i++) r.readUUID(); // 7 keys
  ok('handshake parses (status/uuid/version<=0.955/keys)');
})();

// ── 3. World map round-trip (server build -> client v30 reads) ───────────────
(function testWorldMap() {
  const world = new World(64, 40, 20);
  const buf = buildWorldMap(world);

  const r = new ByteReader(buf);
  assert.strictEqual(r.readUInt16(), 4, 'map opcode');
  r.readInt32();                       // discarded
  const cols = r.readUInt16();
  r.readUInt16();                      // s32
  const rows = r.readUInt16();
  assert.strictEqual(cols, 64, 'cols');
  assert.strictEqual(rows, 40, 'rows');
  const chunkCount = r.readInt32();
  assert.strictEqual(chunkCount, Math.ceil(64 / 4) * Math.ceil(40 / 4), 'chunk count');

  // Re-assemble the grid exactly as the client would and check a known tile.
  const seen = {}; // "col,layer,row" -> tile
  for (let c = 0; c < chunkCount; c++) {
    const baseCol = r.readInt32() * 4;
    r.readInt32();                     // chunkLayer
    const baseRow = r.readInt32() * 4;
    for (let k = 0; k < 4; k++) {
      for (let n = 0; n < 4; n++) {
        for (let rr = 0; rr < 4; rr++) {
          const t = r.readUInt16();
          seen[`${baseCol + k},${n},${baseRow + rr}`] = t & 0x7ff;
        }
      }
    }
  }
  assert.strictEqual(seen['32,1,20'], TILE.GRASS, 'surface tile is grass');
  assert.strictEqual(seen['32,1,25'], TILE.DIRT, 'sub-surface tile is dirt');
  assert.strictEqual(seen['32,1,10'], TILE.AIR, 'above-surface tile is air');
  assert.strictEqual(seen['32,0,25'], TILE.AIR, 'background layer empty');
  assert.strictEqual(r.remaining <= 7, true, 'consumed all but <=7 pad bytes');
  ok('world map parses (dimensions/chunks/tiles)');
})();

// ── 4. Player spawn round-trip (server build -> client U36 reads) ────────────
(function testSpawn() {
  const uuid = [5, 6, 7, 8];
  const buf = buildPlayerSpawn({ uuid, name: 'Hero', col: 32, row: 17, level: 3 });

  const r = new ByteReader(buf);
  assert.strictEqual(r.readUInt16(), 5, 'spawn opcode');
  assert.deepStrictEqual(r.readUUID(), uuid, 'player uuid');
  assert.strictEqual(r.readString(), 'Hero', 'name');
  assert.strictEqual(r.readSplitFloat(), 32, 'x');
  r.readSplitFloat();                  // discarded
  assert.strictEqual(r.readSplitFloat(), 17, 'y');
  r.readSplitFloat();                  // discarded
  const invCount = r.readUInt16();
  assert.strictEqual(invCount, 0, 'inventory empty');
  for (let i = 0; i < invCount; i++) r.readUInt16();
  r.readString();                      // extra
  r.readUInt16();                      // discarded
  r.readByte();                        // discarded
  r.readUInt16();                      // k (skin)
  r.readBool();                        // l.b43
  const scoreCount = r.readUInt16();
  let level = 0;
  for (let i = 0; i < scoreCount; i++) { const v = r.readInt32(); if (i === 0) level = v; }
  assert.strictEqual(level, 3, 'level (J)');
  r.readBool();                        // discarded
  r.readInt32();                       // discarded
  r.readUInt16();                      // u (hat)
  r.readUUID();                        // equipment
  const loadout = r.readByte();
  assert.strictEqual(loadout, 0, 'loadout empty');
  r.readSplitFloat();                  // xp
  const visibility = r.readSplitFloat();
  assert.ok(visibility > 0, 'visibility > 0');
  ok('spawn parses (uuid/name/pos/level/visibility)');
})();

console.log(`\nAll ${passed} protocol checks passed.`);
