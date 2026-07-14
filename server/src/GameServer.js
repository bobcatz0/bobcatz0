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
const { parseClientMove, buildServerMove } = require('./protocol/movement');
const MovementValidator = require('./movement/MovementValidator');

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

    // Anti-cheat for client-reported movement. Bounds come from the world
    // (with a little vertical slack for jumping above the surface). Speed and
    // teleport caps are deliberately permissive — they only catch egregious
    // cheating, never legitimate play.
    this.moveValidator = new MovementValidator({
      minX: -2,
      maxX: this.world.cols + 2,
      minY: -12,
      maxY: this.world.rows + 12,
      maxHorizontalSpeed: 40,   // tiles/sec
      maxVerticalSpeed: 120,    // tiles/sec (falling can be fast)
      maxTeleportDistance: 20,  // tiles in a single update
    });
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
    // Read ONLY the opcode here. Client->server bodies start right after the
    // opcode (offset 2); there is no universal "d slot" on the inbound side
    // (login is the exception and reads its own sub-opcode).
    const opcode = r.readUInt16();
    log.inbound(client.id, opcode, buf);

    switch (opcode) {
      case C2S.LOGIN:          // 2
        this.handleLogin(client, r);
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
        log.info(`C${client.id} unhandled opcode ${opcode}`);
    }
  }

  // ── Flow handlers ──────────────────────────────────────────────────────────

  handleLogin(client, reader) {
    const sub = reader.readUInt16(); // login sub-opcode (always 2)
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
    // Establish the movement-validator baseline at the spawn point.
    client.moveState = this.moveValidator.createState(client.col, client.row);
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
    const m = parseClientMove(reader, opcode);

    if (!client.moveState) {
      client.moveState = this.moveValidator.createState(client.col, client.row);
    }
    const verdict = this.moveValidator.check(
      client.moveState,
      { x: m.x, y: m.y, vx: m.vx, vy: m.vy },
      Date.now(),
    );

    // Rate-limited burst: ignore this packet entirely.
    if (verdict.dropped) return;

    // Apply the CORRECTED values — clamped on a violation, last-good position
    // on impossible coordinates. The raw (invalid) value is never used.
    client.col = verdict.x;
    client.row = verdict.y;
    client.vx = verdict.vx;
    client.vy = verdict.vy;
    // Animation / aim are cosmetic; pass the reported values through.
    client.anim = m.anim;
    client.facing = m.facing;
    client.aim = m.aim;

    if (verdict.violations.length) {
      log.info(
        `C${client.id} suspicious movement [${verdict.violations.join(',')}] ` +
        `clamped; suspicion=${verdict.suspicion}`,
      );
      if (verdict.flagged && !client.flaggedForReview) {
        client.flaggedForReview = true;
        log.info(`C${client.id} *** FLAGGED FOR ADMIN REVIEW *** (name="${client.name}")`);
      }
    }

    this.broadcastMove(client);
  }

  /** Players currently flagged for admin review (clamped, not banned). */
  getFlaggedPlayers() {
    const out = [];
    for (const c of this.clients.values()) {
      if (c.flaggedForReview && c.moveState) {
        out.push({
          id: c.id,
          name: c.name,
          suspicion: c.moveState.suspicion,
          totalViolations: c.moveState.totalViolations,
          reasons: c.moveState.reasonCounts,
        });
      }
    }
    return out;
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

  broadcastMove(client) {
    const packet = buildServerMove(client.sessionUUID, {
      x: client.col,
      y: client.row,
      vx: client.vx,
      vy: client.vy,
      anim: client.anim,
      facing: client.facing,
      aim: client.aim,
    });
    for (const other of this.clients.values()) {
      if (other === client || other.stage !== 'playing') continue;
      other.send(packet);
    }
  }

  broadcastPlayerLeft(client) {
    const w = new ByteWriter();
    w.writeUInt16(S2C.PLAYER_LEFT); // 3
    w.writeUInt16(0);               // d slot (client dispatcher reads + ignores it)
    w.writeUUID(client.sessionUUID);
    const packet = w.toBuffer();
    for (const other of this.clients.values()) {
      if (other.stage !== 'playing') continue;
      other.send(packet);
    }
  }
}

module.exports = GameServer;
