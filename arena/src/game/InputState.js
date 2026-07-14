/**
 * InputState — keyboard input, mapped to game intents.
 *
 * Tracks held keys and produces a per-step snapshot with a rising-edge
 * `jumpPressed`. Browser-only (listens on a DOM target), but deliberately thin
 * so the rest of the game logic stays platform-agnostic and testable.
 */
export class InputState {
  constructor(target = window) {
    this.keys = new Set();
    this._jumpWasHeld = false;

    target.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // Stop the page from scrolling on arrows / space.
      if (JUMP_KEYS.has(e.code) || MOVE_KEYS.has(e.code)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Drop all keys if the window loses focus (avoids "stuck" movement).
    target.addEventListener('blur', () => this.keys.clear());
  }

  /**
   * Snapshot for one movement step. Call once per fixed step: `jumpPressed`
   * fires only on the first call after the jump key goes down, so holding the
   * key never produces repeated jumps and multiple substeps don't double-fire.
   */
  snapshot() {
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const jumpHeld =
      this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW');

    const jumpPressed = jumpHeld && !this._jumpWasHeld;
    this._jumpWasHeld = jumpHeld;

    return { left, right, jumpHeld, jumpPressed };
  }
}

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']);
