/**
 * InputBindings — the REAL Diggerz control bindings, taken verbatim from the
 * client (`q.KeyDown(code)` calls + mouse state). See
 * docs/DIGGERZ_CLIENT_MECHANICS_AUDIT.md §1. Nothing here is invented.
 *
 * Pure/data + small readers — no DOM. A platform layer feeds it a key-state
 * (set/array of held keyCodes) and a mouse-state; it returns movement and
 * action intent.
 */

// keyCode constants (from the client's q.KeyDown(...) calls).
export const KEY = {
  A: 65, D: 68, W: 87, S: 83,
  LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40,
  SPACE: 32, ESC: 27, TAB: 9, ENTER: 13,
};

// Confirmed action -> keyCodes. (Attacks are mouse-driven; there are NO
// J/K/number-key bindings in Diggerz.)
export const BINDINGS = {
  left: [KEY.A, KEY.LEFT],
  right: [KEY.D, KEY.RIGHT],
  jump: [KEY.W, KEY.UP, KEY.SPACE],
  down: [KEY.S, KEY.DOWN],
  menu: [KEY.ESC],
  scoreboard: [KEY.TAB],
  chat: [KEY.ENTER],
};

// Mouse button state values used by the client (q.mState).
export const MOUSE_UP = 0;
export const MOUSE_DOWN = 1;

// ── STANDALONE PvP PROTOTYPE DIVERGENCE (NOT a confirmed Diggerz binding) ──────
// Diggerz selected the hotbar slot with the mouse wheel. For this PvP prototype
// the wheel zooms the camera instead, and weapon selection moves to the number
// keys for direct/fast swapping. Keyed by KeyboardEvent.code so the DOM layer
// can map a keydown straight to a hotbar slot index.
export const HOTBAR_SLOT_KEYS = {
  Digit1: 0, Numpad1: 0,
  Digit2: 1, Numpad2: 1,
  Digit3: 2, Numpad3: 2,
};

/** Hotbar slot index for a KeyboardEvent.code, or null if it isn't a slot key. */
export function hotbarSlotForCode(code) {
  return code in HOTBAR_SLOT_KEYS ? HOTBAR_SLOT_KEYS[code] : null;
}

/** True if any keyCode bound to `action` is held in `keyState`. */
export function isDown(keyState, action) {
  const has = keyState instanceof Set
    ? (k) => keyState.has(k)
    : (k) => !!keyState[k];
  return (BINDINGS[action] || []).some(has);
}

/**
 * Movement intent from held keys — mirrors the client's read:
 *   left:  A / ArrowLeft     right: D / ArrowRight
 *   jump:  W / ArrowUp / Space    down: S / ArrowDown
 * The client uses a horizontal magnitude of ±3.4; we expose the direction and
 * that raw magnitude so callers can map it to their own units.
 */
export const HORIZONTAL_INPUT = 3.4; // engine units, from the client

export function readMovement(keyState) {
  const left = isDown(keyState, 'left');
  const right = isDown(keyState, 'right');
  return {
    left,
    right,
    jump: isDown(keyState, 'jump'),
    down: isDown(keyState, 'down'),
    axis: (right ? 1 : 0) - (left ? 1 : 0), // -1 / 0 / +1
  };
}

/**
 * Primary-action intent from the mouse. In Diggerz the LEFT button (held)
 * drives use/dig/build; the wheel changes the selected hotbar slot.
 * @param mouse { state, wheel } where state is 0|1 and wheel is -1|0|1
 */
export function readMouse(mouse) {
  return {
    using: mouse.state === MOUSE_DOWN, // left held -> use selected item / dig
    wheel: Math.sign(mouse.wheel || 0), // -1 / 0 / +1 -> change slot
  };
}
