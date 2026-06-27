/**
 * WeaponSystem — recreates the CONFIRMED client side of using an item: it turns
 * "left mouse + selected item + aim" into the same *intent* the client sent
 * (opcode 287 `K._16`), and reports which animation that use plays.
 *
 * It deliberately does NOT model damage, hit detection, range, fire-rate or
 * projectiles: in Diggerz those were resolved on the server, which is not in
 * the client. Inventing them is exactly what we were told not to do. A
 * standalone game plugs its own resolver into the emitted intents.
 *
 * See audit §3. Pure logic, no DOM.
 */

import { ITEM_TYPE } from './ItemSystem.js';
import { ANIM, aimAngle } from './CharacterRig.js';

/**
 * The use packet the client builds (opcode 287, K._16):
 *   origin (x,y), target (x,y) [aim point], mode byte, slot index, [targetUuid]
 * We produce the same shape as a plain object — no wire encoding here.
 */
export function buildUseIntent({ origin, target, mode = 0, slot, targetId = null }) {
  return {
    opcode: 287,
    originX: origin.x,
    originY: origin.y,
    targetX: target.x,
    targetY: target.y,
    mode,            // byte `e` in K._16 (weapon-specific action flag)
    slot,            // q43 — the selected slot
    targetId,        // optional uuid `g`
  };
}

/**
 * Which animation a use plays (confirmed): weapons -> gun_pose (ranged) or hit
 * (melee); placing a block -> build. Melee vs ranged is a per-weapon property
 * the SERVER knew; the client only chose the pose. We expose a hook
 * (`isMelee`) so callers supply that knowledge rather than us inventing it.
 */
export function useAnimation(item, { isMelee } = {}) {
  if (!item) return ANIM.HIT; // bare-hands dig/punch reuses "hit"
  if (item.type === ITEM_TYPE.BLOCK) return ANIM.BUILD;
  if (item.type === ITEM_TYPE.WEAPON) return isMelee ? ANIM.HIT : ANIM.GUN_POSE;
  return ANIM.HIT;
}

/**
 * Resolve a "use" action into a confirmed intent + animation, given the player
 * position, the aim point (world coords), and the selected slot/item.
 *
 * @returns { intent, anim } or null if nothing is usable.
 */
export function resolveUse({ player, aimPoint, hotbar, isMelee, targetId = null }) {
  const item = hotbar.selectedItem;
  const slot = hotbar.selected;
  const origin = { x: player.x, y: player.y };
  const target = aimPoint;

  // Aim angle (the same value sent continuously in the move packet).
  const angle = aimAngle(player.x, player.y, aimPoint.x, aimPoint.y);

  const intent = buildUseIntent({ origin, target, slot, targetId });
  const anim = useAnimation(item, { isMelee });
  return { intent, anim, angle, item };
}

// Explicit, honest gaps (server-authoritative; NOT in the client):
export const SERVER_SIDE_UNKNOWNS = [
  'hit detection (melee overlap, projectile-vs-player)',
  'damage values per weapon',
  'melee range / arc',
  'fire-rate / cooldown',
  'projectile spawn + physics (client only renders server-spawned ones)',
];
