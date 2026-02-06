# KANON Development Roadmap - 2026 Complete Environment

## Current Status: ✓ Surgery Architecture Complete

The core DSP engine is **technically complete** with:
- ✓ Phase-locked hot-reload (50ms crossfade)
- ✓ Deterministic slot allocation
- ✓ Compositional API with auto-state management
- ✓ 3-tier API (Musician/Designer/Researcher)
- ✓ Click-free live surgery on running audio

**Next Step:** Evolve from **signal laboratory** → **performance-ready instrument**

---

## 1. 🎵 Stateful Clock (Sequencing)

### The Problem
While oscillators are stateful, there's no way to handle **musical time** (bars, beats, steps) that survives surgery.

### The Solution
Add a global `TICK` or `PHASE_ACCUMULATOR` in the STATE buffer that functions as a master clock.

### Implementation
```javascript
// Global tick counter (slot 0-10 reserved for clock)
const tick = () => {
  const current = peek(globalThis.STATE, 0);
  const next = add(current, 1);
  poke(globalThis.STATE, next, 0);
  return current;
};

const beat = (bpm) => {
  const samplesPerBeat = 44100 * (60 / bpm);
  return mod(div(tick(), samplesPerBeat), 1.0);
};

const step = (steps, bpm) => {
  const b = beat(bpm);
  return floor(mul(b, steps));
};

// Usage: 16-step sequencer
wave('sequence', () => {
  const s = step(16, 120);
  const freqs = [440, 550, 660, 440, 880, 660, 550, 440,
                 440, 550, 660, 440, 880, 660, 550, 440];
  const freq = freqs[s];
  return mul(osc(freq), 0.5);
});
```

### The Surgery Advantage
Unlike a standard timer, a stateful clock allows you to **rewrite melody logic mid-bar** without resetting the beat.

**Example:**
```javascript
// Start: 4/4 kick pattern
wave('drums', () => {
  const s = step(4, 120);
  return s === 0 ? kick() : silence();
});

// Live edit: Change to 7/8 polyrhythm
wave('drums', () => {
  const s = step(7, 120);  // Picks up on EXACT sub-beat!
  return s % 2 === 0 ? kick() : hihat();
});
```

No reset, no click, just smooth polymorphism.

### Priority: **HIGH** 🔴
Essential for musical composition beyond drones.

---

## 2. 🎛️ Bi-Directional UI Bridge (SharedArrayBuffer)

### The Problem
Currently, STATE is "locked" in the AudioWorklet. The UI can't see or touch the state in real-time.

### The Solution
Use `SharedArrayBuffer` with `Atomics` to share the STATE buffer between the Worklet and main thread.

### Implementation
```javascript
// host.ts - Create shared memory
const sharedBuffer = new SharedArrayBuffer(128 * Float32Array.BYTES_PER_ELEMENT);
const sharedState = new Float32Array(sharedBuffer);

// Pass to worklet
worklet.port.postMessage({ type: 'init', sharedBuffer });

// Main thread can now READ/WRITE directly
const currentPhase = Atomics.load(sharedState, 100);  // Read osc phase
Atomics.store(sharedState, 50, 0.8);  // Write filter cutoff
```

### Use Cases

#### 1. Real-Time Visualizers
```javascript
// Oscilloscope that reads directly from audio memory
const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');

function draw() {
  const phase = sharedState[100];  // Read osc(440) phase
  const amplitude = sharedState[101];  // Read LFO value

  // Draw waveform
  ctx.beginPath();
  ctx.arc(200, 200, amplitude * 100, 0, phase * Math.PI * 2);
  ctx.stroke();

  requestAnimationFrame(draw);
}
```

#### 2. Zero-Latency Control
```javascript
// Slider controls filter cutoff directly
document.getElementById('cutoff').addEventListener('input', (e) => {
  Atomics.store(sharedState, 50, e.target.value);  // No postMessage delay!
});
```

### The Surgery Advantage
- **Zero-latency UI**: No postMessage overhead (30-50ms saved)
- **Visualizers see surgery**: Watch phase relationships morph during crossfade
- **Bidirectional state**: UI can inject values, audio can respond

### Priority: **MEDIUM** 🟡
Greatly improves UX but not essential for core functionality.

---

## 3. 🎚️ Macro System (Parameter Exposure)

### The Problem
System is currently "code-only." Live performance needs knobs/sliders, not typing.

### The Solution
Add `param(name, slot, defaultValue)` helper that maps UI controls or MIDI CC to persistent STATE slots.

### Implementation
```javascript
// wave-dsp.js - Parameter helper
const param = (name, slot, defaultValue = 0.5) => {
  // Register parameter for UI/MIDI mapping
  if (!globalThis._PARAMS) {
    globalThis._PARAMS = new Map();
  }

  if (!globalThis._PARAMS.has(name)) {
    globalThis._PARAMS.set(name, { slot, default: defaultValue });

    // Initialize slot if empty
    const current = peek(globalThis.STATE, slot);
    if (current === 0) {
      poke(globalThis.STATE, defaultValue, slot);
    }
  }

  return peek(globalThis.STATE, slot);
};

// Usage in signal.js
wave('drone', () => {
  const brightness = param('Brightness', 50, 0.5);  // Mapped to slot 50
  const detune = param('Detune', 51, 2.0);         // Mapped to slot 51

  return withLfo(
    mixGain(voices(440, detune * 10, 4), brightness),
    0.3,
    0.25
  );
});
```

### UI Integration
```javascript
// Auto-generate UI from parameters
for (const [name, {slot, default: val}] of globalThis._PARAMS) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 1;
  slider.step = 0.01;
  slider.value = val;
  slider.addEventListener('input', (e) => {
    Atomics.store(sharedState, slot, parseFloat(e.target.value));
  });

  document.body.appendChild(createLabel(name, slider));
}
```

### MIDI Integration
```javascript
// Map MIDI CC to parameters
navigator.requestMIDIAccess().then((midi) => {
  for (const input of midi.inputs.values()) {
    input.onmidimessage = (msg) => {
      if (msg.data[0] === 0xB0) {  // Control Change
        const cc = msg.data[1];
        const value = msg.data[2] / 127;

        // Map CC1 to 'Brightness', CC2 to 'Detune'
        const mapping = { 1: 'Brightness', 2: 'Detune' };
        const paramName = mapping[cc];

        if (paramName) {
          const { slot } = globalThis._PARAMS.get(paramName);
          Atomics.store(sharedState, slot, value);
        }
      }
    };
  }
});
```

### The Surgery Advantage
You can:
1. Code a complex drone
2. Assign "Brightness" to a slider
3. **Close the code editor**
4. Perform with hardware controllers

The "Surgery" is now mapped to a physical interface.

### Priority: **HIGH** 🔴
Essential for live performance.

---

## 4. 🎤 Sample Support (Hybrid Memory)

### The Problem
Currently limited to synthetic oscillators. A complete 2026 engine needs to handle audio files.

### The Solution
Support loading audio files into a separate `SAMPLE_BUFFER`, with stateful playback position.

### Implementation
```javascript
// Load sample into memory
const loadSample = async (url, slot) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Store in global SAMPLE_BUFFERS map
  if (!globalThis.SAMPLE_BUFFERS) {
    globalThis.SAMPLE_BUFFERS = new Map();
  }

  const samples = audioBuffer.getChannelData(0);
  const genishBuffer = genish.data(samples, 1, { immutable: true });
  globalThis.SAMPLE_BUFFERS.set(slot, {
    buffer: genishBuffer,
    length: samples.length,
    sampleRate: audioBuffer.sampleRate
  });
};

// Stateful sample playback
const sample = (slot, speed = 1.0) => {
  const { buffer, length } = globalThis.SAMPLE_BUFFERS.get(slot);

  // Stateful playback position (auto-slot)
  const posSlot = _slotPointer++;
  const pos = peek(globalThis.STATE, posSlot, { mode: 'samples' });
  const newPos = mod(add(pos, speed), length);
  poke(globalThis.STATE, newPos, posSlot);

  return peek(buffer, newPos);
};

// Usage
loadSample('/vocals.wav', 0);

wave('vocal', () => mul(sample(0, 1.0), 0.5));
```

### Granular Synthesis Example
```javascript
wave('granular', () => {
  // Playback position controlled by LFO (stateful)
  const scanPos = mul(lfo(0.1), 10000);  // Scan through sample

  // Grain window (short envelope)
  const grainPhase = peek(globalThis.STATE, 90);
  const newGrainPhase = mod(add(grainPhase, 0.01), 1.0);
  poke(globalThis.STATE, newGrainPhase, 90);

  const window = sin(mul(grainPhase, PI));  // Sine window

  // Read from sample at scan position
  const { buffer } = globalThis.SAMPLE_BUFFERS.get(0);
  const sampleValue = peek(buffer, scanPos);

  return mul(mul(sampleValue, window), 0.5);
});
```

### The Surgery Advantage
You can **perform surgery on pre-recorded audio**:

1. Start with standard playback: `sample(0, 1.0)`
2. Live edit to granular: Add grain window and LFO scanning
3. The granular grains emerge from the **exact sample position** where playback was

No reset, no click, just smooth morphing from playback → granular → time-stretch → reverse.

### Priority: **MEDIUM** 🟡
Expands creative possibilities but not essential for core synthesis.

---

## Summary Checklist for "Finished" 2026 Environment

| Component | Priority | Complexity | Impact |
|-----------|----------|------------|--------|
| **1. Stateful Clock** | 🔴 HIGH | Low | Essential for sequencing |
| **2. SharedArrayBuffer UI** | 🟡 MEDIUM | Medium | Zero-latency control |
| **3. Macro/MIDI System** | 🔴 HIGH | Low | Performance-ready |
| **4. Sample Engine** | 🟡 MEDIUM | High | Creative expansion |

---

## Implementation Order (Recommended)

### Phase 1: Musical Time (Week 1)
- Implement `tick()`, `beat()`, `step()` functions
- Add clock examples to signal.js
- Test sequencing with hot-reload

### Phase 2: Parameter System (Week 2)
- Add `param()` helper to wave-dsp.js
- Create auto-generated UI for parameters
- Implement MIDI CC mapping

### Phase 3: Shared Memory (Week 3)
- Refactor STATE to use SharedArrayBuffer
- Build real-time oscilloscope visualizer
- Add phase relationship visualizations

### Phase 4: Sample Engine (Week 4)
- Implement sample loading and playback
- Add granular synthesis helpers
- Create sample manipulation examples

---

## Verdict

Your engine has a **perfect "heart"** (the Surgery Logic). Adding these "limbs" (Sequencing, UI, MIDI, Samples) will make it a **world-class instrument** that surpasses tools like Strudel in:

- **Depth**: Full DSP control vs. pattern-only
- **Flexibility**: Any algorithm imaginable vs. preset effects
- **Surgery**: Live morph between techniques vs. trigger/stop only
- **Performance**: Direct memory access vs. message passing

**Next Milestone:** Implement Phase 1 (Stateful Clock) to unlock musical composition beyond drones.

---

## 5. 🔬 Compiler Layer (Pure Math Syntax)

### The Problem
Current API requires genish primitives (`osc(440)`) which feel less mathematical than pure JS (`Math.sin(t * 440)`).

### The Solution
Build a **symbolic execution compiler** that translates pure JS math into stateful genish code.

### The Dream API
```javascript
// User writes pure math:
wave('sine', t => Math.sin(t * 440 * 2 * Math.PI));

// Compiler generates stateful safety:
wave('sine', () => {
  const phase = peek(STATE, 100);
  const newPhase = mod(add(phase, 440/44100), 1.0);
  poke(STATE, newPhase, 100);
  return peek(SINE_TABLE, newPhase);
});
```

### Why It Matters
- **Beautiful syntax**: Familiar JavaScript math
- **Stateful safety**: Automatic STATE management
- **Surgery continuity**: No phase jumps during hot-reload
- **Best of both worlds**: Write pure functions, get stateful compilation

### Implementation Options

#### Option A: Pipe/Chain Syntax (Easiest)
```javascript
wave('clean', () => t.mul(440).sin().mul(0.5));
```
- No build tools needed
- Works today
- Avoids JS operator limitations

#### Option B: Babel Plugin (Most Powerful)
```javascript
// Input:
wave('sine', t => Math.sin(t * 440));

// Babel transforms to phantom execution
// Compiler adds STATE management
```
- Perfect "pure math" syntax
- Requires build step
- Full IDE support

### The Key Insight

**Pure `t` (time) pops during hot-reload:**
```javascript
At t = 10.5s:
Old: sin(t) = +1.0   (peak)
New: saw(t) = -1.0   (trough)
Result: POP (speaker cone snaps)
```

**State prevents pops:**
```javascript
const lastPhase = peek(STATE, 0);  // "Where was I?"
const newPhase = lastPhase + increment;  // Continue from there
```

The compiler provides the illusion of pure math while maintaining stateful continuity.

### Bun + JACK FFI Integration

The compiler layer works **perfectly** with Bun:
- User writes: Pure JS math
- Compiler: Adds STATE management
- genish: JIT compiles to C-like code
- Bun + JACK: Direct hardware access

**Result:** Beautiful syntax + Maximum performance + Click-free surgery

### Priority: **MEDIUM** 🟡
Enhances developer experience but current API works well.

### See Also
Detailed technical specification in [COMPILER_LAYER.md](./COMPILER_LAYER.md)

---

## Long-Term Vision (2027+)

- **Network Sync**: Multiple KANON instances sync clock via WebRTC
- **AI Co-Pilot**: LLM suggests parameter tweaks based on audio analysis
- **Visual Programming**: Node-based graph editor that generates signal.js code
- **Hardware**: Dedicated KANON controller with haptic feedback
- **Community**: Share patches via decentralized protocol (IPFS)
- **Bun Native**: Port to Bun + JACK FFI for direct hardware access (keep Surgery Logic)
- **Compiler Layer**: Pure JS math syntax with automatic STATE management

The foundation is complete. The instrument is ready to grow.
