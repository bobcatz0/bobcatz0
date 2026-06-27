/**
 * Axis-aligned bounding-box helpers for combat overlap tests.
 * An AABB is { x, y, w, h }. Pure functions, no dependencies.
 */

/** True if rectangles a and b overlap. */
export function overlaps(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Centre point of an AABB. */
export function center(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
