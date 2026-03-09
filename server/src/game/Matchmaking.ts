import { Server as SocketServer, Socket } from 'socket.io';
import { GameRoom } from './GameRoom';
import { MIN_PLAYERS, MAX_PLAYERS, LOBBY_COUNTDOWN } from '../constants';
import * as Events from '../network/events';

export class Matchmaking {
  private io:           SocketServer;
  private rooms:        Map<string, GameRoom>;
  private pendingRoom:  GameRoom | null;
  private countdown:    ReturnType<typeof setInterval> | null;
  private countdownVal: number;
  /** Maps socket id → room id */
  private playerRoom:   Map<string, string>;

  constructor(io: SocketServer) {
    this.io           = io;
    this.rooms        = new Map();
    this.pendingRoom  = null;
    this.countdown    = null;
    this.countdownVal = 0;
    this.playerRoom   = new Map();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  joinLobby(socket: Socket, name: string, skin: string): void {
    if (this.playerRoom.has(socket.id)) return; // already in a room

    const room = this.getOrCreatePendingRoom();
    room.addPlayer(socket, name, skin);
    this.playerRoom.set(socket.id, room.id);

    this.broadcastLobbyState(room);

    if (room.playerCount >= MAX_PLAYERS) {
      this.launchGame(room);
    } else if (room.playerCount >= MIN_PLAYERS && !this.countdown) {
      this.beginCountdown(room);
    }
  }

  leaveLobby(socket: Socket): void {
    const roomId = this.playerRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(socket.id);
    this.playerRoom.delete(socket.id);

    if (room.playerCount === 0) {
      room.cleanup();
      this.rooms.delete(roomId);
      if (this.pendingRoom?.id === roomId) {
        this.pendingRoom = null;
        this.cancelCountdown();
      }
    } else if (room.state === 'waiting') {
      // Cancel countdown if below minimum
      if (room.playerCount < MIN_PLAYERS) this.cancelCountdown();
      this.broadcastLobbyState(room);
    }
  }

  getRoom(socketId: string): GameRoom | undefined {
    const roomId = this.playerRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  cleanup(): void {
    this.cancelCountdown();
    for (const room of this.rooms.values()) room.cleanup();
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private getOrCreatePendingRoom(): GameRoom {
    if (
      !this.pendingRoom ||
      this.pendingRoom.state !== 'waiting' ||
      this.pendingRoom.playerCount >= MAX_PLAYERS
    ) {
      this.pendingRoom = new GameRoom(this.io);
      this.rooms.set(this.pendingRoom.id, this.pendingRoom);
    }
    return this.pendingRoom;
  }

  private beginCountdown(room: GameRoom): void {
    this.countdownVal = LOBBY_COUNTDOWN;
    this.countdown = setInterval(() => {
      this.countdownVal--;
      this.broadcastLobbyState(room, this.countdownVal);
      if (this.countdownVal <= 0) this.launchGame(room);
    }, 1000);
  }

  private cancelCountdown(): void {
    if (this.countdown) {
      clearInterval(this.countdown);
      this.countdown = null;
    }
  }

  private launchGame(room: GameRoom): void {
    this.cancelCountdown();
    if (this.pendingRoom === room) this.pendingRoom = null;
    room.startGame();
  }

  private broadcastLobbyState(room: GameRoom, countdown?: number): void {
    const payload: Record<string, unknown> = {
      playerCount: room.playerCount,
      players:     [...room.players.values()].map(p => ({ id: p.id, name: p.name, skin: p.skin })),
      minPlayers:  MIN_PLAYERS,
      maxPlayers:  MAX_PLAYERS,
    };
    if (countdown !== undefined) payload.countdown = countdown;
    this.io.to(room.id).emit(Events.S_LOBBY_STATE, payload);
  }
}
