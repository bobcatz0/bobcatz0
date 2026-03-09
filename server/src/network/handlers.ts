import { Server as SocketServer, Socket } from 'socket.io';
import { Matchmaking } from '../game/Matchmaking';
import { PlayerInput } from '../game/Player';
import * as Events from './events';

/** Register all socket event handlers for a single connected client. */
export function registerHandlers(
  io:          SocketServer,
  socket:      Socket,
  matchmaking: Matchmaking,
): void {
  console.log(`[socket] connected  ${socket.id}`);

  // ── Lobby ──────────────────────────────────────────────────────────────────

  socket.on(Events.C_JOIN_LOBBY, (data: unknown) => {
    const payload = (data ?? {}) as Record<string, unknown>;
    const name    = sanitizeString(payload.name, 'Player', 20);
    const skin    = sanitizeString(payload.skin, 'default', 30);
    matchmaking.joinLobby(socket, name, skin);
  });

  socket.on(Events.C_LEAVE_LOBBY, () => {
    matchmaking.leaveLobby(socket);
  });

  // ── Gameplay ───────────────────────────────────────────────────────────────

  socket.on(Events.C_PLAYER_INPUT, (data: unknown) => {
    const room = matchmaking.getRoom(socket.id);
    if (!room || room.state !== 'playing') return;

    const d      = (data ?? {}) as Record<string, unknown>;
    const input: PlayerInput = {
      left:           Boolean(d.left),
      right:          Boolean(d.right),
      jump:           Boolean(d.jump),
      aimX:           safeNumber(d.aimX),
      aimY:           safeNumber(d.aimY),
      sequenceNumber: safeNumber(d.sequenceNumber) | 0,
    };
    room.handleInput(socket.id, input);
  });

  socket.on(Events.C_SHOOT, (data: unknown) => {
    const room = matchmaking.getRoom(socket.id);
    if (!room || room.state !== 'playing') return;

    const d = (data ?? {}) as Record<string, unknown>;
    room.handleShoot(socket.id, safeNumber(d.aimX), safeNumber(d.aimY));
  });

  socket.on(Events.C_DIG, (data: unknown) => {
    const room = matchmaking.getRoom(socket.id);
    if (!room || room.state !== 'playing') return;

    const d = (data ?? {}) as Record<string, unknown>;
    room.handleDig(socket.id, Math.floor(safeNumber(d.col)), Math.floor(safeNumber(d.row)));
  });

  socket.on(Events.C_BUILD, (data: unknown) => {
    const room = matchmaking.getRoom(socket.id);
    if (!room || room.state !== 'playing') return;

    const d = (data ?? {}) as Record<string, unknown>;
    room.handleBuild(
      socket.id,
      Math.floor(safeNumber(d.col)),
      Math.floor(safeNumber(d.row)),
      Math.floor(safeNumber(d.tileType)),
    );
  });

  socket.on(Events.C_CHAT, (data: unknown) => {
    const room = matchmaking.getRoom(socket.id);
    if (!room) return;

    const player  = room.players.get(socket.id);
    if (!player) return;

    const d       = (data ?? {}) as Record<string, unknown>;
    const message = sanitizeString(d.message, '', 200);
    if (!message) return;

    io.to(room.id).emit(Events.S_CHAT, {
      playerId:   socket.id,
      playerName: player.name,
      message,
    });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected ${socket.id} (${reason})`);
    matchmaking.leaveLobby(socket);
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function safeNumber(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function sanitizeString(v: unknown, fallback: string, maxLen: number): string {
  const s = typeof v === 'string' ? v.slice(0, maxLen).trim() : '';
  return s || fallback;
}
