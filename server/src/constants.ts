// ── Tick ─────────────────────────────────────────────────────────────────────
export const TICK_RATE = 20;          // ticks per second
export const TICK_DT  = 1 / TICK_RATE; // seconds per tick

// ── World ─────────────────────────────────────────────────────────────────────
export const WORLD_COLS  = 200;
export const WORLD_ROWS  = 150;
export const TILE_SIZE   = 32;        // pixels per tile
export const SURFACE_ROW = 40;        // first solid row (rows 0-39 are sky)

// ── Player physics ────────────────────────────────────────────────────────────
export const PLAYER_WIDTH    = 28;    // pixels
export const PLAYER_HEIGHT   = 46;    // pixels
export const PLAYER_SPEED    = 200;   // horizontal pixels/sec
export const PLAYER_JUMP_VEL = -480;  // pixels/sec (negative = upward)
export const GRAVITY         = 900;   // pixels/sec²
export const MAX_FALL_SPEED  = 700;   // pixels/sec cap
export const MAX_HEALTH      = 100;

// ── Player actions ────────────────────────────────────────────────────────────
export const DIG_RANGE         = 80;  // pixel radius around player centre
export const BUILD_RANGE       = 96;
export const SHOOT_COOLDOWN    = 0.5; // seconds between shots
export const PROJECTILE_SPEED  = 600; // pixels/sec
export const PROJECTILE_DAMAGE = 25;  // hp
export const PROJECTILE_RADIUS = 6;   // pixels (hit-detection circle)
export const PROJECTILE_TTL    = 2.0; // seconds before despawn

// ── Shrinking zone ────────────────────────────────────────────────────────────
export const ZONE_DAMAGE_RATE    = 5;   // hp/sec while outside zone
export const ZONE_SHRINK_INTERVAL = 30; // seconds between shrink steps
export const ZONE_SHRINK_AMOUNT   = 64; // pixels removed per side per step
export const ZONE_MIN_SIZE        = 192; // minimum zone dimension

// ── Matchmaking ───────────────────────────────────────────────────────────────
export const MIN_PLAYERS      = 2;
export const MAX_PLAYERS      = 20;
export const LOBBY_COUNTDOWN  = 5;  // seconds countdown before game starts
export const GAME_START_GRACE = 5;  // seconds of invincibility at game start
