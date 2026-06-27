/**
 * ItemSystem — the REAL Diggerz hotbar/inventory model. From the client:
 * toolbar `n38`, slots `n38.B30[]`, selected index `n38.q43` (-1 = none),
 * item fields h44 (id), a4 (type), g36 (count). Selection is by mouse wheel;
 * there are NO number-key bindings. See audit §3. No invented behavior.
 *
 * Pure logic — no DOM. Item *effects* (damage/range/projectiles) are NOT here:
 * they were server-authoritative and are not in the client.
 */

// Confirmed item types (field `a4`).
export const ITEM_TYPE = {
  BLOCK: 1,  // placeable tile — built with opcode 11; requires count (g36) > 0
  WEAPON: 2, // weapon / tool — used with opcode 287
};

/**
 * An item slot mirrors the confirmed client fields.
 * @param {object} o { id (h44), type (a4), count (g36), subType (b14) }
 */
export function makeItem({ id, type, count = Infinity, subType = 0, name = '' }) {
  return { id, type, count, subType, name };
}

export class Hotbar {
  /** @param {Array} slots  item objects (from makeItem); empties are null. */
  constructor(slots = []) {
    this.slots = slots;        // B30
    this.selected = slots.length ? 0 : -1; // q43 (-1 = nothing)
  }

  get selectedItem() {
    return this.selected >= 0 ? this.slots[this.selected] || null : null;
  }

  /** Select an explicit slot index (or -1 to deselect). */
  select(index) {
    this.selected = index >= 0 && index < this.slots.length ? index : -1;
    return this.selectedItem;
  }

  /**
   * Change selection by wheel direction (the only selection input in Diggerz).
   * @param dir -1 | +1 (q.mWheel sign)
   */
  scroll(dir) {
    if (!this.slots.length || dir === 0) return this.selectedItem;
    const n = this.slots.length;
    const start = this.selected < 0 ? 0 : this.selected;
    this.selected = ((start + Math.sign(dir)) % n + n) % n;
    return this.selectedItem;
  }

  /** Is the selected item a placeable block with remaining count? */
  canBuildSelected() {
    const it = this.selectedItem;
    return !!it && it.type === ITEM_TYPE.BLOCK && it.count > 0;
  }

  /** Is the selected item a weapon/tool? */
  isWeaponSelected() {
    const it = this.selectedItem;
    return !!it && it.type === ITEM_TYPE.WEAPON;
  }
}
