/**
 * TileCollision — axis-aligned tile collision for a platformer.
 *
 * Pure logic: holds a solid-tile grid and resolves AABB movement against it.
 * No rendering, no DOM, no input. This is the same horizontal-then-vertical
 * swept-AABB resolution used in the Diggerz terrain, written cleanly so it can
 * back any 2D arena.
 */
export class TileCollision {
  /**
   * @param {{ grid: Uint8Array, cols: number, rows: number, tileSize: number }} map
   */
  constructor({ grid, cols, rows, tileSize }) {
    this.grid = grid;
    this.cols = cols;
    this.rows = rows;
    this.tile = tileSize;
  }

  /** Solid if out of bounds (acts as an outer wall) or the cell is filled. */
  isSolid(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true;
    return this.grid[row * this.cols + col] === 1;
  }

  /** Does the AABB (x, y, w, h) overlap any solid tile? */
  overlapsSolid(x, y, w, h) {
    const t = this.tile;
    const c0 = Math.floor(x / t);
    const c1 = Math.floor((x + w - 1) / t);
    const r0 = Math.floor(y / t);
    const r1 = Math.floor((y + h - 1) / t);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) return true;
      }
    }
    return false;
  }

  /**
   * Move an AABB by (dx, dy), resolving collisions one axis at a time
   * (horizontal first, then vertical — the standard platformer order).
   *
   * @returns {{ x, y, hitX, hitY, grounded }}
   *   hitX/hitY: a wall/ceiling/floor was struck on that axis this step.
   *   grounded:  a solid tile is directly underfoot after resolving.
   */
  moveAndCollide(x, y, w, h, dx, dy) {
    const t = this.tile;
    let hitX = false;
    let hitY = false;

    // ── Horizontal ──
    x += dx;
    if (this.overlapsSolid(x, y, w, h)) {
      hitX = true;
      if (dx > 0) {
        x = Math.floor((x + w - 1) / t) * t - w; // snap left edge of the tile
      } else if (dx < 0) {
        x = (Math.floor(x / t) + 1) * t;          // snap right edge of the tile
      }
    }

    // ── Vertical ──
    let grounded = false;
    y += dy;
    if (this.overlapsSolid(x, y, w, h)) {
      hitY = true;
      if (dy > 0) {
        y = Math.floor((y + h - 1) / t) * t - h;   // land on top surface
        grounded = true;
      } else if (dy < 0) {
        y = (Math.floor(y / t) + 1) * t;            // bonk ceiling
      }
    }

    // Standing-on-ground probe (covers the case of zero vertical motion).
    if (!grounded && this.overlapsSolid(x, y + 1, w, h)) grounded = true;

    return { x, y, hitX, hitY, grounded };
  }

  /**
   * If a solid tile sits directly under the AABB's feet, return the exact y at
   * which the body rests flush on that surface; otherwise null. Used to snap a
   * standing player to the ground so it doesn't jitter on the tile boundary.
   */
  floorUnder(x, y, w, h) {
    const t = this.tile;
    const row = Math.floor((y + h) / t); // row just beneath the feet
    const c0 = Math.floor(x / t);
    const c1 = Math.floor((x + w - 1) / t);
    for (let c = c0; c <= c1; c++) {
      if (this.isSolid(c, row)) return row * t - h;
    }
    return null;
  }
}
