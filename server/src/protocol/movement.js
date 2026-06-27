'use strict';

const ByteWriter = require('../net/ByteWriter');
const ByteReader = require('../net/ByteReader');
const { S2C } = require('../net/opcodes');

/**
 * ── Movement protocol (opcode 6) ─────────────────────────────────────────────
 *
 * diggerz movement is CLIENT-SIDE physics. Each client simulates its own
 * player as a Nape rigid body (gravity + WASD/arrow input + jump) and reports
 * the result to the server every frame via K.X7. The server is a relay: it
 * stores each player's reported state and forwards it to the OTHER clients,
 * which display remote players via V34 -> L34 (with light position smoothing).
 *
 * The two directions use DIFFERENT layouts — note the framing asymmetry:
 *
 *  • The client's receive dispatcher always reads TWO uint16 first
 *    (`c = Q9()` opcode, `d = Q9()`), THEN calls the handler. So every
 *    SERVER -> CLIENT packet must place a 2-byte "d slot" right after the
 *    opcode; the real body starts at byte offset 4.
 *
 *  • The client's senders (A17 / K.X7) only prepend the opcode (one uint16),
 *    so CLIENT -> SERVER bodies start at byte offset 2 — there is NO d slot.
 *
 * CLIENT -> SERVER  (K.X7), body starts at offset 2:
 *    u16  opcode = 6
 *    f    x         (tile units; client already divided pixels by 64)
 *    f    y
 *    f    vx        (raw velocity)
 *    f    vy
 *    f    anim      (animation-state index)
 *    f    b35       (secondary velocity component — unused by the relay)
 *    f    facing    (x-scale: +1 right, -1 left)
 *    u16  aim       (aim angle * 600, packed)
 *    u8   0
 *    u8   0
 *   [u16  cartCol]  (only when riding a cart)
 *   [u16  cartRow]
 *
 * SERVER -> CLIENT  (V34 -> L34), body starts at offset 4:
 *    u16  opcode = 6
 *    u16  d slot   (ignored by V34; send 0)
 *    uuid playerId
 *    f    x         (tile units; client multiplies by 64)
 *    f    y
 *    f    vx
 *    f    vy
 *    f    anim
 *    f    facing
 *    u16  aim
 *    u8   0
 *    u8   0
 *    u16  standCol  (tile the player stands on)
 *    u16  standRow
 *
 * `f` is a "split float": int32 floor + int32 frac*1e5.
 */

const MOVE = 6;
const POS_PING = 8;

/**
 * Parse a client movement packet. `reader` must be positioned right after the
 * opcode (offset 2) — i.e. NO d slot was consumed.
 */
function parseClientMove(reader, opcode) {
  if (opcode === MOVE) {
    const x = reader.readSplitFloat();
    const y = reader.readSplitFloat();
    const vx = reader.readSplitFloat();
    const vy = reader.readSplitFloat();
    const anim = reader.readSplitFloat();
    reader.readSplitFloat(); // b35 — secondary velocity, not relayed
    const facing = reader.readSplitFloat();
    const aim = reader.readUInt16();
    reader.readByte();
    reader.readByte();
    // optional cart coords ignored
    return { x, y, vx, vy, anim, facing, aim };
  }

  // POS_PING (op 8, K.y8):  u8, f x, f 0, f y, f 0, u16 0
  reader.readByte();
  const x = reader.readSplitFloat();
  reader.readSplitFloat();
  const y = reader.readSplitFloat();
  reader.readSplitFloat();
  return { x, y, vx: 0, vy: 0, anim: 0, facing: 1, aim: 0 };
}

/**
 * Build a server->client movement packet for one player (consumed by L34).
 * `uuid` is the player's session UUID; `s` is the parsed state above.
 */
function buildServerMove(uuid, s) {
  const w = new ByteWriter();
  w.writeUInt16(S2C.PLAYER_MOVE); // opcode 6
  w.writeUInt16(0);               // d slot (ignored)
  w.writeUUID(uuid);
  w.writeSplitFloat(s.x);
  w.writeSplitFloat(s.y);
  w.writeSplitFloat(s.vx);
  w.writeSplitFloat(s.vy);
  w.writeSplitFloat(s.anim || 0);
  w.writeSplitFloat(s.facing || 1);
  w.writeUInt16((s.aim || 0) & 0xffff);
  w.writeByte(0);
  w.writeByte(0);
  w.writeUInt16(Math.max(0, Math.round(s.x))); // standing tile col
  w.writeUInt16(Math.max(0, Math.round(s.y))); // standing tile row
  return w.toBuffer();
}

module.exports = { parseClientMove, buildServerMove, MOVE, POS_PING };
