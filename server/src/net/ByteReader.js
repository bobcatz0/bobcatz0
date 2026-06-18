'use strict';

/**
 * ByteReader — mirrors the client's `tb` packet-reader.
 *
 * Read methods map 1:1 to the client:
 *   Q9       -> uint16        (readUInt16)   <- opcode is read with this
 *   Q7 / Q8  -> int32         (readInt32)
 *   Q6       -> uuid (4x i32) (readUUID)
 *   Q4       -> split float   (readSplitFloat)
 *   Q3       -> float32       (readFloat32)
 *   r1       -> byte          (readByte)
 *   r5       -> string        (readString)
 *   r6       -> bool          (readBool)
 *
 * All integers little-endian. Bounds are guarded; reads past the end return
 * 0 / "" without throwing, matching the client's defensive behaviour.
 */
class ByteReader {
  constructor(buffer) {
    this.buf = buffer;
    this.pos = 0;
  }

  get remaining() {
    return this.buf.length - this.pos;
  }

  /** Q9 — uint16 LE. */
  readUInt16() {
    if (this.pos + 2 > this.buf.length) return 0;
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  /** Q7 / Q8 — int32 LE. */
  readInt32() {
    if (this.pos + 4 > this.buf.length) return 0;
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  /** Q3 — float32 LE (rarely used by the client). */
  readFloat32() {
    if (this.pos + 4 > this.buf.length) return 0;
    const v = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return v;
  }

  /** Q6 — UUID as [P4,P5,P6,P7] (four int32 LE). */
  readUUID() {
    return [this.readInt32(), this.readInt32(), this.readInt32(), this.readInt32()];
  }

  /** Q4 — split float: intPart + fracPart / 1e5. */
  readSplitFloat() {
    const intPart = this.readInt32();
    const fracPart = this.readInt32();
    return intPart + fracPart / 1e5;
  }

  /** r1 — single byte. */
  readByte() {
    if (this.pos + 1 > this.buf.length) return 0;
    const v = this.buf[this.pos];
    this.pos += 1;
    return v;
  }

  /** r6 — bool (one byte, non-zero == true). */
  readBool() {
    return this.readByte() !== 0;
  }

  /**
   * r5 — length-prefixed string.
   * int32 length (INCLUDING trailing NUL), then (length-1) chars, then NUL.
   */
  readString() {
    const len = this.readInt32();
    if (len <= 0 || this.pos + len > this.buf.length + 1) {
      // Client guards with `Q0 + b >= length`; be permissive but safe.
      if (len <= 0) return '';
    }
    let s = '';
    const charCount = len - 1; // exclude NUL
    for (let i = 0; i < charCount; i++) {
      s += String.fromCharCode(this.readByte());
    }
    this.readByte(); // consume NUL
    return s;
  }
}

module.exports = ByteReader;
