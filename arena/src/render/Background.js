/**
 * Background — real Diggerz parallax backdrop from bknd.png.
 *
 * Uses the confirmed scenery sprites (the `sa` atlas: MOUNTAIN, HILL, MOON…)
 * recovered into assets/bknd.atlas.json. Drawn in screen space behind the world
 * with horizontal/vertical parallax (slower than the camera) for depth. If
 * bknd.png is missing it simply draws nothing (the sky gradient still shows).
 */
export class Background {
  constructor(base = 'assets/') {
    this.base = base;
    this.image = null;
    this.atlas = null;
    this.ready = false;
  }

  async load() {
    try {
      const res = await fetch(this.base + 'bknd.atlas.json');
      this.atlas = res.ok ? await res.json() : null;
    } catch { this.atlas = null; }
    this.image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = this.base + (this.atlas?.image || 'bknd.png');
    });
    this.ready = !!(this.image && this.atlas && this.atlas.sprites);
    return this.ready;
  }

  _sprite(name) {
    if (!this.ready) return null;
    const r = this.atlas.sprites[name];
    return r ? { sx: r[0], sy: r[1], sw: r[2], sh: r[3] } : null;
  }

  /**
   * Draw the parallax layers for the current camera.
   * @param cam   { x, y } camera world top-left
   */
  render(ctx, cam, viewW, viewH) {
    if (!this.ready) return;
    // Moon, high and very slow (a far accent).
    this._layer(ctx, 'MOON_PNG', cam, viewW, viewH, { factor: 0.08, scale: 0.5, fromBottom: viewH - 120, alpha: 0.5, tile: false, x: viewW * 0.72 });
    // Mountains — far, slow.
    this._layer(ctx, 'MOUNTAIN_PNG', cam, viewW, viewH, { factor: 0.22, scale: 0.85, fromBottom: 96, alpha: 0.5 });
    // Hills — nearer, faster, darker for depth separation.
    this._layer(ctx, 'HILL_PNG', cam, viewW, viewH, { factor: 0.42, scale: 1.0, fromBottom: 28, alpha: 0.7 });
  }

  _layer(ctx, name, cam, viewW, viewH, opt) {
    const spr = this._sprite(name);
    if (!spr) return;
    const w = spr.sw * opt.scale;
    const h = spr.sh * opt.scale;
    const y = viewH - h - opt.fromBottom + cam.y * opt.factor * 0.25;
    ctx.save();
    ctx.globalAlpha = opt.alpha;
    const draw = (x) => ctx.drawImage(spr.image || this.image, spr.sx, spr.sy, spr.sw, spr.sh, x, y, w, h);
    if (opt.tile === false) {
      draw((opt.x ?? 0) - cam.x * opt.factor);
    } else {
      const offX = -(((cam.x * opt.factor) % w) + w) % w;
      for (let x = offX - w; x < viewW + w; x += w) draw(x);
    }
    ctx.restore();
  }
}
