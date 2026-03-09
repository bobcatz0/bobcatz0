import { WORLD_COLS, WORLD_ROWS, TILE_SIZE, SURFACE_ROW } from '../constants';

// ── Tile type constants ───────────────────────────────────────────────────────
export const TILE_AIR   = 0;
export const TILE_DIRT  = 1;
export const TILE_STONE = 2;
export const TILE_WOOD  = 3;

export interface TileChange {
  col:  number;
  row:  number;
  type: number;
}

/** Item dropped when a tile is broken. */
const TILE_DROP: Record<number, { item: string; count: number } | null> = {
  [TILE_DIRT]:  { item: 'dirt',  count: 1 },
  [TILE_STONE]: { item: 'stone', count: 1 },
  [TILE_WOOD]:  { item: 'wood',  count: 1 },
};

export class Terrain {
  private tiles: Uint8Array;
  private pendingChanges: TileChange[] = [];

  constructor() {
    this.tiles = new Uint8Array(WORLD_COLS * WORLD_ROWS);
    this.generate();
  }

  // ── World generation ────────────────────────────────────────────────────────

  private generate(): void {
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        let tile: number;
        if (row < SURFACE_ROW) {
          tile = TILE_AIR;
        } else if (row === SURFACE_ROW) {
          tile = TILE_DIRT;
        } else {
          // Deeper = more stone
          const depth       = row - SURFACE_ROW;
          const stoneChance = Math.min(0.8, depth * 0.04);
          tile = Math.random() < stoneChance ? TILE_STONE : TILE_DIRT;
        }
        this.setTileRaw(col, row, tile);
      }
    }

    // Carve random cave pockets underground
    for (let i = 0; i < 60; i++) {
      const cCol = 5 + Math.floor(Math.random() * (WORLD_COLS - 10));
      const cRow = SURFACE_ROW + 5 + Math.floor(Math.random() * (WORLD_ROWS - SURFACE_ROW - 10));
      const r    = 2 + Math.floor(Math.random() * 4);
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          if (dr * dr + dc * dc <= r * r) {
            this.setTileRaw(cCol + dc, cRow + dr, TILE_AIR);
          }
        }
      }
    }
  }

  private setTileRaw(col: number, row: number, type: number): void {
    if (col >= 0 && col < WORLD_COLS && row >= 0 && row < WORLD_ROWS) {
      this.tiles[row * WORLD_COLS + col] = type;
    }
  }

  // ── Tile accessors ──────────────────────────────────────────────────────────

  getTile(col: number, row: number): number {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return TILE_STONE;
    return this.tiles[row * WORLD_COLS + col];
  }

  /** Set a tile and queue it for broadcast. Returns the change record. */
  setTile(col: number, row: number, type: number): TileChange | null {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return null;
    this.tiles[row * WORLD_COLS + col] = type;
    const change: TileChange = { col, row, type };
    this.pendingChanges.push(change);
    return change;
  }

  isSolid(col: number, row: number): boolean {
    return this.getTile(col, row) !== TILE_AIR;
  }

  // ── Game actions ─────────────────────────────────────────────────────────────

  /** Remove a tile. Returns the change + loot drop, or null if already air. */
  dig(col: number, row: number): { change: TileChange; drop: { item: string; count: number } | null } | null {
    const tile = this.getTile(col, row);
    if (tile === TILE_AIR) return null;
    const change = this.setTile(col, row, TILE_AIR)!;
    return { change, drop: TILE_DROP[tile] ?? null };
  }

  /** Place a tile. Returns the change, or null if the cell is already occupied. */
  build(col: number, row: number, type: number): TileChange | null {
    if (this.getTile(col, row) !== TILE_AIR) return null;
    return this.setTile(col, row, type);
  }

  // ── Collision ────────────────────────────────────────────────────────────────

  overlapsAnyTile(x: number, y: number, w: number, h: number): boolean {
    const colStart = Math.floor(x / TILE_SIZE);
    const colEnd   = Math.floor((x + w - 1) / TILE_SIZE);
    const rowStart = Math.floor(y / TILE_SIZE);
    const rowEnd   = Math.floor((y + h - 1) / TILE_SIZE);
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        if (this.isSolid(col, row)) return true;
      }
    }
    return false;
  }

  /**
   * Sweep an AABB from (px, py) by (dx, dy) and resolve tile collisions.
   * Resolves horizontal movement first, then vertical (standard platformer order).
   */
  resolveMove(
    px: number, py: number,
    w:  number, h: number,
    dx: number, dy: number,
  ): { x: number; y: number; hitH: boolean; hitV: boolean; onGround: boolean } {
    let x = px, y = py;
    let hitH = false, hitV = false, onGround = false;

    // ── Horizontal ──────────────────────────────────────────────────────────
    x += dx;
    if (this.overlapsAnyTile(x, y, w, h)) {
      hitH = true;
      if (dx > 0) {
        // Moving right — push left so right edge aligns with tile boundary
        x = Math.floor((x + w - 1) / TILE_SIZE) * TILE_SIZE - w;
      } else if (dx < 0) {
        // Moving left — push right so left edge aligns with tile boundary
        x = (Math.floor(x / TILE_SIZE) + 1) * TILE_SIZE;
      }
    }

    // ── Vertical ────────────────────────────────────────────────────────────
    y += dy;
    if (this.overlapsAnyTile(x, y, w, h)) {
      hitV = true;
      if (dy > 0) {
        // Falling — snap to top surface of tile below
        y        = Math.floor((y + h - 1) / TILE_SIZE) * TILE_SIZE - h;
        onGround = true;
      } else if (dy < 0) {
        // Rising — snap to bottom surface of tile above
        y = (Math.floor(y / TILE_SIZE) + 1) * TILE_SIZE;
      }
    }

    // Standing-on-ground check even when not moving vertically
    if (!onGround && this.overlapsAnyTile(x, y + 1, w, h)) {
      onGround = true;
    }

    return { x, y, hitH, hitV, onGround };
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  /** Full tile grid encoded as base64 for initial game state sync. */
  serialize(): string {
    return Buffer.from(this.tiles).toString('base64');
  }

  /** Return and clear queued tile changes for broadcast. */
  flushChanges(): TileChange[] {
    const changes      = this.pendingChanges;
    this.pendingChanges = [];
    return changes;
  }
}
