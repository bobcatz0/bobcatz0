'use strict';

const Client = require('./Client');
const World = require('./World');
const ByteReader = require('./net/ByteReader');
const ByteWriter = require('./net/ByteWriter');
const log = require('./net/log');
const { C2S, S2C } = require('./net/opcodes');
const handshake = require('./protocol/handshake');
const { buildWorldMap } = require('./protocol/worldmap');
const { buildPlayerSpawn } = require('./protocol/spawn');

/**
 * GameServer — owns the world and all connected clients, and drives the
 * reconstructed connection flow:
 *
 *   client connects
 *     C->S  op 2  (login)          -> S->C op 2  (handshake)
 *     C->S  op 4  (ack)            -> S->C op 4  (world map)
 *     C->S  op 18 (map loaded)     -> S->C op 5  (player spawn)  + go "playing"
 *     C->S  op 6/8 (movement)      -> broadcast op 6 to other players
 *
 * Combat, building and items are intentionally left as TODOs — the transport,
 * codec and join flow are the hard part and are now correct; the rest is
 * incremental and best iterated against the live client using the logs.
 */
class GameServer {
  constructor() {
    this.world = new World();
    this.clients = new Map(); // id -> Client
  }

  onConnect(ws) {
    const client = new Client(ws);
    this.clients.set(client.id, client);
    log.info(`client ${client.id} connected (now ${this.clients.size} online)`);

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        log.info(`C${client.id} sent a TEXT frame (ignored): ${String(data).slice(0, 80)}`);
        return;
      }
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      try {
        this.onPacket(client, buf);
      } catch (err) {
        log.info(`C${client.id} packet error:`, err && err.stack ? err.stack : err);
      }
    });

    ws.on('close', (code) => {
      log.info(`client ${client.id} disconnected (code ${code})`);
      this.clients.delete(client.id);
      this.broadcastPlayerLeft(client);
    });

    ws.on('error', (err) => {
      log.info(`C${client.id} socket error:`, err && err.message ? err.message : err);
    });
  }

  onPacket(client, buf) {
    const r = new ByteReader(buf);
    const opcode = r.readUInt16();
    const sub = r.readUInt16(); // second uint16 (sub-opcode / flags / padding)
    log.inbound(client.id, opcode, buf);

    switch (opcode) {
      case C2S.LOGIN:          // 2
        this.handleLogin(client, r, sub);
        break;
      case C2S.HANDSHAKE_ACK:  // 4
        this.handleAck(client);
        break;
      case C2S.MAP_LOADED:     // 18
        this.handleMapLoaded(client);
        break;
      case C2S.MOVE:           // 6
      case C2S.POS_PING:       // 8
        this.handleMove(client, opcode, r);
        break;
      case C2S.DIG_COMMIT:     // 47
        // TODO: validate dig, mutate world, broadcast op 11 (TILE_UPDATE).
        break;
      case C2S.TILE_ACTIVATE:  // 20
      case C2S.BUILD:          // 11
        // TODO: building / tile interaction.
        break;
      case C2S.CHAT:           // 211
        // TODO: chat broadcast (op 12).
        break;
      default:
        log.info(`C${client.id} unhandled opcode ${opcode} (sub ${sub})`);
    }
  }

  // ── Flow handlers ──────────────────────────────────────────────────────────

  handleLogin(client, reader, sub) {
    const login = handshake.parseLogin(reader);
    client.name = login.userName || 'Player';
    log.info(`C${client.id} login: name="${client.name}" platform="${login.platform}" sub=${sub}`);

    const packet = handshake.buildHandshake(client.sessionUUID, client.sessionUUID);
    client.stage = 'handshaken';
    log.outbound(client.id, S2C.HANDSHAKE, packet);
    client.send(packet);
  }

  handleAck(client) {
    const packet = buildWorldMap(this.world);
    client.stage = 'mapsent';
    log.outbound(client.id, S2C.WORLD_MAP, packet);
    client.send(packet);
  }

  handleMapLoaded(client) {
    // Spawn the local player. UUID must equal the session UUID so the client
    // recognises it as l.z39.
    const spawn = buildPlayerSpawn({
      uuid: client.sessionUUID,
      name: client.name,
      col: client.col,
      row: client.row,
    });
    client.stage = 'playing';
    log.outbound(client.id, S2C.PLAYER_SPAWN, spawn);
    client.send(spawn);

    // Tell everyone else this player exists, and tell this player about others.
    for (const other of this.clients.values()) {
      if (other === client || other.stage !== 'playing') continue;
      other.send(this.buildSpawnFor(client));
      client.send(this.buildSpawnFor(other));
    }
    log.info(`C${client.id} is now PLAYING as "${client.name}"`);
  }

  handleMove(client, opcode, reader) {
    // op 6 (K.X7):  x, y (split floats, tile units), then velocity etc.
    // op 8 (K.y8):  bool, x, 0, y, 0, uint16
    if (opcode === C2S.MOVE) {
      client.col = reader.readSplitFloat();
      client.row = reader.readSplitFloat();
      client.vx = reader.readSplitFloat();
      client.vy = reader.readSplitFloat();
    } else {
      reader.readByte();                 // bool
      client.col = reader.readSplitFloat();
      reader.readSplitFloat();           // 0
      client.row = reader.readSplitFloat();
    }
    this.broadcastMove(client);
  }

  // ── Broadcasts ──────────────────────────────────────────────────────────────

  buildSpawnFor(client) {
    return buildPlayerSpawn({
      uuid: client.sessionUUID,
      name: client.name,
      col: client.col,
      row: client.row,
    });
  }

  /**
   * Build a PLAYER_MOVE (op 6) packet matching L34's read order:
   *   uuid, x, y, vx, vy, anim(float), facing(float), aimAngle(uint16),
   *   byte, byte, standingTileCol(uint16), standingTileRow(uint16)
   */
  buildMove(client) {
    const w = new ByteWriter();
    w.writeUInt16(S2C.PLAYER_MOVE); // 6
    w.writeUUID(client.sessionUUID);
    w.writeSplitFloat(client.col);  // x
    w.writeSplitFloat(client.row);  // y
    w.writeSplitFloat(client.vx);   // vx
    w.writeSplitFloat(client.vy);   // vy
    w.writeSplitFloat(0);           // anim state
    w.writeSplitFloat(1);           // facing / x-scale
    w.writeUInt16(0);               // aim angle packed
    w.writeByte(0);
    w.writeByte(0);
    w.writeUInt16(Math.max(0, Math.round(client.col))); // standing col
    w.writeUInt16(Math.max(0, Math.round(client.row))); // standing row
    return w.toBuffer();
  }

  broadcastMove(client) {
    const packet = this.buildMove(client);
    for (const other of this.clients.values()) {
      if (other === client || other.stage !== 'playing') continue;
      other.send(packet);
    }
  }

  broadcastPlayerLeft(client) {
    const w = new ByteWriter();
    w.writeUInt16(S2C.PLAYER_LEFT); // 3
    w.writeUUID(client.sessionUUID);
    const packet = w.toBuffer();
    for (const other of this.clients.values()) {
      if (other.stage !== 'playing') continue;
      other.send(packet);
    }
  }
}

module.exports = GameServer;
