// One hand-authored arena. `#` = solid block, `.` = empty, `@` = player spawn.
// 25 columns x 16 rows. Keep every row exactly 25 characters wide.
const ARENA = [
  '#########################',
  '#.......................#',
  '#.......................#',
  '#....######.............#',
  '#.......................#',
  '#................####...#',
  '#...####................#',
  '#.......................#',
  '#...........#####.......#',
  '#.......................#',
  '#..####.................#',
  '#.......................#',
  '#...............####....#',
  '#.......@...............#',
  '#.......................#',
  '#########################',
];

/**
 * Parse the ASCII arena into a flat collision grid + spawn point.
 * Pure data — no rendering, no DOM. Reusable anywhere.
 *
 * @param {number} tileSize  pixels per tile
 * @returns {{ cols, rows, tileSize, grid: Uint8Array, spawn: {x, y} }}
 */
export function buildArenaMap(tileSize = 40) {
  const rows = ARENA.length;
  const cols = ARENA[0].length;
  const grid = new Uint8Array(cols * rows);
  let spawn = { x: tileSize * 2, y: tileSize * 2 };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = ARENA[r][c];
      if (ch === '#') grid[r * cols + c] = 1;
      else if (ch === '@') spawn = { x: c * tileSize, y: r * tileSize };
    }
  }

  return { cols, rows, tileSize, grid, spawn };
}
