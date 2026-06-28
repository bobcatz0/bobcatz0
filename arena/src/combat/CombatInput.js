/**
 * CombatInput — the real Diggerz combat controls (DOM):
 *   - mouse position  -> aim
 *   - left mouse      -> use the selected weapon (press edge + held)
 *   - mouse wheel     -> select hotbar slot
 *
 * No J/K, no number keys, no invented controls. Reset / debug toggle are UI
 * buttons (in the page), not keybinds.
 */
export class CombatInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.aimX = canvas.width / 2;
    this.aimY = canvas.height / 2;
    this.using = false;       // left button currently held
    this._usePressed = false; // rising edge
    this._wheel = 0;          // accumulated wheel notches

    canvas.addEventListener('mousemove', (e) => this._setAim(e));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { if (!this.using) this._usePressed = true; this.using = true; this._setAim(e); }
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.using = false; });
    canvas.addEventListener('wheel', (e) => { this._wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _setAim(e) {
    const r = this.canvas.getBoundingClientRect();
    // canvas pixels == world coords (static camera), so scale to canvas size.
    this.aimX = (e.clientX - r.left) * (this.canvas.width / r.width);
    this.aimY = (e.clientY - r.top) * (this.canvas.height / r.height);
  }

  /** Rising edge of the left button since last call. */
  consumeUsePress() { const p = this._usePressed; this._usePressed = false; return p; }

  /** Net wheel direction since last call (-1 / 0 / +1). */
  consumeWheel() { const w = Math.sign(this._wheel); this._wheel = 0; return w; }
}
