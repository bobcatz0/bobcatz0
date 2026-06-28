// A large PvP arena, built programmatically (100x38 tiles of 40px = 4000x1520
// world). Wide 2-tile floor, left/right boundary walls, a ceiling, an open
// centre, and spread-out mirrored multi-height platforms placed in 3-tile
// vertical steps so every platform is reachable with the current jump (max rise
// ~3.4 tiles) — no impossible jumps. Spawn points (P1 left, P2 right) are stored
// in the map config.

const COLS = 100;
const ROWS = 38;
const FLOOR_THICKNESS = 2;

// Platforms as [colStart, colEnd, row] (inclusive). floorRow = 36.
const PLATFORMS = [
  // left climb
  [8, 16, 33], [18, 26, 30], [9, 17, 27], [20, 28, 24],
  // right climb (mirror of left around col 99)
  [83, 91, 33], [73, 81, 30], [82, 90, 27], [71, 79, 24],
  // centre
  [44, 55, 33],                 // low centre
  [34, 41, 30], [58, 65, 30],   // centre-left / centre-right mid
  [43, 56, 27],                 // high centre
  [46, 53, 24],                 // top centre perch
];

/**
 * @param {number} tileSize  pixels per tile (default 40)
 * @returns {{ cols, rows, tileSize, grid, floorRow, worldW, worldH,
 *             spawns:{p1:{x,y},p2:{x,y}}, platforms }}
 */
export function buildArenaMap(tileSize = 40) {
  const cols = COLS;
  const rows = ROWS;
  const grid = new Uint8Array(cols * rows);
  const set = (c, r) => { if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = 1; };
  const fill = (c0, c1, r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r); };

  const floorRow = rows - FLOOR_THICKNESS;

  fill(0, cols - 1, 0, 0);                  // ceiling
  fill(0, cols - 1, floorRow, rows - 1);    // wide floor
  fill(0, 0, 0, rows - 1);                  // left wall
  fill(cols - 1, cols - 1, 0, rows - 1);    // right wall
  for (const [c0, c1, r] of PLATFORMS) fill(c0, c1, r, r);

  const PLAYER_H = 36;
  const restY = floorRow * tileSize - PLAYER_H;
  const spawns = {
    p1: { x: 4 * tileSize, y: restY },
    p2: { x: (cols - 5) * tileSize, y: restY },
  };

  return {
    cols, rows, tileSize, grid, floorRow,
    worldW: cols * tileSize,
    worldH: rows * tileSize,
    spawns,
    platforms: PLATFORMS,
  };
}
