import { Server as SocketServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerInput } from './Player';
import { Terrain, TILE_DIRT, TILE_STONE, TILE_WOOD } from './Terrain';
import { Projectile } from './Projectile';
import { Zone } from './Zone';
import {
  TICK_RATE, TICK_DT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_JUMP_VEL,
  GRAVITY, MAX_FALL_SPEED,
  DIG_RANGE, BUILD_RANGE,
  SHOOT_COOLDOWN, PROJECTILE_SPEED, PROJECTILE_DAMAGE, PROJECTILE_RADIUS,
  SURFACE_ROW, TILE_SIZE, WORLD_COLS,
  GAME_START_GRACE,
} from '../constants';
import * as Events from '../network/events';

export type GameState = 'waiting' | 'countdown' | 'playing' | 'finished';

// Players spawn a couple of tiles above the surface
const SPAWN_Y = (SURFACE_ROW - 2) * TILE_SIZE;

// Item name for each placeable tile type
const TILE_ITEM: Record<number, string> = {
  [TILE_DIRT]:  'dirt',
  [TILE_STONE]: 'stone',
  [TILE_WOOD]:  'wood',
};

export class GameRoom {
  readonly id: string;

  private io:          SocketServer;
  players:             Map<string, Player>;
  private projectiles: Map<string, Projectile>;
  terrain:             Terrain;
  private zone:        Zone;
  state:               GameState;

  private tickInterval: ReturnType<typeof setInterval> | null;
  private graceTimer:   number;
  private winner:       string | null;

  constructor(io: SocketServer) {
    this.id          = uuidv4();
    this.io          = io;
    this.players     = new Map();
    this.projectiles = new Map();
    this.terrain     = new Terrain();
    this.zone        = new Zone();
    this.state       = 'waiting';
    this.tickInterval = null;
    this.graceTimer   = 0;
    this.winner       = null;
  }

  // ── Player lifecycle ──────────────────────────────────────────────────────

  addPlayer(socket: Socket, name: string, skin: string): Player {
    const spawnCol = 10 + Math.floor(Math.random() * (WORLD_COLS - 20));
    const player   = new Player(socket.id, name, skin, spawnCol * TILE_SIZE, SPAWN_Y);

    this.players.set(socket.id, player);

    // Full snapshot for the joining player
    socket.emit(Events.S_GAME_STATE, {
      terrain:     this.terrain.serialize(),
      players:     this.serializePlayers(),
      projectiles: this.serializeProjectiles(),
      zone:        this.zone.serialize(),
      gameState:   this.state,
    });

    // Notify already-connected players
    socket.to(this.id).emit(Events.S_PLAYER_JOINED, player.serialize());

    // Join the socket.io room so io.to(this.id) reaches everyone
    socket.join(this.id);

    return player;
  }

  removePlayer(socketId: string): void {
    if (!this.players.has(socketId)) return;
    this.players.delete(socketId);
    this.io.to(this.id).emit(Events.S_PLAYER_LEFT, { id: socketId });

    if (this.state === 'playing') {
      this.checkWinCondition();
    }
  }

  // ── Game lifecycle ────────────────────────────────────────────────────────

  startGame(): void {
    this.state      = 'playing';
    this.graceTimer = GAME_START_GRACE;

    this.io.to(this.id).emit(Events.S_GAME_START, { graceTime: GAME_START_GRACE });
    this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_RATE);
  }

  cleanup(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  get playerCount(): number {
    return this.players.size;
  }

  get aliveCount(): number {
    return [...this.players.values()].filter(p => p.alive).length;
  }

  // ── Input handlers (called from socket handlers) ──────────────────────────

  handleInput(socketId: string, input: PlayerInput): void {
    const player = this.players.get(socketId);
    if (player) player.lastInput = input;
  }

  handleShoot(socketId: string, aimX: number, aimY: number): void {
    const player = this.players.get(socketId);
    if (!player || !player.alive || player.shootCooldown > 0) return;

    const cx = player.position.x + PLAYER_WIDTH  / 2;
    const cy = player.position.y + PLAYER_HEIGHT / 2;
    const dx = aimX - cx;
    const dy = aimY - cy;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / mag) * PROJECTILE_SPEED;
    const vy = (dy / mag) * PROJECTILE_SPEED;

    const proj = new Projectile(socketId, cx, cy, vx, vy);
    this.projectiles.set(proj.id, proj);
    player.shootCooldown = SHOOT_COOLDOWN;
  }

  handleDig(socketId: string, col: number, row: number): void {
    const player = this.players.get(socketId);
    if (!player || !player.alive) return;

    if (!this.withinRange(player, col, row, DIG_RANGE)) return;

    const result = this.terrain.dig(col, row);
    if (result?.drop) {
      player.addInventory(result.drop.item, result.drop.count);
    }
    // Tile change is flushed + broadcast each tick
  }

  handleBuild(socketId: string, col: number, row: number, tileType: number): void {
    const player = this.players.get(socketId);
    if (!player || !player.alive) return;
    if (!(tileType in TILE_ITEM)) return; // unknown tile type

    if (!this.withinRange(player, col, row, BUILD_RANGE)) return;

    const item = TILE_ITEM[tileType];
    if (!player.removeInventory(item, 1)) return; // not enough material

    this.terrain.build(col, row, tileType);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  private tick(): void {
    const dt       = TICK_DT;
    const inGrace  = this.graceTimer > 0;
    if (inGrace) this.graceTimer = Math.max(0, this.graceTimer - dt);

    // Update players
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      this.updatePlayer(player, dt);

      // Zone damage
      if (!inGrace && !this.zone.containsPlayer(player.position.x, player.position.y, PLAYER_WIDTH, PLAYER_HEIGHT)) {
        const died = player.takeDamage(this.zone.getDamageRate() * dt);
        if (died) this.handlePlayerDeath(player, null);
      }
    }

    // Update projectiles
    for (const [id, proj] of this.projectiles) {
      proj.update(dt);

      if (!proj.active) {
        this.projectiles.delete(id);
        continue;
      }

      // Hit terrain
      const col = Math.floor(proj.x / TILE_SIZE);
      const row = Math.floor(proj.y / TILE_SIZE);
      if (this.terrain.isSolid(col, row)) {
        this.projectiles.delete(id);
        continue;
      }

      // Hit players (skip during grace period)
      if (!inGrace) {
        for (const target of this.players.values()) {
          if (!target.alive || target.id === proj.ownerId) continue;
          if (this.projectileHitsPlayer(proj, target)) {
            this.projectiles.delete(id);
            const died = target.takeDamage(PROJECTILE_DAMAGE);
            if (died) this.handlePlayerDeath(target, proj.ownerId);
            break;
          }
        }
      }
    }

    // Advance zone
    const zoneChanged = this.zone.update(dt);

    // Flush terrain changes
    const terrainChanges = this.terrain.flushChanges();

    // Broadcast tick update
    const update: Record<string, unknown> = {
      players:     this.serializePlayers(),
      projectiles: this.serializeProjectiles(),
    };
    if (terrainChanges.length > 0) update.terrainChanges = terrainChanges;
    if (zoneChanged)               update.zone           = this.zone.serialize();

    this.io.to(this.id).emit(Events.S_TICK_UPDATE, update);
  }

  private updatePlayer(player: Player, dt: number): void {
    const input = player.lastInput;

    // Gravity
    player.velocity.y = Math.min(player.velocity.y + GRAVITY * dt, MAX_FALL_SPEED);

    // Horizontal input
    let inputVx = 0;
    if (input.left)  { inputVx -= PLAYER_SPEED; player.facingRight = false; }
    if (input.right) { inputVx += PLAYER_SPEED; player.facingRight = true;  }
    player.velocity.x = inputVx;

    // Jump
    if (input.jump && player.onGround) {
      player.velocity.y = PLAYER_JUMP_VEL;
      player.onGround   = false;
    }

    // Move + resolve collisions
    const dx     = player.velocity.x * dt;
    const dy     = player.velocity.y * dt;
    const result = this.terrain.resolveMove(
      player.position.x, player.position.y,
      PLAYER_WIDTH, PLAYER_HEIGHT,
      dx, dy,
    );

    player.position.x = result.x;
    player.position.y = result.y;
    if (result.hitH) player.velocity.x = 0;
    if (result.hitV) player.velocity.y = 0;
    player.onGround = result.onGround;

    // Cooldowns
    if (player.shootCooldown > 0) player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  }

  // ── Win / death ───────────────────────────────────────────────────────────

  private handlePlayerDeath(player: Player, killerId: string | null): void {
    const killer     = killerId ? this.players.get(killerId) : null;
    if (killer) killer.kills++;

    this.io.to(this.id).emit(Events.S_PLAYER_DIED, {
      id:         player.id,
      killerId,
      killerName: killer?.name ?? null,
    });

    this.checkWinCondition();
  }

  private checkWinCondition(): void {
    if (this.state !== 'playing') return;

    const alive = [...this.players.values()].filter(p => p.alive);
    if (alive.length <= 1) {
      this.winner = alive[0]?.id ?? null;
      this.endGame();
    }
  }

  private endGame(): void {
    this.state = 'finished';
    this.cleanup();

    const winner = this.winner ? this.players.get(this.winner) : null;
    this.io.to(this.id).emit(Events.S_GAME_OVER, {
      winnerId:   this.winner,
      winnerName: winner?.name ?? null,
      leaderboard: [...this.players.values()].map(p => ({
        id:    p.id,
        name:  p.name,
        kills: p.kills,
      })),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private withinRange(player: Player, col: number, row: number, range: number): boolean {
    const px = player.position.x + PLAYER_WIDTH  / 2;
    const py = player.position.y + PLAYER_HEIGHT / 2;
    const tx = col * TILE_SIZE + TILE_SIZE / 2;
    const ty = row * TILE_SIZE + TILE_SIZE / 2;
    return (px - tx) ** 2 + (py - ty) ** 2 <= range * range;
  }

  private projectileHitsPlayer(proj: Projectile, player: Player): boolean {
    // AABB-vs-circle test
    const px = player.position.x;
    const py = player.position.y;
    const nearX = Math.max(px, Math.min(proj.x, px + PLAYER_WIDTH));
    const nearY = Math.max(py, Math.min(proj.y, py + PLAYER_HEIGHT));
    const dx = proj.x - nearX;
    const dy = proj.y - nearY;
    return dx * dx + dy * dy <= PROJECTILE_RADIUS * PROJECTILE_RADIUS;
  }

  private serializePlayers() {
    return [...this.players.values()].map(p => p.serialize());
  }

  private serializeProjectiles() {
    return [...this.projectiles.values()].map(p => p.serialize());
  }
}
