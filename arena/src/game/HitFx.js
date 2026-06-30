/**
 * HitFx — lightweight, configurable hit/death feedback (VISUAL ONLY).
 *
 * It knows nothing about combat. ArenaScene observes health/alive changes each
 * frame and calls damage()/death()/respawn(); HitFx owns the floating damage
 * numbers, impact sparks, character hit-flash timers, death/respawn rings, and a
 * tiny global hit-pause. Combat values, hitboxes, cooldowns and rules are
 * untouched. All timings/sizes/colours live in `cfg` so it's easy to tune.
 */
export const HITFX_DEFAULTS = {
  number: { rise: 28, time: 0.7, size: 13, color: '#ffffff', bigColor: '#ffe27f', bigAt: 30 },
  spark:  { count: 7, time: 0.3, speed: 115, gravity: 240, size: 2.2, color: '#fff2b0' },
  flash:  { time: 0.18 },   // character hit-flash duration (s)
  hitPause: 0.035,          // global hit-stop on a hit (s); set 0 to disable
  death:   { time: 0.5,  color: '#ff5b5b', ringR: 34 },
  respawn: { time: 0.45, color: '#c3b2ff', ringR: 26 },
};

export class HitFx {
  constructor(config = {}) {
    this.cfg = { ...HITFX_DEFAULTS, ...config };
    this.numbers = [];
    this.sparks = [];
    this.rings = [];
    this.flashes = new Map(); // id -> { t, max }
    this.freeze = 0;          // remaining hit-pause time
  }

  /** A character with id took `amount` damage at world (x, y). */
  damage(x, y, amount, id) {
    const c = this.cfg;
    this.numbers.push({ x, y, amount, t: 0, max: c.number.time });
    const n = c.spark.count;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (i % 2 ? 0.5 : 0);
      this.sparks.push({ x, y, vx: Math.cos(a) * c.spark.speed, vy: Math.sin(a) * c.spark.speed - 25, t: 0, max: c.spark.time });
    }
    if (id != null) this.flashes.set(id, { t: 0, max: c.flash.time });
    if (c.hitPause > 0) this.freeze = Math.max(this.freeze, c.hitPause);
  }

  death(x, y) { this.rings.push({ x, y, t: 0, max: this.cfg.death.time, color: this.cfg.death.color, r: this.cfg.death.ringR }); }
  respawn(x, y) { this.rings.push({ x, y, t: 0, max: this.cfg.respawn.time, color: this.cfg.respawn.color, r: this.cfg.respawn.ringR }); }

  /** True while the sim should be briefly paused (hit-stop). */
  frozen() { return this.freeze > 0; }

  /** Current hit-flash strength for a character id (1 -> 0), 0 if none. */
  flashAmt(id) { const f = this.flashes.get(id); return f ? 1 - f.t / f.max : 0; }

  update(dt) {
    if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
    for (const o of this.numbers) o.t += dt;
    for (const s of this.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += this.cfg.spark.gravity * dt; }
    for (const r of this.rings) r.t += dt;
    this.numbers = this.numbers.filter((o) => o.t < o.max);
    this.sparks = this.sparks.filter((o) => o.t < o.max);
    this.rings = this.rings.filter((o) => o.t < o.max);
    for (const [id, f] of this.flashes) { f.t += dt; if (f.t >= f.max) this.flashes.delete(id); }
  }

  /** Draw sparks / rings / numbers in WORLD space (call inside the camera transform). */
  render(ctx) {
    const c = this.cfg;
    for (const s of this.sparks) {
      const k = 1 - s.t / s.max;
      ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = c.spark.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, c.spark.size * (0.6 + k * 0.4), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const r of this.rings) {
      const k = r.t / r.max;
      ctx.save(); ctx.globalAlpha = (1 - k) * 0.85; ctx.strokeStyle = r.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, 5 + r.r * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (const o of this.numbers) {
      const k = o.t / o.max;
      const y = o.y - c.number.rise * k;
      ctx.save(); ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${c.number.size}px ui-monospace, monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText('-' + o.amount, o.x + 1, y + 1);
      ctx.fillStyle = o.amount >= c.number.bigAt ? c.number.bigColor : c.number.color;
      ctx.fillText('-' + o.amount, o.x, y);
      ctx.textAlign = 'left'; ctx.restore();
    }
  }
}
