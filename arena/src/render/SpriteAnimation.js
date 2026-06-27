/**
 * SpriteAnimation — a tiny, reusable frame stepper for sprite-sheet animation.
 *
 * Independent of how frames are drawn: you give it named states, each a list
 * of frames and an fps, then call `setState()` and `update(dt)`; `frame()`
 * returns the current frame for the active state. Useful for real Diggerz
 * sprite sequences (e.g. weapon/effect sheets) and for driving procedural
 * animation phases.
 *
 * Example:
 *   const anim = new SpriteAnimation({
 *     idle: { frames: ['idle0'], fps: 1 },
 *     run:  { frames: ['run0','run1','run2','run3'], fps: 12, loop: true },
 *   });
 *   anim.setState('run');
 *   anim.update(dt);
 *   const frameName = anim.frame();
 */
export class SpriteAnimation {
  constructor(states = {}) {
    this.states = states;
    this.state = Object.keys(states)[0] || null;
    this.time = 0;
    this.index = 0;
  }

  setState(name) {
    if (name === this.state || !this.states[name]) return;
    this.state = name;
    this.time = 0;
    this.index = 0;
  }

  update(dt) {
    const s = this.states[this.state];
    if (!s || s.frames.length <= 1) return;
    const fps = s.fps || 8;
    this.time += dt;
    const advance = Math.floor(this.time * fps);
    if (advance > 0) {
      this.time -= advance / fps;
      this.index += advance;
      if (s.loop === false) this.index = Math.min(this.index, s.frames.length - 1);
      else this.index %= s.frames.length;
    }
  }

  /** Current frame value (whatever you stored — a sprite name, rect, etc.). */
  frame() {
    const s = this.states[this.state];
    return s ? s.frames[this.index % s.frames.length] : null;
  }

  /** 0..1 progress through the current state's frames (for procedural use). */
  phase() {
    const s = this.states[this.state];
    if (!s || s.frames.length === 0) return 0;
    return (this.index % s.frames.length) / s.frames.length;
  }
}
