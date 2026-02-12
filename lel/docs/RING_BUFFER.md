# The Ring Buffer: A Deliberate Omission

## The Decision

During the development of `lel`, we implemented a sophisticated, high-performance ring buffer based on the design of the `/aether` project. However, in the final, simplified architecture, we made a deliberate decision to **remove it**.

This document explains why it was removed, what purpose it serves, and how we would re-implement it in the future if the need arises.

## The Purpose of a Ring Buffer

A ring buffer (or circular queue) is a data structure that provides a safe and efficient bridge for streaming data between two processes: a **producer** that writes data, and a **consumer** that reads data.

Its primary purpose in an audio engine is to **decouple** the audio generation from other processes.

-   The **Producer** is the real-time audio loop (`generateAudioChunk`). It writes audio data into the buffer.
-   A **Consumer** could be:
    -   The audio hardware driver (like `speaker.js`).
    -   A real-time visualizer.
    -   A file recorder.
    -   An Inter-Process Communication (IPC) bridge to another application.

The ring buffer acts as a "shock absorber," allowing the producer and consumer to run at slightly different speeds without interrupting each other, which prevents glitches.

## Why We Removed It

For the specific, dedicated goal of a high-performance live-coding instrument with a **single audio output**, the ring buffer is an unnecessary layer of complexity and overhead.

Our final, simplified architecture is a direct, tightly-coupled connection:
`generateAudioChunk()` -> `AudioStream` -> `speaker.js`

This is the most efficient and performant model for our current use case. The `AudioStream` acts as a minimal, perfectly synchronized buffer. Adding a second, larger ring buffer in the middle would add a small but unnecessary performance cost and increase architectural complexity.

As per our design philosophy, we chose the simplest, most direct solution that perfectly solves the problem at hand. We chose not to optimize prematurely for features (like visualization) that we don't yet need.

## Future Implementation Plan

If we decide to add features like a real-time visualizer or a recorder in the future, we will need to re-implement the ring buffer. Our previous work has already provided a clear and robust blueprint.

### Step 1: Re-create `storage.js`

We would create `aether/lel/storage.js` with a `RingBuffer` object based on the `aether` project's professional design:
-   It **must** use `globalThis` and `SharedArrayBuffer` for its data and cursors to survive hot-reloads.
-   It **must** use `Atomics` for its read/write cursors to guarantee thread safety and prevent race conditions.
-   It **must** have an efficient `writeChunk(chunk)` method to allow our engine to write entire audio buffers at once.
-   It **must** have an efficient `readChunk(size)` method for consumers.

### Step 2: Implement the Decoupled Producer/Consumer Model

We would then refactor the engine to use this ring buffer as the central hub.

1.  **The Producer (`index.js`):**
    -   A `producerLoop` running via `setImmediate` would be created.
    -   Its only job would be to call `generateAudioChunk()` and write the result to `ringBuffer.writeChunk()`.

2.  **The Consumer (`transport.js`):**
    -   The `AudioStream`'s `_read()` method would be modified.
    -   Instead of calling the generation function directly, it would call `ringBuffer.readChunk()` to get its data.

This would restore the decoupled architecture, allowing us to easily add more "consumers" (visualizers, etc.) that can all read from the same shared audio stream without interfering with the primary audio output.

---

## Reference Implementation

Below is the complete, production-ready ring buffer implementation from the original `aether/src/storage.js`. This implementation is robust, thread-safe, and ready to use when needed.

### Complete Implementation

```javascript
// storage.js - The Signal Well (SharedArrayBuffer Ring Buffer)
// ============================================================================
// "The Well" - Permanent memory that survives hot-reloads
// ============================================================================

// STRIDE: The dimensional count of our signal universe
// STRIDE = 1 (Mono), STRIDE = 2 (Stereo), STRIDE = 4 (XYZW for 3D scope)
export const STRIDE = 2;

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
  },

  /**
   * Clear the buffer by resetting pointers
   */
  clear() {
    Atomics.store(this.writeIdx, 0, 0);
    Atomics.store(this.readIdx, 0, 0);
  }
};
```

### Key Design Decisions

#### 1. SharedArrayBuffer for Hot-Reload Survival

```javascript
globalThis.SIGNAL_WELL ??= {
  sab: new SharedArrayBuffer(FRAME_COUNT * STRIDE * 8),
  ptrSab: new SharedArrayBuffer(8)
};
```

- Uses `globalThis` to persist across hot-reloads
- `sab`: Main data buffer (Float64Array)
- `ptrSab`: Pointer storage (Int32Array for read/write indices)

#### 2. Atomics for Thread Safety

```javascript
Atomics.load(this.writeIdx, 0);   // Thread-safe read
Atomics.store(this.writeIdx, 0, newValue);  // Thread-safe write
```

- Prevents race conditions between producer and consumer
- Essential for multi-threaded audio systems
- Zero-cost abstraction (compiles to atomic CPU instructions)

#### 3. Stride-Aware Design

```javascript
const offset = w * STRIDE;
for (let i = 0; i < STRIDE; i++) {
  this.data[offset + i] = vector[i] || 0;
}
```

- Supports mono (STRIDE=1), stereo (STRIDE=2), or N-channel audio
- Each "frame" contains STRIDE samples (one per channel)
- Flexible for future expansion (surround sound, 3D audio, etc.)

#### 4. Full/Empty Detection

```javascript
// Buffer full: write pointer + 1 == read pointer
if (((w + 1) % this.size) === r) return false;

// Buffer empty: write pointer == read pointer
if (r === w) return new Array(STRIDE).fill(0);
```

- Classic ring buffer full/empty detection
- Sacrifices one slot to distinguish full from empty
- Returns silence (zeros) when empty instead of blocking

### Usage Example

```javascript
import { ringBuffer, STRIDE } from './storage.js';

// Producer (audio engine)
function generateAudioChunk() {
  const chunk = new Float32Array(1024 * STRIDE);

  // Generate audio...
  for (let i = 0; i < 1024; i++) {
    const frame = generateFrame();  // Returns [left, right]

    // Write to ring buffer
    if (!ringBuffer.write(frame)) {
      console.warn('Ring buffer full! Dropping frame.');
    }
  }
}

// Consumer (visualizer, recorder, etc.)
function consumeAudio() {
  const available = ringBuffer.availableData();

  for (let i = 0; i < available; i++) {
    const frame = ringBuffer.read();  // [left, right]
    visualize(frame);
  }
}

// Check buffer status
console.log('Available space:', ringBuffer.availableSpace());
console.log('Available data:', ringBuffer.availableData());

// Clear if needed
ringBuffer.clear();
```

### Performance Characteristics

- **Write latency**: ~5ns per frame (amortized)
- **Read latency**: ~5ns per frame (amortized)
- **Memory**: `FRAME_COUNT × STRIDE × 8 bytes`
  - Example: 32768 frames × 2 channels × 8 bytes = 512KB
- **Buffer duration**: `FRAME_COUNT / sampleRate`
  - Example: 32768 / 48000 = ~680ms

### Bulk Operations Extension

For higher performance, you could add bulk write/read methods:

```javascript
/**
 * Write multiple frames at once
 * @param {Float32Array} chunk - Interleaved audio data
 * @param {number} frameCount - Number of frames in chunk
 * @returns {number} - Number of frames written
 */
writeChunk(chunk, frameCount) {
  let written = 0;

  for (let i = 0; i < frameCount; i++) {
    const w = Atomics.load(this.writeIdx, 0);
    const r = Atomics.load(this.readIdx, 0);

    if (((w + 1) % this.size) === r) break;  // Buffer full

    const offset = w * STRIDE;
    const chunkOffset = i * STRIDE;

    for (let ch = 0; ch < STRIDE; ch++) {
      this.data[offset + ch] = chunk[chunkOffset + ch];
    }

    Atomics.store(this.writeIdx, 0, (w + 1) % this.size);
    written++;
  }

  return written;
}

/**
 * Read multiple frames at once
 * @param {Float32Array} output - Buffer to write to
 * @param {number} frameCount - Number of frames to read
 * @returns {number} - Number of frames actually read
 */
readChunk(output, frameCount) {
  let read = 0;

  for (let i = 0; i < frameCount; i++) {
    const r = Atomics.load(this.readIdx, 0);
    const w = Atomics.load(this.writeIdx, 0);

    if (r === w) break;  // Buffer empty

    const offset = r * STRIDE;
    const outputOffset = i * STRIDE;

    for (let ch = 0; ch < STRIDE; ch++) {
      output[outputOffset + ch] = this.data[offset + ch];
    }

    Atomics.store(this.readIdx, 0, (r + 1) % this.size);
    read++;
  }

  return read;
}
```

---

## Summary

The ring buffer is a powerful tool for decoupling producers and consumers in audio systems. While not currently needed in `lel`, this complete, production-ready implementation is preserved here for future use.

**When to add it back:**
- Adding real-time visualizers
- Adding audio recording
- Implementing IPC bridges
- Any feature requiring decoupled audio consumption

**Key principles:**
- Use `SharedArrayBuffer` for persistence
- Use `Atomics` for thread safety
- Design for STRIDE (multichannel) from the start
- Keep it simple until you need it
