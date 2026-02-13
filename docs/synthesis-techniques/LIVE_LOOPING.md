# Live Looping for KANON

**Status**: Design phase - to be implemented after current system testing

## Overview

Adding live looping to KANON's state-based architecture transforms it from a synthesis engine into a performance powerhouse. While traditional loopers (Boss RC series, Ableton Looper) treat audio as static recorded blocks, KANON treats loops as **active, mutable memory** that can be surgically modified during playback.

## Why "Stateful Looping" is Strategic

Traditional loopers record, play back, and maybe overdub. KANON's approach is fundamentally different: **loops are just more state**. This unlocks three capabilities impossible in conventional systems:

### 1. "Surgical" Overdubbing

**Traditional Looper Problem**: Once you overdub, layers are "baked" together permanently.

**KANON Advantage**: You record into a specific region of the LOOP_BUFFER. Because the engine can perform "Surgery" on how that buffer is read, you can change the playback logic of the loop after it's recorded.

**Example**: Record a 4-bar vocal loop. Ten minutes later, rewrite the code to turn that loop into a granular synth or reverse-delayed texture. Since the audio data is just state, it never has to stop playing for you to change its fundamental nature.

### 2. Elastic Time Without Artifacts

**Traditional Problem**: Time-stretching audio in real-time introduces "metallic" artifacts.

**KANON Advantage**: Because you control the phasor that reads the loop, you can implement variable-rate scrubbing with seamless algorithm transitions.

**Example**: Slow down a loop to a near-halt, creating frozen "spectral" textures. Change the code from linear to cubic interpolation mid-performance—your 50ms crossfade ensures the transition is click-free.

### 3. Cross-Modulated Loops

**The "Impossible" Sound**: Use the amplitude of Loop A to modulate the filter cutoff of Loop B.

**Why it Works**: In KANON, everything is in buffers. A loop isn't just a sound; it's a stream of data that any other part of your code can "peek" at. Build a system where your live guitar loop "ducks" your synth drone automatically, all defined in a few lines of JavaScript.

---

## Implementation Strategy

### Memory Architecture

At 44.1kHz, audio memory adds up quickly:
- **1 minute of mono audio** = ~2.6 million samples (~10MB)
- **10 seconds** = 441,000 samples (~1.76MB)

We partition memory to prevent oscillators from overwriting recorded audio:

**In `client/worklet.js` constructor (after STATE_BUFFER creation):**

```javascript
// Create dedicated LOOP_BUFFER (separate from STATE_BUFFER)
if (!globalThis.LOOP_BUFFER) {
  // Start with 10 seconds of mono audio at 44.1kHz = 441,000 samples
  const LOOP_SIZE = 441000;
  globalThis.LOOP_BUFFER = new Float32Array(LOOP_SIZE);

  // Wrap with genish.data() for peek/poke access
  globalThis.LOOPS = genish.data(globalThis.LOOP_BUFFER, 1);
  this.port.postMessage({ type: 'info', message: `LOOP buffer created (${LOOP_SIZE} samples = 10s)` });
}
```

**Memory Map**:
- **STATE_BUFFER** (128 floats): Oscillator phases, LFO state, loop metadata (write heads, read heads)
  - Slots 0-99: Manual allocation (loop control state)
  - Slots 100+: Auto-allocated (oscillators, LFOs)
- **LOOP_BUFFER** (441,000 floats): Raw recorded audio samples
  - Direct addressing by sample index
  - Multiple loops stored sequentially (Loop A: 0-176400, Loop B: 176400-352800, etc.)

**Design Decisions**:
- ✅ **Separate LOOP_BUFFER** prevents oscillators from corrupting audio data
- ✅ **Manual slot allocation (0-99)** for loop metadata ensures deterministic mapping
- ✅ **SharedArrayBuffer upgrade path** for real-time UI waveform visualization

---

## The "Stateful" Looper Primitives

Add these two core functions to make loops available in signal.js:

**In `wave-dsp.js` (around line 231, after `lfo()` function):**

```javascript
// ============================================================================
// LIVE LOOPING (2026 Stateful Surgery Pattern)
// ============================================================================

// Record input into a loop buffer
// loopSlot: slot in STATE for write-head (0-99 range)
// bufferStart: starting index in LOOP_BUFFER
// length: loop length in samples
const record = (input, loopSlot, bufferStart, length) => {
  // Read current write-head position
  const head = g.peek(globalThis.STATE, loopSlot, { mode: 'samples' });

  // Write input to loop buffer
  const writeIndex = g.add(bufferStart, head);
  g.poke(globalThis.LOOPS, input, writeIndex);

  // Advance and wrap write-head
  const nextHead = g.mod(g.add(head, 1), length);
  g.poke(globalThis.STATE, nextHead, loopSlot);

  // Pass through input (for monitoring)
  return input;
};

// Play back from a loop buffer with variable speed
// phaseSlot: slot in STATE for read-head (0-99 range)
// bufferStart: starting index in LOOP_BUFFER
// speed: playback rate (1.0 = normal, 0.5 = half, 2.0 = double, -1.0 = reverse)
// length: loop length in samples
const play = (phaseSlot, bufferStart, speed, length) => {
  // Read current phase
  const phase = g.peek(globalThis.STATE, phaseSlot, { mode: 'samples' });

  // Read sample from buffer (use floor for now, interpolation later)
  const readIndex = g.add(bufferStart, g.floor(phase));
  const sample = g.peek(globalThis.LOOPS, readIndex);

  // Advance phase by speed
  const nextPhase = g.mod(g.add(phase, speed), length);
  g.poke(globalThis.STATE, nextPhase, phaseSlot);

  return sample;
};

// Expose to global scope
globalScope.record = record;
globalScope.play = play;
```

---

## Usage Examples

### Basic Loop Recording & Playback

```javascript
// Define loop "slots" (manual allocation in 0-99 range)
const LOOP_A_WRITE = 0;       // Write-head for loop A
const LOOP_A_PHASE = 1;       // Playback phase for loop A
const LOOP_A_START = 0;       // Starting index in LOOP_BUFFER
const LOOP_A_LENGTH = 176400; // 4 bars at 120bpm = 4 seconds = 176400 samples

wave('live-looper', () => {
  // Get input (for now, use an oscillator as mock input)
  const input = mul(osc(440), 0.3);

  // Record when active (later: hook to keyboard trigger)
  const recorded = record(input, LOOP_A_WRITE, LOOP_A_START, LOOP_A_LENGTH);

  // Playback with LFO-modulated speed (Surgery example!)
  const speed = add(1.0, mul(lfo(0.1), 0.05));
  const playback = play(LOOP_A_PHASE, LOOP_A_START, speed, LOOP_A_LENGTH);

  return playback;
});
```

### The "Surgery" Power Move: Live Algorithm Switching

Once a loop is recording/playing, perform surgery mid-performance:

**Step 1**: Record a 4-bar vocal or synth line:
```javascript
return play(LOOP_A_PHASE, LOOP_A_START, 1.0, LOOP_A_LENGTH);
```

**Step 2**: Perform surgery while it's playing—rewrite to add stutter:
```javascript
// High-speed jumping creates rhythmic stutters
const stutter = mul(lfo(8), 2);
return play(LOOP_A_PHASE, LOOP_A_START, stutter, LOOP_A_LENGTH);
```

**Result**: Your 50ms state-blending crossfade ensures the loop doesn't "pop" when you change the playback speed or algorithm—it smoothly morphs into the new rhythmic behavior.

### Advanced: Time-Stretch Transition

```javascript
// From normal playback
const speed = 1.0;

// To frozen spectral texture (Surgery edit!)
const speed = mul(lfo(0.1), 0.05);  // Near-halt with slow modulation
```

The phase-locked handover system preserves the loop's playback position across the recompilation, so the transition is seamless.

---

## Critical 2026 Optimization: SharedArrayBuffer

Since KANON runs in the browser, use `SharedArrayBuffer` for LOOP_BUFFER. This allows the main-thread UI to **visualize the recording in real-time** (drawing waveforms) without extra `postMessage` overhead.

```javascript
// Upgrade LOOP_BUFFER to SharedArrayBuffer
if (!globalThis.LOOP_BUFFER) {
  const LOOP_SIZE = 441000;
  globalThis.LOOP_BUFFER = new Float32Array(new SharedArrayBuffer(LOOP_SIZE * 4));
  globalThis.LOOPS = genish.data(globalThis.LOOP_BUFFER, 1);
}
```

This enables:
- Real-time waveform display in the UI
- Visual feedback during recording
- Scrubbing/seeking in the main thread without latency

---

## Why This Design is Surgery-Ready

✅ **Phase-locked handover**: 50ms crossfade preserves loop phase when recompiling
✅ **Deterministic slots**: Manual slots (0-99) ensure LOOP_A always maps to same state
✅ **Memory isolation**: LOOP_BUFFER separate from STATE_BUFFER prevents corruption
✅ **Mutable playback**: Speed, interpolation, even the read pattern can be surgically altered

This turns KANON into a **"Live Sampling Laboratory"** where recorded audio is just more state for surgery to manipulate.

---

## Open Questions for Implementation

Before implementing, these decisions need to be made:

1. **Buffer Size**: Is 10 seconds sufficient? For multiple loops: 10s × 4 loops = 40s = ~1.76MB

2. **Input Routing**: For real guitar/mic input, need to wire `AudioWorkletProcessor.process(inputs, ...)` hardware input routing. Currently not connected.

3. **Record Trigger**: How to trigger recording?
   - MIDI note/CC (requires MIDI input implementation)
   - Keyboard via `peek(STATE, REC_TRIGGER_SLOT)` with main thread poke
   - Always-recording circular buffer (ala OP-1)

4. **Interpolation**: Current implementation uses `floor()` for non-1.0 speeds. Should we implement:
   - Linear interpolation (cleaner, minimal cost)
   - Cubic interpolation (highest quality, more CPU)
   - Switchable during surgery?

5. **Cross-Modulation Helper**: How should users peek at Loop A to modulate Loop B?
   - Direct LOOP_BUFFER access: `peek(globalThis.LOOPS, index)`
   - Helper function: `loopPeek(LOOP_A_START, offset)`

---

## Verdict

**Yes, add it.**

Live looping transforms the "Surgery" engine into a performance powerhouse. It allows building complex, multi-layered tracks from scratch, then using code to "mutate" those layers into something entirely new.

This is the ultimate expression of the "Living System" architecture—audio isn't just synthesized, it's **recorded, remembered, and reimagined** in real-time.
