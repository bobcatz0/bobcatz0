export class Vector2 {
  constructor(public x: number, public y: number) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    return mag === 0 ? new Vector2(0, 0) : new Vector2(this.x / mag, this.y / mag);
  }

  distanceTo(other: Vector2): number {
    return this.sub(other).magnitude();
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}
