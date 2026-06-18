'use strict';

const ByteWriter = require('../net/ByteWriter');
const { S2C } = require('../net/opcodes');

/**
 * The client's version gate (U34):  if  0.955 < parseFloat(versionString)
 * then it shows "out of date" and disconnects. So the server must advertise
 * a version <= 0.955. "0.9" is safe.
 */
const SERVER_VERSION_STRING = '0.9';

/**
 * Parse the client's login packet (C->S opcode 2), built by V30:
 *
 *   R2(2)            opcode
 *   R2(2)            sub-opcode (always 2)
 *   R9 email/uid     string
 *   R9 password      string
 *   R9 userName      string
 *   R9 userUniqueID  string
 *   R9 "html5"       string (platform)
 *   r8 size          split float
 *   R0 color         int32
 *   R9 language      string
 *   s0 A45           byte
 *   R8 token         uuid
 *   s0 A46           byte
 *   s0 A47           byte
 *   s0 A48           byte
 *
 * `reader` is positioned AFTER the two leading uint16 (opcode + sub) have
 * already been consumed by the dispatcher.
 */
function parseLogin(reader) {
  return {
    auth:      reader.readString(),
    password:  reader.readString(),
    userName:  reader.readString(),
    uniqueId:  reader.readString(),
    platform:  reader.readString(),
    size:      reader.readSplitFloat(),
    color:     reader.readInt32(),
    language:  reader.readString(),
    flagA45:   reader.readByte(),
    token:     reader.readUUID(),
    flagA46:   reader.readByte(),
    flagA47:   reader.readByte(),
    flagA48:   reader.readByte(),
  };
}

/**
 * Build the handshake response (S->C opcode 2), consumed by U34:
 *
 *   R2(2)            opcode
 *   R2(status)       uint16  — MUST be non-zero for success (0 == FAILED)
 *   R8 sessionUUID   l.a43   (the client's identity for this session)
 *   R8 playerUUID    pa.P34
 *   R8 (discarded)
 *   R9 versionString ("0.9")
 *   s0 (bool)        discarded by r6()
 *   R9 timeString    ("0:0") — client does parseInt(split(":")[0]) % 7
 *   R8 key0 .. key6  seven UUIDs (XOR seed; the client's scrambler s5() is a
 *                    no-op, so these can be anything — zeros are fine)
 *
 * IMPORTANT: `sessionUUID` must be reused as the player's UUID in the spawn
 * packet (opcode 5) so the client recognises that entity as the local player
 * (its check is `spawnUUID.q2(l.a43)`).
 */
function buildHandshake(sessionUUID, playerUUID) {
  const w = new ByteWriter();
  w.writeUInt16(S2C.HANDSHAKE); // opcode 2
  w.writeUInt16(1);             // status = 1 (success)
  w.writeUUID(sessionUUID);     // l.a43
  w.writeUUID(playerUUID);      // pa.P34
  w.writeUUID([0, 0, 0, 0]);    // discarded
  w.writeString(SERVER_VERSION_STRING);
  w.writeBool(false);           // discarded bool
  w.writeString('0:0');         // time string -> key slot 0
  for (let i = 0; i < 7; i++) w.writeUUID([0, 0, 0, 0]); // 7 crypto keys
  return w.toBuffer();
}

module.exports = { parseLogin, buildHandshake, SERVER_VERSION_STRING };
