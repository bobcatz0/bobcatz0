/**
 * CombatInput — discrete (edge-triggered) action input for combat.
 *
 * Separate from InputState (which handles held movement intents). Combat
 * actions are one-shot events: attack, shoot, toggle debug, reset. Holding a
 * key does not repeat (keydown `repeat` is ignored); cooldowns govern pacing.
 *
 *   J / left mouse   -> 'melee'
 *   K / right mouse  -> 'projectile'
 *   H                -> 'toggleDebug'
 *   R                -> 'reset'
 *
 * Call `consume()` once per frame to get (and clear) the set of actions pressed
 * since the last call.
 */
const KEY_ACTION = {
  KeyJ: 'melee',
  KeyK: 'projectile',
  KeyH: 'toggleDebug',
  KeyR: 'reset',
};

export class CombatInput {
  constructor(target = window, canvas = null) {
    this._pressed = new Set();

    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const action = KEY_ACTION[e.code];
      if (action) {
        this._pressed.add(action);
        e.preventDefault();
      }
    });

    const el = canvas || target;
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this._pressed.add('melee');
      else if (e.button === 2) this._pressed.add('projectile');
    });
    // Right-click shoots; suppress the context menu over the play area.
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Return the set of actions pressed since the last call, and clear it. */
  consume() {
    const pressed = this._pressed;
    this._pressed = new Set();
    return pressed;
  }
}
