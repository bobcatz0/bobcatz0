/**
 * BeamResolver — resolves a BEAM weapon (Combat V1: Blue Ray Gun, id 79).
 *
 * A beam is NOT a projectile (docs/FRAME_DATA_TERMINOLOGY.md): on use, the
 * whole beam line is cast at once from the muzzle to max range or the first
 * wall impact, then plays out in frame-data phases:
 *
 *   startup frames  — muzzle shine/flash; NO hitbox yet
 *   active frames   — the beam line hitbox can damage (very short, 1–2f)
 *   recovery frames — the beam fades on screen; VISUAL ONLY, no damage
 *
 * 1 design frame = 1/60 s. Damage applies at most once per target per beam.
 * Pure/deterministic — time passed in; collider only needs tile + isSolid.
 */

import { bodyHurtbox, segmentIntersectsAabb } from './geometry.js';

export const FRAME_S = 1 / 60; // 1 design frame (docs/FRAME_DATA_TERMINOLOGY.md)

// Wall-cast step (px). Small vs the 40px tile so the beam can't skip a wall.
const CAST_STEP = 4;

/**
 * Cast a ray from (x,y) along `angle`, stopped by the first solid tile or by
 * `range`. Returns { x, y, impact } — the beam endpoint (where the white
 * endpoint circle renders) and whether it hit a wall.
 */
export function castBeam(x, y, angle, range, collider) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  if (collider) {
    const t = collider.tile;
    for (let d = CAST_STEP; d <= range; d += CAST_STEP) {
      const px = x + cos * d, py = y + sin * d;
      if (collider.isSolid(Math.floor(px / t), Math.floor(py / t))) {
        return { x: px, y: py, impact: true };
      }
    }
  }
  return { x: x + cos * range, y: y + sin * range, impact: false };
}

export class BeamResolver {
  constructor(weapon, collider) {
    this.w = weapon; // { combat: { range, damage, cooldown, startupFrames, activeFrames, recoveryFrames } }
    this.collider = collider;
    this._cooldownUntil = 0;
    this.beams = [];
  }

  cooldownRemaining(now) { return Math.max(0, this._cooldownUntil - now); }

  /**
   * Fire from the muzzle (x,y) toward aimAngle if off cooldown. The beam line
   * (endpoint = wall impact or max range) is locked at the press.
   */
  use(now, x, y, aimAngle, ownerId) {
    if (now < this._cooldownUntil) return false;
    const c = this.w.combat;
    this._cooldownUntil = now + c.cooldown;
    const end = castBeam(x, y, aimAngle, c.range, this.collider);
    this.beams.push({
      x1: x, y1: y, x2: end.x, y2: end.y, impact: end.impact,
      angle: aimAngle, ownerId, t0: now,
      hit: new Set(), // targets already damaged by this beam
    });
    return true;
  }

  /** Frame-data phase of a beam at `now`: startup | active | recovery | done. */
  phase(beam, now) {
    const c = this.w.combat;
    const age = now - beam.t0;
    const su = c.startupFrames * FRAME_S;
    const act = c.activeFrames * FRAME_S;
    const rec = c.recoveryFrames * FRAME_S;
    if (age < su) return 'startup';
    if (age < su + act) return 'active';
    if (age < su + act + rec) return 'recovery';
    return 'done';
  }

  /**
   * Advance beams: damage only during ACTIVE frames (line-vs-hurtbox), then
   * keep fading beams around for rendering until recovery ends.
   * @param targets [{ id, body, health }]
   */
  update(dt, targets, hurtboxInset, onHit, now) {
    const c = this.w.combat;
    for (const b of this.beams) {
      if (this.phase(b, now) !== 'active') continue;
      for (const t of targets) {
        if (t.id === b.ownerId || b.hit.has(t.id)) continue;
        if (t.health && !t.health.alive) continue;
        if (segmentIntersectsAabb(b.x1, b.y1, b.x2, b.y2, bodyHurtbox(t.body, hurtboxInset))) {
          b.hit.add(t.id);
          onHit(t, c.damage);
        }
      }
    }
    this.beams = this.beams.filter((b) => this.phase(b, now) !== 'done');
  }

  clear() { this.beams = []; this._cooldownUntil = 0; }
}
