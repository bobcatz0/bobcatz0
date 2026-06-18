'use strict';

const ByteWriter = require('../net/ByteWriter');
const { S2C } = require('../net/opcodes');

/**
 * World constants, taken from the client (`l` class):
 *   l._44 = 64   pixels per tile
 *   l._41 = 4    chunk width  (cols per chunk)
 *   l._42 = 4    chunk layers (layer slots per chunk)
 *   l._43 = 4    chunk height (rows per chunk)
 *   l._45 = 128  max columns per layer (grid pre-allocation)
 *   l._46 = 0    layer: background
 *   l._47 = 1    layer: main / collidable terrain (the dig layer)
 *   l._48 = 2    layer: foreground (also the max layer index accepted: t <= 2)
 */
const TILE_SIZE = 64;
const CHUNK = 4;
const MAX_LAYER = 2;

// Valid tile IDs discovered in the client's tile-definition switch:
const TILE = {
  AIR:   0,
  GRASS: 100,
  DIRT:  108,
  STONE: 216,
};

/**
 * Build the world-map packet (S->C opcode 4), consumed by v30:
 *
 *   R2(4)            opcode
 *   R0(0)            int32 (discarded by client)
 *   R2(cols)         s30  — width  in tiles
 *   R2(s32)          s32  — secondary dimension (layer count here)
 *   R2(rows)         s31  — height in tiles
 *   R0(chunkCount)   int32
 *   per chunk:
 *     R0(chunkCol)   int32  -> base col = chunkCol * 4
 *     R0(chunkLayer) int32  -> base layer = chunkLayer * 4
 *     R0(chunkRow)   int32  -> base row = chunkRow * 4
 *     64x R2(packed) uint16 each, in order  for col(0..3){ for layer(0..3){ for row(0..3) } }
 *                    packed = (flags << 11) | tileType   (tileType 0 = air)
 *
 * `world.tileAt(col, layer, row)` supplies the tile id for each cell.
 */
function buildWorldMap(world) {
  const w = new ByteWriter();
  const chunkCols = Math.ceil(world.cols / CHUNK);
  const chunkRows = Math.ceil(world.rows / CHUNK);
  const chunkCount = chunkCols * chunkRows; // one layer-chunk (3 layers fit in 4)

  w.writeUInt16(S2C.WORLD_MAP); // opcode 4
  w.writeInt32(0);              // discarded
  w.writeUInt16(world.cols);    // s30 width
  w.writeUInt16(world.layers);  // s32
  w.writeUInt16(world.rows);    // s31 height
  w.writeInt32(chunkCount);

  for (let cc = 0; cc < chunkCols; cc++) {
    for (let cr = 0; cr < chunkRows; cr++) {
      w.writeInt32(cc); // chunkCol
      w.writeInt32(0);  // chunkLayer (always 0 — 3 real layers fit in a 4-slot chunk)
      w.writeInt32(cr); // chunkRow

      // Emit 4x4x4 cells in the EXACT order the client reads them:
      //   outer: col (k, _41) -> middle: layer (n, _43 bound) -> inner: row (r, _42 bound)
      for (let k = 0; k < CHUNK; k++) {
        const col = cc * CHUNK + k;
        for (let n = 0; n < CHUNK; n++) {
          const layer = n; // chunkLayer*4 + n
          for (let r = 0; r < CHUNK; r++) {
            const row = cr * CHUNK + r;
            let tileType = 0;
            if (layer <= MAX_LAYER) tileType = world.tileAt(col, layer, row);
            w.writeUInt16(tileType & 0x7ff); // flags=0
          }
        }
      }
    }
  }

  return w.toBuffer();
}

module.exports = { buildWorldMap, TILE, TILE_SIZE, CHUNK, MAX_LAYER };
