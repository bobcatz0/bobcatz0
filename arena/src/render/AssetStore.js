/**
 * AssetStore — loads the real Diggerz sprite atlas when available.
 *
 * The sprite *rectangles* were recovered from the client and live in
 * `assets/tiles.atlas.json` (698 sprites). The atlas *image* (`tiles.png`) is
 * the original game texture — drop it into `assets/` and every sprite renders
 * for real. Until then `getSprite()` returns null and the renderers fall back
 * to procedural Diggerz-style art, so the prototype always runs.
 *
 * Browser-only (uses Image/fetch), but deliberately small and self-contained.
 */
export class AssetStore {
  constructor(base = 'assets/', atlasFile = 'tiles.atlas.json') {
    this.base = base;
    this.atlasFile = atlasFile; // 'tiles.atlas.json' or 'ui.atlas.json' etc.
    this.image = null;   // HTMLImageElement once the texture loads (else null)
    this.atlas = null;   // { image, sprites: { NAME: [x,y,w,h] } }
    this.ready = false;  // true only when BOTH the atlas json and image exist
  }

  /** Load the atlas json and (optionally) the texture. Safe to await once. */
  async load() {
    try {
      const res = await fetch(this.base + this.atlasFile);
      this.atlas = res.ok ? await res.json() : null;
    } catch {
      this.atlas = null;
    }
    this.image = await this._tryImage(this.base + (this.atlas?.image || 'tiles.png'));
    this.ready = !!(this.image && this.atlas && this.atlas.sprites);
    return this.ready;
  }

  _tryImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // missing texture -> procedural fallback
      img.src = url;
    });
  }

  /**
   * @returns {{ image, sx, sy, sw, sh } | null} the source rect for a named
   * sprite (e.g. "B108_0_PNG"), or null if assets aren't loaded / unknown.
   */
  getSprite(name) {
    if (!this.ready) return null;
    const r = this.atlas.sprites[name];
    if (!r) return null;
    return { image: this.image, sx: r[0], sy: r[1], sw: r[2], sh: r[3] };
  }

  /** Draw a named sprite into a destination rect; returns false if unavailable. */
  draw(ctx, name, dx, dy, dw, dh) {
    const s = this.getSprite(name);
    if (!s) return false;
    ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, dx, dy, dw ?? s.sw, dh ?? s.sh);
    return true;
  }
}
