// storage.js - The Signal Well (SharedArrayBuffer Ring Buffer)
// ============================================================================
// "The Well" - Permanent memory that survives hot-reloads
// ============================================================================

// STRIDE: The dimensional count of our signal universe
// STRIDE = 1 (Mono), STRIDE = 2 (Stereo), STRIDE = 4 (XYZW for 3D scope)
export const STRIDE = 1;

// Ring buffer size in frames (~680ms at 48kHz)
const FRAME_COUNT = 32768;

// Initialize SharedArrayBuffer (survives Bun --hot reloads)
globalThis.SIGNAL_WELL ??= {
  sab: new SharedArrayBuffer(FRAME_COUNT * STRIDE * 8), // Float64 = 8 bytes
  ptrSab: new SharedArrayBuffer(8), // 2x Int32 pointers
};

const well = globalThis.SIGNAL_WELL;

// ============================================================================
// Ring Buffer Interface
// ============================================================================

export const ringBuffer = {
  data: new Float64Array(well.sab),
  writeIdx: new Int32Array(well.ptrSab, 0, 1),
  readIdx: new Int32Array(well.ptrSab, 4, 1),
  size: FRAME_COUNT,
  stride: STRIDE,

  /**
   * Write a vector (array of STRIDE floats) to the ring buffer
   * @param {Array<number>} vector - Signal vector [ch0, ch1, ...]
   * @returns {boolean} - true if write succeeded, false if buffer full
   */
  write(vector) {
    const w = Atomics.load(this.writeIdx, 0);
    const r = Atomics.load(this.readIdx, 0);

    // Check if buffer is full
    if (((w + 1) % this.size) === r) return false;

    // Write all channels
    const offset = w * STRIDE;
    for (let i = 0; i < STRIDE; i++) {
      this.data[offset + i] = vector[i] || 0;
    }

    Atomics.store(this.writeIdx, 0, (w + 1) % this.size);
    return true;
  },

  /**
   * Read a vector from the ring buffer
   * @returns {Array<number>} - Signal vector, or zeros if buffer empty
   */
  read() {
    const r = Atomics.load(this.readIdx, 0);
    const w = Atomics.load(this.writeIdx, 0);

    // Empty buffer returns silence
    if (r === w) return new Array(STRIDE).fill(0);

    // Read all channels
    const offset = r * STRIDE;
    const vector = [];
    for (let i = 0; i < STRIDE; i++) {
      vector[i] = this.data[offset + i];
    }

    Atomics.store(this.readIdx, 0, (r + 1) % this.size);
    return vector;
  },

  /**
   * Get available space in buffer
   * @returns {number} - Number of frames that can be written
   */
  availableSpace() {
    const w = Atomics.load(this.writeIdx, 0);
    const r = Atomics.load(this.readIdx, 0);
    return (r - w - 1 + this.size) % this.size;
  },

  /**
   * Get available data in buffer
   * @returns {number} - Number of frames that can be read
   */
  availableData() {
    const w = Atomics.load(this.writeIdx, 0);
    const r = Atomics.load(this.readIdx, 0);
    return (w - r + this.size) % this.size;
  }
};
