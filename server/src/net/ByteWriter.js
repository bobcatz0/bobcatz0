'use strict';

/**
 * ByteWriter — mirrors the client's `tb` (Haxe `q9`) packet-writer exactly.
 *
 * Every integer is LITTLE-ENDIAN (the client's Ya buffer uses
 * DataView.setInt32(pos, value, littleEndian=true)).
 *
 * Method names map 1:1 to the client so the protocol is easy to cross-check:
 *   R0 / R1  -> int32        (writeInt32)
 *   R2       -> uint16       (writeUInt16)   <- opcodes use this
 *   R4       -> byte         (writeByte)
 *   R8       -> uuid (4x i32) (writeUUID)
 *   R9       -> string       (writeString)   length-prefixed + NUL
 *   r8       -> split float  (writeSplitFloat)
 *   s0       -> bool as byte (writeBool)
 */
class ByteWriter {
  constructor() {
    this._chunks = [];
    this._length = 0;
  }

  _push(buf) {
    this._chunks.push(buf);
    this._length += buf.length;
  }

  /** R0 / R1 — signed 32-bit little-endian. */
  writeInt32(v) {
    const b = Buffer.allocUnsafe(4);
    b.writeInt32LE(v | 0, 0);
    this._push(b);
    return this;
  }

  /** R2 — unsigned 16-bit little-endian (opcodes, counts, tile values). */
  writeUInt16(v) {
    const b = Buffer.allocUnsafe(2);
    b.writeUInt16LE(v & 0xffff, 0);
    this._push(b);
    return this;
  }

  /** R4 — single byte. */
  writeByte(v) {
    this._push(Buffer.from([v & 0xff]));
    return this;
  }

  /** s0 — boolean encoded as one byte. */
  writeBool(v) {
    return this.writeByte(v ? 1 : 0);
  }

  /**
   * R8 — UUID: four little-endian int32 (P4,P5,P6,P7).
   * Accepts a 4-element array of ints.
   */
  writeUUID(uuid) {
    const u = uuid || [0, 0, 0, 0];
    this.writeInt32(u[0] | 0);
    this.writeInt32(u[1] | 0);
    this.writeInt32(u[2] | 0);
    this.writeInt32(u[3] | 0);
    return this;
  }

  /**
   * R9 — length-prefixed string.
   * Layout: int32(byteLength + 1), then ASCII/UTF-8 bytes, then a trailing NUL.
   * (The client's r5 reads int32 length INCLUDING the NUL.)
   */
  writeString(str) {
    const s = str == null ? '' : String(str);
    const bytes = Buffer.from(s, 'utf8');
    this.writeInt32(bytes.length + 1);
    this._push(bytes);
    this.writeByte(0);
    return this;
  }

  /**
   * r8 — "split float": fixed-point decomposition into two int32.
   *   int32( floor(f) )
   *   int32( floor( (f - floor(f)) * 1e5 ) )
   * Read back by the client's Q4(): intPart + fracPart / 1e5.
   * Precision: 5 decimal places.
   */
  writeSplitFloat(f) {
    const intPart = Math.floor(f);
    const fracPart = Math.floor((f - intPart) * 1e5);
    this.writeInt32(intPart);
    this.writeInt32(fracPart);
    return this;
  }

  get length() {
    return this._length;
  }

  /**
   * Finalize into a single Buffer.
   * The client's A17 pads every outgoing packet to an 8-byte boundary with
   * zeros; we replicate that so the framing is byte-identical to the original.
   */
  toBuffer(padTo8 = true) {
    let buf = Buffer.concat(this._chunks, this._length);
    if (padTo8 && buf.length % 8 !== 0) {
      const pad = 8 - (buf.length % 8);
      buf = Buffer.concat([buf, Buffer.alloc(pad)], buf.length + pad);
    }
    return buf;
  }
}

module.exports = ByteWriter;
