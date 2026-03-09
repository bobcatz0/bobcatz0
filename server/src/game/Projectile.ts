import { v4 as uuidv4 } from 'uuid';
import { PROJECTILE_TTL } from '../constants';

export class Projectile {
  id:      string;
  ownerId: string;
  x:       number;
  y:       number;
  vx:      number;
  vy:      number;
  ttl:     number;
  active:  boolean;

  constructor(ownerId: string, x: number, y: number, vx: number, vy: number) {
    this.id      = uuidv4();
    this.ownerId = ownerId;
    this.x       = x;
    this.y       = y;
    this.vx      = vx;
    this.vy      = vy;
    this.ttl     = PROJECTILE_TTL;
    this.active  = true;
  }

  update(dt: number): void {
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.active = false;
  }

  serialize() {
    return {
      id:      this.id,
      ownerId: this.ownerId,
      x:       this.x,
      y:       this.y,
      vx:      this.vx,
      vy:      this.vy,
    };
  }
}
