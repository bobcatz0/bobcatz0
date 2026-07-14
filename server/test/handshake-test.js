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
const { parseClientMove, buildServerMove } = require('../src/protocol/movement');
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
  r.readUInt16();                      // d slot
  r.readInt32();                       // discarded by v30
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
  r.readUInt16();                      // d slot
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

// ── 5. Movement round-trip ───────────────────────────────────────────────────
// (a) client K.X7 -> server parseClientMove   (b) server buildServerMove -> client L34
(function testMovement() {
  const TILE = 64; // l._44

  // (a) Build a client movement packet exactly like K.X7 (7 split floats, no d slot).
  const TS = 64;
  const cx = 33.5, cy = 17.25, vx = 4.2, vy = -1.5, facing = -1;
  const c = new ByteWriter();
  c.writeUInt16(6);                 // opcode (no d slot on the client side)
  c.writeSplitFloat(cx);            // x (tile units)
  c.writeSplitFloat(cy);            // y
  c.writeSplitFloat(vx);            // vx
  c.writeSplitFloat(vy);            // vy
  c.writeSplitFloat(0);             // anim
  c.writeSplitFloat(99);            // b35 (must be dropped)
  c.writeSplitFloat(facing);        // facing
  c.writeUInt16(1234);              // aim
  c.writeByte(0); c.writeByte(0);
  const cbuf = c.toBuffer();

  const cr = new ByteReader(cbuf);
  assert.strictEqual(cr.readUInt16(), 6, 'client move opcode');
  const parsed = parseClientMove(cr, 6);
  assert.strictEqual(parsed.x, cx, 'parsed x');
  assert.strictEqual(parsed.y, cy, 'parsed y');
  assert.strictEqual(parsed.vx, vx, 'parsed vx');
  assert.strictEqual(parsed.facing, facing, 'parsed facing (b35 dropped)');

  // (b) Build the server->client relay and read it back the way V34 -> L34 does.
  const sbuf = buildServerMove([7, 0, 0, 0], parsed);
  const sr = new ByteReader(sbuf);
  assert.strictEqual(sr.readUInt16(), 6, 'server move opcode');
  sr.readUInt16();                  // d slot (consumed by dispatcher before V34)
  assert.deepStrictEqual(sr.readUUID(), [7, 0, 0, 0], 'V34 uuid'); // V34: Q6()
  // L34 reads:
  assert.strictEqual(sr.readSplitFloat() * TILE, cx * TILE, 'L34 x*64');
  assert.strictEqual(sr.readSplitFloat() * TILE, cy * TILE, 'L34 y*64');
  assert.strictEqual(sr.readSplitFloat(), vx, 'L34 vx');
  assert.strictEqual(sr.readSplitFloat(), vy, 'L34 vy');
  sr.readSplitFloat();              // anim
  assert.strictEqual(sr.readSplitFloat(), facing, 'L34 facing');
  assert.strictEqual(sr.readUInt16(), 1234, 'L34 aim');
  sr.readByte(); sr.readByte();
  assert.strictEqual(sr.readUInt16(), Math.round(cx), 'L34 standing col');
  assert.strictEqual(sr.readUInt16(), Math.round(cy), 'L34 standing row');
  ok('movement round-trip (K.X7 -> parse -> buildServerMove -> L34)');
})();

console.log(`\nAll ${passed} protocol checks passed.`);
