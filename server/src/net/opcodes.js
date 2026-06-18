'use strict';

/**
 * Opcode constants, reverse-engineered from diggerz_v-203.js.
 *
 * Opcodes are NOT unique per direction — the same number means different
 * things depending on who sends it. They are grouped below by direction.
 *
 * The incoming dispatcher in the client is `z37()` (switch on Q9()).
 * The outgoing helpers live on the `K` class (K.X7, K.Y0, ...).
 */

// ── Client -> Server (server receives these) ─────────────────────────────────
const C2S = {
  LOGIN:       2,   // V30: auth packet (sub-opcode 2). See protocol/handshake.js
  HANDSHAKE_ACK: 4, // A17(4): empty ack sent after a successful opcode-2 handshake
  MOVE:        6,   // K.X7: player position / movement (sent every frame)
  POS_PING:    8,   // K.y8: lightweight position heartbeat
  TILE_ACTIVATE: 20,// K.Y0: interact/activate a tile
  BUILD:       11,  // K.X8: place a tile (note: embeds opcode 11 directly)
  DIG_COMMIT:  47,  // K.Y1: "action committed" (dig) — empty payload
  CHAT:        211, // K.Y4: chat message
  MAP_LOADED:  18,  // A17(18): client finished loading the world (sent from v30)
};

// ── Server -> Client (server sends these) ────────────────────────────────────
const S2C = {
  HANDSHAKE:   2,   // U34: handshake response (status, uuids, version, keys)
  PLAYER_LEFT: 3,   // U35
  WORLD_MAP:   4,   // v30: full tile world, chunked
  PLAYER_SPAWN: 5,  // U36: full player state (create/update an entity)
  PLAYER_MOVE: 6,   // V34 -> L34: position update for a player
  PROJECTILE:  8,   // V38
  TILE_UPDATE: 11,  // U37: bulk tile changes (dig/build/destroy)
  CHAT:        12,  // v39: chat broadcast
  BIG_TEXT:    13,  // v37: system / big display text
  GAME_OVER:   25,  // inline: winner + reward
};

module.exports = { C2S, S2C };
