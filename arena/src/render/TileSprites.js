/**
 * TileSprites — renders terrain blocks.
 *
 * Uses the real Diggerz tiles when the atlas image is loaded:
 *   grass surface block -> B100_0_PNG
 *   dirt block          -> B108_0_PNG
 *   stone block         -> B216_0_PNG
 * Otherwise it draws pre-rendered procedural textures that read clearly as
 * dirt / grass-topped dirt / stone (not flat rectangles). Procedural tiles are
 * generated once into offscreen canvases and reused, so rendering stays cheap.
 */

const SPRITE_FOR = {
  grass: 'B100_0_PNG',
  dirt: 'B108_0_PNG',
  stone: 'B216_0_PNG',
};

export class TileSprites {
  constructor(assets) {
    this.assets = assets;
    this._cache = new Map(); // `${kind}:${size}` -> canvas
  }

  /**
   * @param kind  'dirt' | 'grass' | 'stone'
   */
  drawTile(ctx, kind, x, y, size) {
    // Real sprite path (active once tiles.png is dropped into assets/).
    if (this.assets && this.assets.draw(ctx, SPRITE_FOR[kind], x, y, size, size)) return;

    // Procedural fallback.
    const tex = this._procedural(kind, size);
    ctx.drawImage(tex, x, y);
  }

  _procedural(kind, size) {
    const key = `${kind}:${size}`;
    let canvas = this._cache.get(key);
    if (canvas) return canvas;

    canvas = makeCanvas(size, size);
    const c = canvas.getContext('2d');
    const rng = mulberry32(hash(key)); // deterministic texture

    if (kind === 'stone') {
      paintBlock(c, size, rng, '#5b626d', '#474d57', '#6d7480');
    } else {
      // dirt body
      paintBlock(c, size, rng, '#7c5230', '#5f3d22', '#8a623c');
      if (kind === 'grass') paintGrassCap(c, size, rng);
    }

    // subtle inner border for block definition
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, size - 1, size - 1);

    this._cache.set(key, canvas);
    return canvas;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function paintBlock(c, size, rng, base, dark, light) {
  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  // speckles
  const n = Math.round(size * size * 0.05);
  for (let i = 0; i < n; i++) {
    const x = (rng() * size) | 0;
    const y = (rng() * size) | 0;
    const s = 1 + ((rng() * 2) | 0);
    c.fillStyle = rng() < 0.5 ? dark : light;
    c.globalAlpha = 0.35 + rng() * 0.4;
    c.fillRect(x, y, s, s);
  }
  c.globalAlpha = 1;
  // top highlight + bottom shadow for a little depth
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(0, 0, size, Math.max(2, size * 0.08));
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(0, size - Math.max(2, size * 0.1), size, Math.max(2, size * 0.1));
}

function paintGrassCap(c, size, rng) {
  const capH = Math.max(6, size * 0.28);
  c.fillStyle = '#4faf45';
  c.fillRect(0, 0, size, capH);
  c.fillStyle = '#3f9038';
  c.fillRect(0, capH - 3, size, 3);
  // a few blades hanging into the dirt
  c.fillStyle = '#5bbd50';
  for (let x = 2; x < size; x += 4 + ((rng() * 3) | 0)) {
    const h = capH + 2 + ((rng() * 5) | 0);
    c.fillRect(x, 0, 2, h);
  }
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(0, 0, size, 2);
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
