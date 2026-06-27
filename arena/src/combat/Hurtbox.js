/**
 * Hurtbox — the region of a fighter that can be hit.
 *
 * For V1 the hurtbox is the fighter's body AABB (optionally inset a little so
 * the very edges don't count). Kept as a pure function so combat code and the
 * debug renderer agree on exactly one definition.
 */
export function bodyHurtbox(body, inset = 0) {
  return {
    x: body.x + inset,
    y: body.y + inset,
    w: body.w - inset * 2,
    h: body.h - inset * 2,
  };
}
