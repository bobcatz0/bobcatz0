/**
 * Camera — a 2D follow camera with smooth motion and hard clamping to the world
 * bounds. Pure logic (no DOM): `x`/`y` are the world coords of the viewport's
 * top-left. The viewport stays a fixed size (the screen); the world is larger.
 */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export class Camera {
  constructor(viewW, viewH, worldW, worldH, smoothing = 14) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.setWorld(worldW, worldH);
    this.smoothing = smoothing; // higher = snappier follow (not floaty)
    this.x = 0;
    this.y = 0;
  }

  setWorld(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.maxX = Math.max(0, worldW - this.viewW);
    this.maxY = Math.max(0, worldH - this.viewH);
  }

  /** Desired top-left so (cx,cy) is centred, clamped to the world. */
  _target(cx, cy) {
    return {
      x: clamp(cx - this.viewW / 2, 0, this.maxX),
      y: clamp(cy - this.viewH / 2, 0, this.maxY),
    };
  }

  /** Smoothly follow a world point (cx,cy) over dt seconds. */
  follow(cx, cy, dt) {
    const t = this._target(cx, cy);
    // Frame-rate-independent exponential smoothing.
    const k = 1 - Math.exp(-this.smoothing * Math.max(0, dt));
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
    this._clamp();
  }

  /** Jump instantly to centre on (cx,cy) (used on spawn / reset). */
  snap(cx, cy) {
    const t = this._target(cx, cy);
    this.x = t.x;
    this.y = t.y;
  }

  _clamp() {
    this.x = clamp(this.x, 0, this.maxX);
    this.y = clamp(this.y, 0, this.maxY);
  }

  /** Convert a screen/viewport point to world coords. */
  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }
}
