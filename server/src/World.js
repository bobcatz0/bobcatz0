'use strict';

const { TILE } = require('./protocol/worldmap');

/**
 * Authoritative tile world.
 *
 * Three layers (0 = background, 1 = main/collidable, 2 = foreground), indexed
 * as grid[layer][col][row]. Only layer 1 carries solid terrain in this
 * starter world; combat/decoration layers are left empty for you to extend.
 */
class World {
  constructor(cols = 64, rows = 40, surfaceRow = 20) {
    this.cols = cols;
    this.rows = rows;
    this.layers = 3;
    this.surfaceRow = surfaceRow;
    this.grid = [];
    this._generate();
  }

  _generate() {
    for (let layer = 0; layer < this.layers; layer++) {
      this.grid[layer] = [];
      for (let col = 0; col < this.cols; col++) {
        this.grid[layer][col] = new Array(this.rows).fill(TILE.AIR);
      }
    }

    // Layer 1: solid terrain below the surface, grass on top, stone deep down.
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (row < this.surfaceRow) continue;
        let t = TILE.DIRT;
        if (row === this.surfaceRow) t = TILE.GRASS;
        else if (row > this.surfaceRow + 10) t = TILE.STONE;
        this.grid[1][col][row] = t;
      }
    }
  }

  tileAt(col, layer, row) {
    if (layer < 0 || layer >= this.layers) return TILE.AIR;
    if (col < 0 || col >= this.cols) return TILE.AIR;
    if (row < 0 || row >= this.rows) return TILE.AIR;
    return this.grid[layer][col][row];
  }

  setTile(col, layer, row, type) {
    if (layer < 0 || layer >= this.layers) return false;
    if (col < 0 || col >= this.cols) return false;
    if (row < 0 || row >= this.rows) return false;
    this.grid[layer][col][row] = type;
    return true;
  }
}

module.exports = World;
