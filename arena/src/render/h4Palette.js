/**
 * h4Palette — the REAL Diggerz colour palette, extracted verbatim from the
 * client's `h4(index)` (see docs/WEAPON_FUNCTION_AUDIT.md §1). The game colours
 * sprites by per-channel multiply with these values: body colours, weapon
 * variants (Blue Ray Gun = grey RAILGUN_PNG x index 4) and shot tracers (u41).
 * CONFIRMED data — indexes not listed multiply by (1,1,1) = untinted.
 */
export const H4 = {
  0: [0.6, 0.6, 0.6], 1: [1, 0.3, 0.3], 2: [0.3, 1, 0.3], 3: [0.3, 1, 1],
  4: [0.3, 0.3, 1], 5: [0.2, 0.2, 0.2], 6: [0.6, 0.3, 1], 8: [1, 0.5, 0.1],
  9: [1, 0.85, 0.15], 10: [1, 0.75, 0.15], 11: [1, 0.53, 1], 12: [0.8, 0.6, 0.4],
  13: [0.2, 0.5, 0.15], 14: [1, 0.75, 0.33], 15: [1, 0.75, 0.33],
  16: [0.15, 0.15, 0.5], 17: [0.5, 0.15, 0.15], 18: [0.3, 0.15, 0.5],
  19: [0.827, 0.541, 0.4], 20: [0.5, 0.35, 0.2],
};

/** Palette entry as [r,g,b] multipliers (default untinted). */
export function h4(index) { return H4[index] || [1, 1, 1]; }

/** Palette entry as a CSS colour string. */
export function h4css(index, alpha = 1) {
  const [r, g, b] = h4(index);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

/**
 * Multiply-tint an atlas sprite {image,sx,sy,sw,sh} by a palette index the way
 * the client does. Returns a drop-in sprite object (or the input if untinted).
 * DOM-dependent (canvas); callers should cache the result.
 */
export function tintSprite(sprite, index) {
  if (!sprite || !H4[index]) return sprite;
  const c = document.createElement('canvas');
  c.width = sprite.sw; c.height = sprite.sh;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite.image, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, sprite.sw, sprite.sh);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = h4css(index); g.fillRect(0, 0, sprite.sw, sprite.sh);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(sprite.image, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, sprite.sw, sprite.sh);
  return { image: c, sx: 0, sy: 0, sw: sprite.sw, sh: sprite.sh };
}
