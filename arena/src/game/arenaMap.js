// A larger PvP arena, built programmatically (an 80x34 grid of 40px tiles =
// 3200x1360 world). Solid border walls + ceiling + a wide 2-tile floor, with
// platforms placed in 3-tile vertical steps so every platform is reachable with
// the current jump (max rise ~3.4 tiles) — no impossible jumps. Spawn points
// for P1 (left) and the future P2/dummy (right) are stored in the map config.

const COLS = 80;
const ROWS = 34;
const FLOOR_THICKNESS = 2; // bottom rows that are solid floor

// Platforms as [colStart, colEnd, row] (inclusive). Mirrored left/right with an
// open centre and high central perches. Each sits within 3 rows of a lower
// surface (floor row 32, or another platform), so jumps can always reach them.
const PLATFORMS = [
  // left climb
  [6, 14, 29], [15, 22, 26], [7, 14, 23], [16, 23, 20],
  // right climb (mirror)
  [65, 73, 29], [57, 64, 26], [65, 72, 23], [56, 63, 20],
  // centre
  [36, 43, 29],                 // low centre
  [28, 34, 26], [45, 51, 26],   // centre-left / centre-right mid
  [35, 44, 23],                 // high centre
  [37, 42, 20],                 // top centre perch
];

/**
 * Build the arena.
 * @param {number} tileSize  pixels per tile (default 40)
 * @returns {{ cols, rows, tileSize, grid: Uint8Array, floorRow, worldW, worldH,
 *             spawns: { p1:{x,y}, p2:{x,y} }, platforms }}
 */
export function buildArenaMap(tileSize = 40) {
  const cols = COLS;
  const rows = ROWS;
  const grid = new Uint8Array(cols * rows);
  const set = (c, r) => { if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r * cols + c] = 1; };
  const fill = (c0, c1, r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r); };

  const floorRow = rows - FLOOR_THICKNESS; // top solid row of the floor (32)

  fill(0, cols - 1, 0, 0);                  // ceiling
  fill(0, cols - 1, floorRow, rows - 1);    // wide floor (2 tiles thick)
  fill(0, 0, 0, rows - 1);                  // left boundary wall
  fill(cols - 1, cols - 1, 0, rows - 1);    // right boundary wall
  for (const [c0, c1, r] of PLATFORMS) fill(c0, c1, r, r);

  const PLAYER_H = 36;
  const restY = floorRow * tileSize - PLAYER_H;
  const spawns = {
    p1: { x: 3 * tileSize, y: restY },            // left side
    p2: { x: (cols - 4) * tileSize, y: restY },   // right side (future dummy/P2)
  };

  return {
    cols, rows, tileSize,
    grid,
    floorRow,
    worldW: cols * tileSize,
    worldH: rows * tileSize,
    spawns,
    platforms: PLATFORMS,
  };
}
