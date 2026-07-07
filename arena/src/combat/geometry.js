/**
 * geometry — small pure helpers for combat resolution (AABB + arc test).
 * No DOM. An AABB is { x, y, w, h }.
 */

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function center(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A fighter's hurtbox = its body AABB, optionally inset. */
export function bodyHurtbox(body, inset = 0) {
  return { x: body.x + inset, y: body.y + inset, w: body.w - inset * 2, h: body.h - inset * 2 };
}

/**
 * Does the segment (x1,y1)->(x2,y2) intersect the AABB? Slab method. Used for
 * beam-weapon line hitboxes (the beam is a thin line, not a moving projectile).
 */
export function segmentIntersectsAabb(x1, y1, x2, y2, box) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  for (const [p, d, lo, hi] of [[x1, dx, box.x, box.x + box.w], [y1, dy, box.y, box.y + box.h]]) {
    if (d === 0) { if (p < lo || p > hi) return false; continue; }
    let t0 = (lo - p) / d, t1 = (hi - p) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    tmin = Math.max(tmin, t0);
    tmax = Math.min(tmax, t1);
    if (tmin > tmax) return false;
  }
  return true;
}

/**
 * Is point/box `target` within `reach` of `origin` AND within `arc` radians of
 * `aimAngle`? Used for the melee swing (a wedge in the aim direction).
 */
export function withinArc(origin, targetCenter, reach, aimAngle, arcRadians) {
  const dx = targetCenter.x - origin.x;
  const dy = targetCenter.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > reach) return false;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - aimAngle);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  return diff <= arcRadians / 2;
}
