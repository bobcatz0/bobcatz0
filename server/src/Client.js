'use strict';

let NEXT_ID = 1;

/**
 * Per-connection state.
 *
 * `sessionUUID` is generated at connect time, sent in the handshake (becomes
 * l.a43 on the client) and reused as the player's spawn UUID so the client
 * binds the spawned entity to the local player.
 */
class Client {
  constructor(ws) {
    this.id = NEXT_ID++;
    this.ws = ws;

    // Stage of the connection/login flow.
    //   'connecting' -> waiting for login (opcode 2)
    //   'handshaken' -> waiting for ack (opcode 4)
    //   'mapsent'    -> waiting for map-loaded (opcode 18)
    //   'playing'    -> spawned and active
    this.stage = 'connecting';

    // 4x int32 identity. Random-but-stable for this session.
    this.sessionUUID = [
      this.id,
      (Math.random() * 0x7fffffff) | 0,
      (Math.random() * 0x7fffffff) | 0,
      (Math.random() * 0x7fffffff) | 0,
    ];

    this.name = 'Player';

    // Last known position (tile units).
    this.col = 32;
    this.row = 17;
    this.vx = 0;
    this.vy = 0;
    this.anim = 0;    // animation-state index
    this.facing = 1;  // +1 right, -1 left
    this.aim = 0;     // packed aim angle
    this.alive = true;

    // Anti-cheat: per-player movement-validator state (created on spawn) and a
    // sticky flag for admin review.
    this.moveState = null;
    this.flaggedForReview = false;
  }

  send(buffer) {
    if (this.ws.readyState === 1 /* OPEN */) this.ws.send(buffer);
  }
}

module.exports = Client;
