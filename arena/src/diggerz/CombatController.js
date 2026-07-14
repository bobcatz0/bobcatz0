/**
 * CombatController — wires the CONFIRMED Diggerz action flow:
 *   wheel        -> change selected hotbar slot
 *   left mouse   -> "use" the selected item toward the aim point
 *   (block -> build / weapon -> fire-or-swing / empty -> dig)
 *
 * It emits the same *intent* the client emitted (opcode 287 for a weapon use)
 * and reports the animation to play. It does NOT resolve hits, damage or
 * projectiles — those were server-authoritative and are not in the client.
 * Resolution is delegated to the injected `onUseIntent` callback so a standalone
 * game supplies its own (server or local sim). No invented combat lives here.
 *
 * See audit §3/§4. Pure logic (no DOM); feed it state each step.
 */

import { readMovement, readMouse } from './InputBindings.js';
import { ITEM_TYPE } from './ItemSystem.js';
import { resolveUse } from './WeaponSystem.js';
import { ANIM, locomotionAnim } from './CharacterRig.js';

export class CombatController {
  /**
   * @param hotbar        an ItemSystem.Hotbar
   * @param onUseIntent   (intent, ctx) => void   — YOUR resolver (server/sim)
   * @param isMelee       (item) => boolean        — per-weapon knowledge you own
   */
  constructor({ hotbar, onUseIntent = () => {}, isMelee = () => false } = {}) {
    this.hotbar = hotbar;
    this.onUseIntent = onUseIntent;
    this.isMelee = isMelee;
    this._wasUsing = false;     // edge tracking for the left button
    this.currentAnim = ANIM.IDLE;
    this.lastIntent = null;
  }

  /**
   * Advance one step.
   * @param input { keyState, mouse:{state,wheel} }
   * @param player { x, y, grounded, moving, facing }
   * @param aimPoint { x, y } world-space cursor target
   */
  step(input, player, aimPoint) {
    const move = readMovement(input.keyState);
    const mouse = readMouse(input.mouse);

    // Wheel changes selection (the only selection input in Diggerz).
    if (mouse.wheel !== 0) this.hotbar.scroll(mouse.wheel);

    // Base locomotion animation (overridden by an active use below).
    let anim = locomotionAnim({ grounded: player.grounded, moving: player.moving });

    // "Use" fires on the held left button. We emit on the press edge; whether a
    // weapon is auto/semi is server-defined, so we don't fake auto-fire.
    if (mouse.using && !this._wasUsing) {
      const used = resolveUse({
        player, aimPoint, hotbar: this.hotbar,
        isMelee: this.isMelee(this.hotbar.selectedItem),
      });
      this.lastIntent = used.intent;
      anim = used.anim;
      this.onUseIntent(used.intent, used); // hand off to YOUR resolver
    }
    this._wasUsing = mouse.using;

    this.currentAnim = anim;
    return { move, anim, selected: this.hotbar.selected, intent: this.lastIntent };
  }
}

export { ITEM_TYPE };
