import { Vector2 } from '../utils/Vector2';
import { MAX_HEALTH } from '../constants';

export interface PlayerInput {
  left:           boolean;
  right:          boolean;
  jump:           boolean;
  aimX:           number; // world-space coordinate the player is aiming at
  aimY:           number;
  sequenceNumber: number; // for client-side prediction reconciliation
}

export class Player {
  id:           string;
  name:         string;
  skin:         string;
  position:     Vector2;
  velocity:     Vector2;
  health:       number;
  alive:        boolean;
  onGround:     boolean;
  facingRight:  boolean;
  lastInput:    PlayerInput;
  kills:        number;
  inventory:    Map<string, number>;
  shootCooldown: number; // seconds remaining until next shot

  constructor(id: string, name: string, skin: string, x: number, y: number) {
    this.id           = id;
    this.name         = name;
    this.skin         = skin;
    this.position     = new Vector2(x, y);
    this.velocity     = new Vector2(0, 0);
    this.health       = MAX_HEALTH;
    this.alive        = true;
    this.onGround     = false;
    this.facingRight  = true;
    this.lastInput    = { left: false, right: false, jump: false, aimX: x, aimY: y, sequenceNumber: 0 };
    this.kills        = 0;
    this.inventory    = new Map([['wood', 20], ['stone', 0], ['dirt', 0]]);
    this.shootCooldown = 0;
  }

  /** Apply damage. Returns true if the player just died. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  addInventory(item: string, count: number): void {
    this.inventory.set(item, (this.inventory.get(item) ?? 0) + count);
  }

  /** Returns false if insufficient stock. */
  removeInventory(item: string, count: number): boolean {
    const have = this.inventory.get(item) ?? 0;
    if (have < count) return false;
    this.inventory.set(item, have - count);
    return true;
  }

  serialize() {
    return {
      id:          this.id,
      name:        this.name,
      skin:        this.skin,
      x:           this.position.x,
      y:           this.position.y,
      vx:          this.velocity.x,
      vy:          this.velocity.y,
      health:      this.health,
      alive:       this.alive,
      onGround:    this.onGround,
      facingRight: this.facingRight,
      kills:       this.kills,
      inventory:   Object.fromEntries(this.inventory),
    };
  }
}
