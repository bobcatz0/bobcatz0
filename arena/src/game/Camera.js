/**
 * Camera — a 2D follow camera with smooth motion, hard clamping to the world
 * bounds, and zoom. Pure logic (no DOM): `x`/`y` are the world coords of the
 * viewport's top-left; `zoom` scales the world on screen (1 = native). Zoom only
 * affects rendering — never movement, collision, tile size or physics.
 */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export class Camera {
  constructor(viewW, viewH, worldW, worldH, smoothing = 14) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.smoothing = smoothing;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = 0.75;
    this.maxZoom = 2.0;
    this._recompute();
  }

  setWorld(worldW, worldH) { this.worldW = worldW; this.worldH = worldH; this._recompute(); }

  /** Visible world span (shrinks as you zoom in). */
  get viewWorldW() { return this.viewW / this.zoom; }
  get viewWorldH() { return this.viewH / this.zoom; }

  _recompute() {
    this.maxX = Math.max(0, this.worldW - this.viewWorldW);
    this.maxY = Math.max(0, this.worldH - this.viewWorldH);
  }

  /** Set absolute zoom (clamped to [minZoom, maxZoom]); keeps the centre. */
  setZoom(z, centerWX, centerWY) {
    const cx = centerWX ?? this.x + this.viewWorldW / 2;
    const cy = centerWY ?? this.y + this.viewWorldH / 2;
    this.zoom = clamp(z, this.minZoom, this.maxZoom);
    this._recompute();
    this.snap(cx, cy);
    return this.zoom;
  }

  zoomBy(factor, cx, cy) { return this.setZoom(this.zoom * factor, cx, cy); }
  resetZoom(cx, cy) { return this.setZoom(1, cx, cy); }

  _target(cx, cy) {
    return {
      x: clamp(cx - this.viewWorldW / 2, 0, this.maxX),
      y: clamp(cy - this.viewWorldH / 2, 0, this.maxY),
    };
  }

  follow(cx, cy, dt) {
    const t = this._target(cx, cy);
    const k = 1 - Math.exp(-this.smoothing * Math.max(0, dt));
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
    this._clamp();
  }

  snap(cx, cy) { const t = this._target(cx, cy); this.x = t.x; this.y = t.y; }

  _clamp() { this.x = clamp(this.x, 0, this.maxX); this.y = clamp(this.y, 0, this.maxY); }

  /** Screen/viewport point -> world coords (zoom-aware). */
  screenToWorld(sx, sy) { return { x: this.x + sx / this.zoom, y: this.y + sy / this.zoom }; }
}
