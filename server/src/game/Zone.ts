import {
  WORLD_COLS, WORLD_ROWS, TILE_SIZE,
  ZONE_DAMAGE_RATE, ZONE_SHRINK_INTERVAL, ZONE_SHRINK_AMOUNT, ZONE_MIN_SIZE,
} from '../constants';

const WORLD_W = WORLD_COLS * TILE_SIZE;
const WORLD_H = WORLD_ROWS * TILE_SIZE;

export interface ZoneState {
  x: number;
  y: number;
  w: number;
  h: number;
  timeUntilShrink: number;
}

export class Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  private shrinkTimer: number;

  constructor() {
    this.x           = 0;
    this.y           = 0;
    this.w           = WORLD_W;
    this.h           = WORLD_H;
    this.shrinkTimer = ZONE_SHRINK_INTERVAL;
  }

  /**
   * Advance zone timer. Returns true when the zone just shrank (clients
   * should receive a fresh zone state).
   */
  update(dt: number): boolean {
    this.shrinkTimer -= dt;
    if (this.shrinkTimer <= 0) {
      this.shrink();
      this.shrinkTimer = ZONE_SHRINK_INTERVAL;
      return true;
    }
    return false;
  }

  private shrink(): void {
    if (this.w <= ZONE_MIN_SIZE && this.h <= ZONE_MIN_SIZE) return;

    const newW = Math.max(ZONE_MIN_SIZE, this.w - ZONE_SHRINK_AMOUNT * 2);
    const newH = Math.max(ZONE_MIN_SIZE, this.h - ZONE_SHRINK_AMOUNT * 2);
    // Keep zone centred
    this.x += (this.w - newW) / 2;
    this.y += (this.h - newH) / 2;
    this.w  = newW;
    this.h  = newH;
  }

  /** True when the centre of the player is inside the safe zone. */
  containsPlayer(px: number, py: number, pw: number, ph: number): boolean {
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    return cx >= this.x && cx <= this.x + this.w
        && cy >= this.y && cy <= this.y + this.h;
  }

  getDamageRate(): number {
    return ZONE_DAMAGE_RATE;
  }

  serialize(): ZoneState {
    return {
      x:              this.x,
      y:              this.y,
      w:              this.w,
      h:              this.h,
      timeUntilShrink: this.shrinkTimer,
    };
  }
}
