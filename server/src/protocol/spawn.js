'use strict';

const ByteWriter = require('../net/ByteWriter');
const { S2C } = require('../net/opcodes');

/**
 * Build a player-spawn packet (S->C opcode 5), consumed by U36.
 *
 * Exact read order in U36 (positions are in TILE units; the client multiplies
 * by l._44 = 64 to get pixels):
 *
 *   Q6  player UUID
 *   r5  name
 *   Q4  x            (tile units)
 *   Q4  (discarded)
 *   Q4  y            (tile units)
 *   Q4  (discarded)
 *   Q9  invCount, then invCount x Q9   (inventory item ids)
 *   r5  (string, extra)
 *   Q9  (discarded)
 *   r1  (discarded)
 *   Q9  k            -> pa constructor arg (skin/character id)
 *   r6  bool         -> l.b43 (free-dig flag)
 *   Q9  scoreCount, then scoreCount x Q7  (first -> J, e.g. level)
 *   r6  (discarded)
 *   Q7  (discarded)
 *   Q9  u            -> pa constructor arg (hat id)
 *   Q6  uuid t       (equipment / cosmetic)
 *   r1  loadoutCount, then loadoutCount x [Q9, r1, Q9, r1, Q9, r1, Q9]
 *   Q4  level/xp
 *   Q4  visibility   (<= 0 hides the entity, so send > 0)
 *
 * For a minimal but valid spawn we send empty inventory, empty loadout, and
 * sensible defaults. `uuid` MUST equal the session UUID from the handshake so
 * the client treats this entity as the LOCAL player (l.z39).
 */
function buildPlayerSpawn(opts) {
  const {
    uuid,
    name = 'Player',
    col = 32,        // tile x
    row = 17,        // tile y
    skin = 0,        // k
    hat = 0,         // u
    level = 1,       // J / first score value
    freeDig = false, // l.b43
  } = opts;

  const w = new ByteWriter();
  w.writeUInt16(S2C.PLAYER_SPAWN); // opcode 5

  w.writeUUID(uuid);
  w.writeString(name);
  w.writeSplitFloat(col);  // x (tiles)
  w.writeSplitFloat(0);    // discarded
  w.writeSplitFloat(row);  // y (tiles)
  w.writeSplitFloat(0);    // discarded

  w.writeUInt16(0);        // inventory count = 0 (no items)

  w.writeString('');       // extra string
  w.writeUInt16(0);        // discarded uint16
  w.writeByte(0);          // discarded byte
  w.writeUInt16(skin);     // k -> skin/character id
  w.writeBool(freeDig);    // l.b43

  // score array: send one entry (the level / first value J)
  w.writeUInt16(1);        // scoreCount = 1
  w.writeInt32(level);     // -> J

  w.writeBool(false);      // discarded bool
  w.writeInt32(0);         // discarded int32
  w.writeUInt16(hat);      // u -> hat id
  w.writeUUID([0, 0, 0, 0]); // equipment uuid

  w.writeByte(0);          // loadout count = 0

  w.writeSplitFloat(level); // level / xp
  w.writeSplitFloat(1);     // visibility (> 0 => visible)

  return w.toBuffer();
}

module.exports = { buildPlayerSpawn };
