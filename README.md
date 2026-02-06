# Kanon - Live Sound Surgery Engine

> *"All things are number."* - Pythagoras

A state-driven live-coding environment for sound synthesis inspired by the Pythagorean monochord. Edit JavaScript, save, and hear changes instantly with **zero phase resets**. True surgical manipulation of living sound.

## Philosophy

**Kanon** (κανών - "rule" or "measure") embodies Pythagorean music theory - sound as mathematical ratios made audible. Like the ancient monochord that revealed harmony's mathematical foundations, Kanon treats your state array as a vibrating string that never stops.

When you edit parameters, the signal morphs seamlessly because its state persists across code changes. The monochord's string continues vibrating; only the tension changes.

## Quick Start

```bash
# Install dependencies
bun install

# Start the engine (with hot-reload)
bun --hot index.js

# Edit signals.js while running for live surgery!
```

## Architecture

```
┌───────────────────────────────────────────┐
│  signals.js - Live Coding Interface       │  ← Edit this!
├───────────────────────────────────────────┤
│  kanon.js - Signal Registry (FRP)         │  ← State transformers
├───────────────────────────────────────────┤
│  storage.js - Ring Buffer (The Well)      │  ← SharedArrayBuffer
├───────────────────────────────────────────┤
│  transport.js - Audio Sink                │  ← Speaker.js → JACK FFI
├───────────────────────────────────────────┤
│  engine.js - Producer Loop                │  ← setImmediate saturation
└───────────────────────────────────────────┘
```

### Key Features

- **Phase Continuity**: State persists in `globalThis.KANON_STATE` during hot-reload
- **Zero-Copy Architecture**: `subarray()` eliminates GC pauses
- **Soft Clipping**: All signals auto-clipped with `Math.tanh()` for safety
- **48kHz @ 32-bit float**: Native floating-point audio (no int16 quantization)
- **Functional Purity**: Pure state transformers (state → nextState → sample)
- **Dimension Agnostic**: STRIDE=1 (mono) now, upgradable to stereo/3D later

## Basic Usage

### Simple Sine Wave

```javascript
import { kanon } from './kanon.js';

kanon('carrier', (mem, idx) => {
  const freq = 440.0; // Change this and save - NO CLICKS!

  return {
    update: (sr) => {
      // Read-modify-write pattern
      mem[idx] = (mem[idx] + freq / sr) % 1.0;

      // Emit sample
      return [Math.sin(mem[idx] * 2 * Math.PI) * 0.5];
    }
  };
});
```

### Pythagorean Harmony

```javascript
kanon('harmony', (mem, idx) => {
  const fundamental = 220.0; // A3
  const fifth = fundamental * 3/2;  // Perfect fifth (1.5)
  const fourth = fundamental * 4/3; // Perfect fourth (1.333...)

  return {
    update: (sr) => {
      // Three voices in pure Pythagorean ratios
      mem[idx] = (mem[idx] + fundamental / sr) % 1.0;
      mem[idx + 1] = (mem[idx + 1] + fifth / sr) % 1.0;
      mem[idx + 2] = (mem[idx + 2] + fourth / sr) % 1.0;

      const s1 = Math.sin(mem[idx] * 2 * Math.PI);
      const s2 = Math.sin(mem[idx + 1] * 2 * Math.PI);
      const s3 = Math.sin(mem[idx + 2] * 2 * Math.PI);

      return [(s1 + s2 + s3) * 0.2];
    }
  };
});
```

### Vortex Morph (Phase Modulation)

```javascript
kanon('vortex-morph', (mem, idx) => {
  // --- SURGERY PARAMS (change these live!) ---
  const baseFreq = 110.0;      // Deep G2 note
  const modRatio = 1.618;      // Golden Ratio
  const morphSpeed = 0.2;      // Breathe rate (Hz)
  const intensity = 6.0;       // 0.0 = sine, 50.0 = chaos

  return {
    update: (sr) => {
      // Accumulate three phases
      let p1 = mem[idx];         // Carrier
      let p2 = mem[idx + 1];     // Modulator
      let t  = mem[idx + 2];     // LFO

      p1 = (p1 + baseFreq / sr) % 1.0;
      p2 = (p2 + (baseFreq * modRatio) / sr) % 1.0;
      t  = (t + morphSpeed / sr) % 1.0;

      mem[idx] = p1;
      mem[idx + 1] = p2;
      mem[idx + 2] = t;

      // Phase modulation
      const depthLFO = Math.sin(t * 2 * Math.PI) * intensity;
      const modulator = Math.sin(p2 * 2 * Math.PI) * depthLFO;
      const sample = Math.sin(p1 * 2 * Math.PI + modulator);

      return [sample * 0.5];
    }
  };
});
```

### Van der Pol Oscillator

```javascript
const vanDerPolStep = (state, { mu, dt }) => {
  const [x, y] = state;
  const dx = y;
  const dy = mu * (1 - x * x) * y - x;
  return [x + dx * dt, y + dy * dt];
};

kanon('van-der-pol', (mem, idx) => {
  // --- SURGERY PARAMETERS ---
  const params = { mu: 1.5, dt: 0.12 };

  // Initialize if empty
  if (mem[idx] === 0) {
    mem[idx] = 0.1;
    mem[idx + 1] = 0.1;
  }

  return {
    update: () => {
      // Pure functional state transformation
      const current = [mem[idx], mem[idx + 1]];
      const [nextX, nextY] = vanDerPolStep(current, params);

      // Commit to persistent memory
      mem[idx] = nextX;
      mem[idx + 1] = nextY;

      // Emit (X is the signal)
      return [nextX * 0.4];
    }
  };
});
```

## Live Surgery Workflow

1. **Start Kanon**: `bun --hot index.js`
2. **Open** `signals.js` in your editor
3. **Edit** a parameter (e.g., `intensity = 6.0` → `intensity = 12.0`)
4. **Save** (`:w` in Vim)
5. **Hear it morph instantly** with zero discontinuity

### Why It Works

When you save `signals.js`:
1. Bun reloads the module
2. The old signal registry is cleared
3. New `kanon()` calls register fresh closures with updated parameters
4. **State in `globalThis.KANON_STATE` is untouched**
5. Signal continues from exact phase position with new math

This is **phase-continuous hot-swapping** - like adjusting the monochord's string tension while it vibrates.

## State Management

### Persistent State Buffer

```javascript
globalThis.KANON_STATE ??= new Float64Array(1024);
```

Each signal gets a deterministic slot via string hash:

```javascript
kanon('my-signal', (mem, idx) => {
  // You get ~3-4 slots typically
  mem[idx]     // First variable (e.g., phase)
  mem[idx + 1] // Second variable (e.g., LFO)
  mem[idx + 2] // Third variable (e.g., envelope)
  // ...
});
```

**Critical**: State survives hot-reload! This is why oscillators don't click or reset phase when you change parameters.

## API Reference

### Core Functions

#### `kanon(id, factory)`
Register a signal for live surgery.

- **id** (string): Unique identifier
- **factory** (function): `(mem, idx) => { update: (sr) => [samples...] }`
- **Returns**: Signal object

#### `updateAll(sampleRate)`
Mix all registered signals and apply soft clipping.

- **sampleRate** (number): Sample rate (e.g., 48000)
- **Returns**: Array of mixed samples

#### `clear()`
Remove all registered signals. (Called automatically on hot-reload)

#### `list()`
Get array of all registered signal IDs.

#### `remove(id)`
Remove a specific signal by ID.

## Files

- **index.js** - Entry point, console interface
- **engine.js** - Producer loop, lifecycle management
- **kanon.js** - Signal registry & mixing logic
- **storage.js** - Ring buffer (SharedArrayBuffer)
- **transport.js** - Audio output (speaker.js)
- **signals.js** - **YOUR CODE** - Live-codeable signal definitions
- **math-helpers.js** - Vector math utilities (optional)

## Technical Details

- **Runtime**: Bun with `--hot` flag for hot-reload
- **Audio**: speaker.js (48kHz @ 32-bit float)
- **State Memory**: Float64Array (1024 slots, sub-sample precision)
- **Ring Buffer**: SharedArrayBuffer (32768 frames, ~680ms @ 48kHz)
- **Producer Loop**: `setImmediate` saturation for maximum throughput
- **Soft Clipping**: `Math.tanh()` on mixed output

## Why This Architecture?

### vs. Traditional `f(t)` Synthesis

Traditional systems evaluate `f(t)` - a pure function of time:

```javascript
// Can't do live surgery - restarting resets t
const sample = Math.sin(t * 2 * Math.PI * freq);
```

Kanon uses `f(state)` - recursive state transformations:

```javascript
// Phase persists across parameter changes
mem[idx] = (mem[idx] + freq / sr) % 1.0;
const sample = Math.sin(mem[idx] * 2 * Math.PI);
```

### The Monochord Philosophy

Pythagoras discovered that harmony is mathematical using the monochord - a single vibrating string:
- Divide at 1:2 = Octave
- Divide at 2:3 = Perfect Fifth
- Divide at 3:4 = Perfect Fourth

In Kanon:
- Your state array is the vibrating string
- Phase accumulation is continuous vibration
- Hot-reload adjusts tension while the string plays
- The monochord never stops. Neither does your music.

### vs. Lisp/Incudine

See [docs/BEYOND-LISP.md](docs/BEYOND-LISP.md) for philosophical comparison.

**Key advantages**:
- No RT kernel requirement
- Unified memory (audio + visualization)
- JIT optimization (adaptive runtime compilation)
- Web-native deployment
- NPM ecosystem access

## Documentation

- **[SURGERY_GUIDE.md](docs/SURGERY_GUIDE.md)** - Live coding workflow and best practices
- **[BEYOND-LISP.md](docs/BEYOND-LISP.md)** - How Kanon transcends Lisp/Incudine
- **[PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md)** - Optimization strategies
- **[AUDIO_BACKEND_ARCHITECTURE.md](docs/AUDIO_BACKEND_ARCHITECTURE.md)** - Backend design
- **[SAMPLE_RATE_ARCHITECTURE.md](docs/SAMPLE_RATE_ARCHITECTURE.md)** - Sample rate handling
- **[STATE_MANAGEMENT_BEST_PRACTICES.md](docs/STATE_MANAGEMENT_BEST_PRACTICES.md)** - State patterns

## Roadmap

- [x] Core FRP architecture with closures
- [x] Phase-continuous hot-swapping
- [x] 48kHz @ 32-bit float audio
- [x] Zero-copy buffer optimization
- [x] Soft clipping with tanh()
- [ ] Stereo support (STRIDE=2)
- [ ] JACK FFI transport (PULL mode, <10ms latency)
- [ ] 3D oscilloscope integration (STRIDE=4: XYZW)
- [ ] Vim eval integration (select → send → eval)

## Credits

Inspired by:
- Incudine (Common Lisp DSP)
- SuperCollider (live coding pioneer)
- TidalCycles (pattern-based live coding)
- Max/MSP (dataflow paradigm)
- Pythagoras and the monochord

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [speaker](https://github.com/TooTallNate/node-speaker) - Node.js audio output

## License

MIT

---

*"The monochord never stopped vibrating. It just evolved."* - Kanon Engineering Principle
