# Aither: The Roadmap to Rival SuperCollider

> *"One interface. Five paradigms. 800 lines of code. Infinite expression."*

## The Vision

**Build a live coding audio synthesis environment that:**
- ✨ Unifies all synthesis paradigms under one interface (`f(s) → sample`)
- 🎯 Matches SuperCollider's synthesis power
- 📖 Exceeds SuperCollider's approachability (JavaScript vs sclang)
- 🔥 Introduces philosophical depth (five elements from ancient Greek thought)
- ⚡ Maintains radical simplicity (~1000 lines vs SC's 100,000+)

**We're closer than you think.**

---

## Current State: What We Have Now

### Core Architecture (✅ Complete)

**~800 lines of code. Zero-GC audio loop. Phase continuity. Live hot-reload.**

```javascript
// server.js   - ~230 lines - Audio engine + REPL server
// dsp.js      - ~318 lines - Universal helpers
// speaker.js  - ~43 lines  - Audio output
// cli.js      - ~49 lines  - Command dispatcher
// repl.js     - ~172 lines - Interactive REPL
// ─────────────────────────────
// Total:      ~812 lines
```

### What Works Today (✅)

**The Foundation:**
- ✅ `f(s) → sample` - Universal signature for all paradigms
- ✅ Zero-GC hot path - No allocations in audio loop
- ✅ Phase continuity - State persists across live edits
- ✅ Live REPL - Hot-reload while audio plays
- ✅ UDP-based code injection - Surgical updates

**DSP Helpers:**
- ✅ `pipe()` - Functional composition
- ✅ `mix()` - Signal mixing
- ✅ `lowpass()` - One-pole filter
- ✅ `tremolo()` - Amplitude modulation
- ✅ `delay()` - Delay line with dynamic sizing
- ✅ `feedback()` - Regenerating echo
- ✅ `gain()` - Amplification
- ✅ `pan()` - Stereo panning

**The Five Paradigms:**
- 🔥 **Kanon (Fire)** - Pure time functions (`s.t`)
- 🌍 **Rhythmos (Earth)** - Stateful oscillators (`s.state`, `s.sr`)
- 💨 **Atomos (Air)** - Discrete processes (`s.state`, `s.dt`)
- 💧 **Physis (Water)** - Physics simulation (`s.dt`)
- ✨ **Chora (Aither)** - Spatial synthesis (`s.position`)

**Key Innovation:**
- ✅ **Pure functional cross-signal modulation** - No buses, no global state
- ✅ **Universal helpers** - ONE filter works on ALL paradigms
- ✅ **Stride-agnostic** - Mono/stereo/N-channel automatic

### What Makes This Special

**Already BETTER than SuperCollider at:**

1. **True Paradigm Unification**
   ```javascript
   // ONE FILTER, FIVE PARADIGMS
   const fireSound = s => Math.sin(2*Math.PI*440*s.t);     // Pure
   const earthSound = /* phase accumulator */;              // Stateful
   const waterSound = /* spring simulation */;              // Physics
   const aitherSound = /* spatial field */;                 // Spatial

   // Same filter works on ALL of them
   lowpass(fireSound, 800);
   lowpass(earthSound, 800);
   lowpass(waterSound, 800);
   lowpass(aitherSound, 800);
   ```

2. **Pure Functional Composition**
   ```javascript
   // Control signals are just functions
   const earthEnergy = s => /* ... */;
   const waterTension = s => /* ... */;

   // One paradigm influences another by calling it
   play('influenced', s => {
     const boost = 1 + earthEnergy(s) * 3;
     return waterSpring(s) * boost;
   });

   // No buses, no global state, just function calls
   ```

3. **Spatial Synthesis as First-Class**
   ```javascript
   // Sound doesn't exist until you query the field
   play('field', s => {
     const { x, y, z } = s.position;
     return generateSoundAt(x, y, z, s.t);
   });

   setPosition({ x: 2, y: 1, z: 0 });
   ```

4. **Radical Simplicity**
   - SuperCollider: 100,000+ lines of C++ and sclang
   - Aither: 800 lines of JavaScript
   - Both can do live synthesis, hot-reload, spatial audio

5. **Philosophical Grounding**
   - Five elements from ancient Greek philosophy
   - Each maps to real synthesis paradigms
   - Not just branding - conceptual depth

---

## The Gap: What SuperCollider Has That We Don't

### Core Synthesis Building Blocks

| Feature | SuperCollider | Aither | Priority | Effort |
|---------|--------------|--------|----------|--------|
| **Oscillators** |
| Sine | ✅ SinOsc | ✅ Math.sin | ✅ Have | - |
| Saw | ✅ Saw | ❌ Need | 🔥 High | 30 min |
| Square/Pulse | ✅ Pulse | ❌ Need | 🔥 High | 30 min |
| Triangle | ✅ LFTri | ❌ Need | 🔥 High | 30 min |
| Wavetable | ✅ Osc | ❌ Need | 🔥 High | 2-4 hours |
| **Noise** |
| White | ✅ WhiteNoise | ❌ Need | 🔥 High | 15 min |
| Pink | ✅ PinkNoise | ❌ Need | 🔥 High | 30 min |
| Brown | ✅ BrownNoise | ❌ Need | ⚠️ Medium | 30 min |
| **Filters** |
| Lowpass (1-pole) | ✅ OnePole | ✅ lowpass | ✅ Have | - |
| Resonant LP | ✅ RLPF | ❌ Need | 🔥 High | 2 hours |
| Resonant HP | ✅ RHPF | ❌ Need | 🔥 High | 1 hour |
| Bandpass | ✅ BPF | ❌ Need | 🔥 High | 1 hour |
| Notch | ✅ BRF | ❌ Need | ⚠️ Medium | 1 hour |
| Moog Ladder | ✅ MoogFF | ❌ Need | ⚠️ Medium | 3 hours |
| **Envelopes** |
| ADSR | ✅ EnvGen | ❌ Need | 🔥 High | 2 hours |
| Line | ✅ Line | ❌ Need | 🔥 High | 30 min |
| Exponential | ✅ XLine | ❌ Need | ⚠️ Medium | 1 hour |
| **Effects** |
| Delay | ✅ DelayN | ✅ delay | ✅ Have | - |
| Feedback | ✅ CombN | ✅ feedback | ✅ Have | - |
| Reverb | ✅ FreeVerb | ❌ Need | ⚠️ Medium | 4 hours |
| Distortion | ✅ .distort | ❌ Need | 🔥 High | 30 min |
| Wavefold | ✅ .fold | ❌ Need | 🔥 High | 30 min |
| Compressor | ✅ Compander | ❌ Need | ⚠️ Medium | 3 hours |
| **Modulation** |
| Tremolo | ✅ * | ✅ tremolo | ✅ Have | - |
| Sample & Hold | ✅ Latch | ❌ Need | ⚠️ Medium | 1 hour |
| **Granular** |
| Grain synthesis | ✅ GrainSin | ❌ Need | ⚠️ Medium | 3 hours |
| **Spectral** |
| FFT | ✅ FFT | ❌ Future | 🔮 Optional | 8+ hours |
| **Sample Playback** |
| Buffer playback | ✅ PlayBuf | ❌ Future | 🔮 Optional | 2 hours |

---

## The Roadmap

### Phase 1: Core Synthesis Toolbox (1-2 days) 🔥

**Goal:** Match SuperCollider's fundamental synthesis building blocks.

**Priority: CRITICAL - These are synthesis essentials**

#### 1.1 More Oscillators (2 hours)

```javascript
// src/oscillators.js - NEW FILE

// Band-limited sawtooth
export const saw = (freq) => {
  return expand((s, input, mem, base, chan, f) => {
    const PHASE = 0;
    const frequency = typeof f === 'function' ? f(s) : f;
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    // Band-limited sawtooth using PolyBLEP
    return polyBLEP_saw(mem[base + PHASE], frequency / s.sr);
  }, 'saw', 1);
};

// Band-limited square/pulse
export const square = (freq, width = 0.5) => {
  return expand((s, input, mem, base, chan, f, w) => {
    const PHASE = 0;
    const frequency = typeof f === 'function' ? f(s) : f;
    const pulseWidth = typeof w === 'function' ? w(s) : w;

    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    return polyBLEP_square(mem[base + PHASE], pulseWidth, frequency / s.sr);
  }, 'square', 1);
};

// Triangle wave
export const triangle = (freq) => {
  return expand((s, input, mem, base, chan, f) => {
    const PHASE = 0;
    const frequency = typeof f === 'function' ? f(s) : f;
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    const phase = mem[base + PHASE];
    return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
  }, 'triangle', 1);
};

// Usage
play('bass', pipe(
  saw(55),
  lowpass(_, 800),
  gain(_, 0.5)
));
```

**Deliverable:** `src/oscillators.js` with saw, square, triangle

#### 1.2 Noise Generators (1 hour)

```javascript
// Add to src/dsp.js

// White noise
export const whiteNoise = () => s => Math.random() * 2 - 1;

// Pink noise (Paul Kellet's algorithm)
export const pinkNoise = () => {
  return s => {
    const RAND_STATE = 0;

    // Multiple random generators running at different rates
    let white = Math.random() * 2 - 1;
    s.state[RAND_STATE + 0] = 0.99886 * s.state[RAND_STATE + 0] + white * 0.0555179;
    s.state[RAND_STATE + 1] = 0.99332 * s.state[RAND_STATE + 1] + white * 0.0750759;
    s.state[RAND_STATE + 2] = 0.96900 * s.state[RAND_STATE + 2] + white * 0.1538520;
    s.state[RAND_STATE + 3] = 0.86650 * s.state[RAND_STATE + 3] + white * 0.3104856;
    s.state[RAND_STATE + 4] = 0.55000 * s.state[RAND_STATE + 4] + white * 0.5329522;
    s.state[RAND_STATE + 5] = -0.7616 * s.state[RAND_STATE + 5] - white * 0.0168980;

    const pink = s.state[RAND_STATE + 0] + s.state[RAND_STATE + 1] +
                 s.state[RAND_STATE + 2] + s.state[RAND_STATE + 3] +
                 s.state[RAND_STATE + 4] + s.state[RAND_STATE + 5] +
                 s.state[RAND_STATE + 6] + white * 0.5362;
    s.state[RAND_STATE + 6] = white * 0.115926;

    return pink * 0.11;
  };
};

// Usage
play('wind', pipe(
  pinkNoise(),
  lowpass(_, 2000),
  tremolo(_, 0.2, 0.3),
  gain(_, 0.2)
));
```

**Deliverable:** Add to `src/dsp.js`

#### 1.3 Resonant Filters (3 hours)

```javascript
// Add to src/dsp.js

// State variable filter (resonant lowpass)
const resonantLP_mono = (s, input, mem, base, chan, cutoff, resonance) => {
  const LOW = 0;
  const BAND = 1;

  const cutoffFn = typeof cutoff === 'function' ? cutoff : () => cutoff;
  const resFn = typeof resonance === 'function' ? resonance : () => resonance;

  const freq = cutoffFn(s);
  const q = resFn(s);

  const f = 2 * Math.sin(Math.PI * freq / s.sr);
  const qVal = 1.0 - q;

  const low = mem[base + LOW] || 0;
  const band = mem[base + BAND] || 0;

  const newLow = low + f * band;
  const newHigh = input - newLow - qVal * band;
  const newBand = f * newHigh + band;

  mem[base + LOW] = newLow;
  mem[base + BAND] = newBand;

  return newLow;
};

export const resonantLP = expand(resonantLP_mono, 'resonantLP', 2);

// Resonant highpass (from same state variable filter)
const resonantHP_mono = (s, input, mem, base, chan, cutoff, resonance) => {
  // Same as lowpass but return high instead of low
  // ... (implementation)
};

export const resonantHP = expand(resonantHP_mono, 'resonantHP', 2);

// Bandpass
const bandpass_mono = (s, input, mem, base, chan, center, bandwidth) => {
  // Two resonant filters in series
  // ... (implementation)
};

export const bandpass = expand(bandpass_mono, 'bandpass', 4);

// Usage
play('acid-bass', pipe(
  saw(55),
  resonantLP(_, s => 200 + Math.sin(s.t * 3) * 800, 0.8), // Swept resonant filter
  gain(_, 0.3)
));
```

**Deliverable:** Add to `src/dsp.js`

#### 1.4 Envelopes (2 hours)

```javascript
// src/envelopes.js - NEW FILE

// ADSR envelope generator
export const adsr = (attack, decay, sustain, release, gate) => {
  return s => {
    const PHASE = 0;
    const STAGE = 1;
    const PREV_GATE = 2;

    const a = typeof attack === 'function' ? attack(s) : attack;
    const d = typeof decay === 'function' ? decay(s) : decay;
    const sus = typeof sustain === 'function' ? sustain(s) : sustain;
    const r = typeof release === 'function' ? release(s) : release;
    const g = typeof gate === 'function' ? gate(s) : gate;

    const stage = s.state[STAGE] || 0; // 0=off, 1=attack, 2=decay, 3=sustain, 4=release
    const phase = s.state[PHASE] || 0;
    const prevGate = s.state[PREV_GATE] || 0;

    // Gate transitions
    if (g > 0.5 && prevGate <= 0.5) {
      // Gate on - start attack
      s.state[STAGE] = 1;
      s.state[PHASE] = 0;
    } else if (g <= 0.5 && prevGate > 0.5) {
      // Gate off - start release
      s.state[STAGE] = 4;
      s.state[PHASE] = 0;
    }

    s.state[PREV_GATE] = g;

    let output = 0;

    switch (stage) {
      case 0: // Off
        output = 0;
        break;

      case 1: // Attack
        s.state[PHASE] += s.dt / a;
        if (s.state[PHASE] >= 1.0) {
          s.state[STAGE] = 2;
          s.state[PHASE] = 0;
        }
        output = s.state[PHASE];
        break;

      case 2: // Decay
        s.state[PHASE] += s.dt / d;
        if (s.state[PHASE] >= 1.0) {
          s.state[STAGE] = 3;
          s.state[PHASE] = 0;
        }
        output = 1 - s.state[PHASE] * (1 - sus);
        break;

      case 3: // Sustain
        output = sus;
        break;

      case 4: // Release
        s.state[PHASE] += s.dt / r;
        if (s.state[PHASE] >= 1.0) {
          s.state[STAGE] = 0;
          s.state[PHASE] = 0;
        }
        output = sus * (1 - s.state[PHASE]);
        break;
    }

    return output;
  };
};

// Simple line generator
export const line = (start, end, duration) => {
  return s => {
    const PHASE = 0;
    const startVal = typeof start === 'function' ? start(s) : start;
    const endVal = typeof end === 'function' ? end(s) : end;
    const dur = typeof duration === 'function' ? duration(s) : duration;

    s.state[PHASE] = Math.min((s.state[PHASE] || 0) + s.dt / dur, 1.0);

    return startVal + (endVal - startVal) * s.state[PHASE];
  };
};

// Usage
const gate = s => s.t % 2 < 1 ? 1 : 0; // 1 second on, 1 second off

play('enveloped', s => {
  const env = adsr(0.01, 0.3, 0.5, 1.0, gate)(s);
  return saw(440)(s) * env * 0.3;
});
```

**Deliverable:** `src/envelopes.js`

#### 1.5 Waveshaping (1 hour)

```javascript
// Add to src/dsp.js

// Soft clipping distortion
export const distort = (signal, amount) => {
  const amtFn = typeof amount === 'function' ? amount : () => amount;
  return s => {
    const input = signal(s);
    const a = amtFn(s);
    // Soft saturation
    return Math.tanh(input * (1 + a * 10)) / (1 + a);
  };
};

// Wave folding
export const wavefold = (signal, threshold) => {
  const threshFn = typeof threshold === 'function' ? threshold : () => threshold;
  return s => {
    let x = signal(s);
    const t = threshFn(s);

    // Fold the wave when it exceeds threshold
    while (x > t) x = 2 * t - x;
    while (x < -t) x = -2 * t - x;

    return x;
  };
};

// Wave wrapping
export const wavewrap = (signal, threshold) => {
  const threshFn = typeof threshold === 'function' ? threshold : () => threshold;
  return s => {
    let x = signal(s);
    const t = threshFn(s);
    const range = 2 * t;

    // Wrap around threshold
    while (x > t) x -= range;
    while (x < -t) x += range;

    return x;
  };
};

// Usage
play('distorted', pipe(
  saw(110),
  distort(_, s => Math.sin(s.t * 0.5) * 0.5 + 0.5), // Modulated distortion
  lowpass(_, 2000),
  gain(_, 0.3)
));
```

**Deliverable:** Add to `src/dsp.js`

---

### Phase 2: Wavetable Synthesis (1 day) 🔥

**Goal:** Enable complex, evolving timbres through wavetable morphing.

**Priority: HIGH - Modern synthesis standard**

#### 2.1 Buffer Pool & Wavetable Oscillator (4 hours)

```javascript
// src/wavetables.js - NEW FILE

// Global buffer pool
const BUFFER_POOL = new Map();
const MAX_BUFFER_SIZE = 480_000; // 10 seconds @ 48kHz

// Load any buffer
export function loadBuffer(name, data) {
  if (data.length > MAX_BUFFER_SIZE) {
    throw new Error(`Buffer "${name}" too large`);
  }
  BUFFER_POOL.set(name, Float32Array.from(data));
  console.log(`[Aither] Loaded buffer "${name}": ${data.length} samples`);
}

// Create wavetable from generator
export function createWavetable(name, generator, size = 2048) {
  const data = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = generator(i / size);
  }
  loadBuffer(name, data);
}

// Wavetable oscillator
export const wavetable = (tableName, freq) => {
  return expand((s, input, mem, base, chan, f) => {
    const PHASE = 0;
    const buffer = BUFFER_POOL.get(tableName);
    if (!buffer) return 0;

    const frequency = typeof f === 'function' ? f(s) : f;
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    // Linear interpolation
    const readPos = mem[base + PHASE] * buffer.length;
    const index = Math.floor(readPos);
    const frac = readPos - index;
    const sample1 = buffer[index];
    const sample2 = buffer[(index + 1) % buffer.length];

    return sample1 + (sample2 - sample1) * frac;
  }, 'wavetable', 1);
};

// Pre-create standard wavetables
createWavetable('sine', phase => Math.sin(2 * Math.PI * phase));
createWavetable('saw', phase => 2 * phase - 1);
createWavetable('square', phase => phase < 0.5 ? 1 : -1);
createWavetable('triangle', phase =>
  phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase
);

// Usage
play('wt', pipe(
  wavetable('saw', 110),
  lowpass(_, 1000),
  gain(_, 0.3)
));
```

#### 2.2 Wavetable Morphing (2 hours)

```javascript
// Add to src/wavetables.js

// Create wavetable bank
export function createWavetableBank(name, tables) {
  BUFFER_POOL.set(name, tables);
}

// Morphing wavetable oscillator
export const wavetableMorph = (bankName, position, freq) => {
  return expand((s, input, mem, base, chan, pos, f) => {
    const PHASE = 0;
    const bank = BUFFER_POOL.get(bankName);
    if (!bank || bank.length === 0) return 0;

    const p = typeof pos === 'function' ? pos(s) : pos;
    const frequency = typeof f === 'function' ? f(s) : f;

    // Clamp position to bank range
    const position = Math.max(0, Math.min(bank.length - 1, p));
    const index1 = Math.floor(position);
    const index2 = Math.min(index1 + 1, bank.length - 1);
    const morph = position - index1;

    const table1 = bank[index1];
    const table2 = bank[index2];

    // Phase accumulation
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    // Read from both tables
    const readPos = mem[base + PHASE] * table1.length;
    const idx = Math.floor(readPos);
    const frac = readPos - idx;

    const s1a = table1[idx];
    const s1b = table1[(idx + 1) % table1.length];
    const sample1 = s1a + (s1b - s1a) * frac;

    const s2a = table2[idx];
    const s2b = table2[(idx + 1) % table2.length];
    const sample2 = s2a + (s2b - s2a) * frac;

    // Morph between tables
    return sample1 * (1 - morph) + sample2 * morph;
  }, 'wavetableMorph', 1);
};

// Create a morphing bank (sine → saw)
const bank = [];
for (let i = 0; i < 64; i++) {
  const t = i / 63;
  const table = new Float32Array(2048);

  for (let j = 0; j < 2048; j++) {
    const phase = j / 2048;
    const sine = Math.sin(2 * Math.PI * phase);
    const saw = 2 * phase - 1;
    table[j] = sine * (1 - t) + saw * t;
  }

  bank.push(table);
}
createWavetableBank('sine-to-saw', bank);

// Usage
play('morph', wavetableMorph('sine-to-saw',
  s => Math.sin(s.t * 0.2) * 32 + 32, // Sweep through bank
  110
));
```

**Deliverable:** `src/wavetables.js` with full wavetable support

---

### Phase 3: Granular Synthesis (1-2 days) ⚠️

**Goal:** Fully implement the 💨 Atomos (Air) paradigm.

**Priority: MEDIUM - Completes the five paradigms**

#### 3.1 Grain Cloud Generator (4 hours)

```javascript
// src/granular.js - NEW FILE

// Grain cloud synthesis
export const grainCloud = (bufferName, density, grainSize, pitchVariation = 0) => {
  return expand((s, input, mem, base, chan, dens, size, pitch) => {
    const MAX_GRAINS = 32;
    const GRAIN_PHASES = base;
    const GRAIN_STARTS = base + MAX_GRAINS;
    const GRAIN_PITCHES = base + MAX_GRAINS * 2;
    const TRIGGER_PHASE = base + MAX_GRAINS * 3;

    const buffer = BUFFER_POOL.get(bufferName);
    if (!buffer) return 0;

    const d = typeof dens === 'function' ? dens(s) : dens;
    const gs = typeof size === 'function' ? size(s) : size;
    const pv = typeof pitch === 'function' ? pitch(s) : pitch;

    // Trigger new grains based on density
    mem[TRIGGER_PHASE] = (mem[TRIGGER_PHASE] || 0) + d / s.sr;
    if (mem[TRIGGER_PHASE] >= 1.0) {
      mem[TRIGGER_PHASE] -= 1.0;

      // Find free grain slot
      for (let i = 0; i < MAX_GRAINS; i++) {
        if ((mem[GRAIN_PHASES + i] || 0) >= 1.0 || mem[GRAIN_PHASES + i] === 0) {
          mem[GRAIN_PHASES + i] = 0.001; // Start new grain
          mem[GRAIN_STARTS + i] = Math.random(); // Random position in buffer
          mem[GRAIN_PITCHES + i] = 1.0 + (Math.random() * 2 - 1) * pv; // Random pitch
          break;
        }
      }
    }

    // Sum all active grains
    let output = 0;
    const grainSizeSamples = gs * s.sr;

    for (let i = 0; i < MAX_GRAINS; i++) {
      const phase = mem[GRAIN_PHASES + i] || 0;
      if (phase > 0 && phase < 1.0) {
        // Hann window
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * phase));

        // Read from buffer
        const startPos = mem[GRAIN_STARTS + i] * buffer.length;
        const pitchMult = mem[GRAIN_PITCHES + i];
        const readPos = startPos + phase * grainSizeSamples * pitchMult;
        const idx = Math.floor(readPos) % buffer.length;

        output += buffer[idx] * window;

        // Advance grain phase
        mem[GRAIN_PHASES + i] = phase + (1.0 / grainSizeSamples);
      }
    }

    return output / MAX_GRAINS;
  }, 'grainCloud', 32 * 4 + 1);
};

// Usage
loadBuffer('texture', recordedAudio);

play('granular', pipe(
  grainCloud('texture',
    20,    // 20 grains per second
    0.05,  // 50ms grains
    0.5    // ±50% pitch variation
  ),
  lowpass(_, 2000),
  gain(_, 0.3)
));
```

**Deliverable:** `src/granular.js`

---

### Phase 4: Polish & Examples (Ongoing) ⚠️

**Goal:** Make Aither accessible and documented.

**Priority: MEDIUM - User experience**

#### 4.1 Comprehensive Examples

- Update `live-session.js` with all new features
- Create `examples/` directory with:
  - `01-basics.js` - Oscillators, filters, envelopes
  - `02-rhythmos.js` - Stateful patterns
  - `03-physis.js` - Physics simulations
  - `04-chora.js` - Spatial synthesis
  - `05-granular.js` - Atomos paradigm
  - `06-composition.js` - Full piece using all paradigms

#### 4.2 Documentation

- Tutorial series in `docs/tutorials/`
- Video walkthroughs
- API reference
- Migration guide for SuperCollider users

#### 4.3 Performance Benchmarks

- Compare against SuperCollider
- Optimize hot paths
- Profile memory usage

---

### Phase 5: Advanced Features (Future) 🔮

**Priority: OPTIONAL - Nice to have**

#### 5.1 MIDI Support (2-3 days)
- MIDI input handling
- Note-on/note-off events
- CC mapping to parameters
- MPE support

#### 5.2 FFT/Spectral Effects (1 week)
- Spectral freeze
- Phase vocoder
- Pitch shifting
- Spectral morphing

#### 5.3 Pattern Sequencing (1 week)
- TidalCycles-style patterns
- Euclidean rhythms
- Probabilistic sequences

#### 5.4 Visual Feedback (1 week)
- Oscilloscope view
- Spectrum analyzer
- Waveform display
- Spatial position visualizer

#### 5.5 Extended Sample Support (1-2 days)
- Full sample playback (multi-minute files)
- Sample slicing
- Time-stretching
- Pitch-shifting

---

## Success Metrics

### Feature Parity with SuperCollider

**Core synthesis (Target: 95%):**
- [x] Live coding with hot-reload
- [x] Sample-by-sample processing
- [ ] Full oscillator suite
- [ ] Full filter suite
- [ ] Envelopes
- [x] Effects (delays, modulation)
- [ ] Wavetable synthesis
- [ ] Granular synthesis
- [x] Spatial synthesis

**Where Aither Exceeds SuperCollider:**
- [x] True paradigm unification
- [x] Pure functional composition
- [x] Simpler architecture
- [x] Modern language (JavaScript)
- [x] Spatial synthesis as first-class

### Community Goals

- 100 stars on GitHub
- 10 contributed examples
- 3 tutorial videos
- 1 live performance/demo

---

## Timeline Estimate

**If working full-time:**
- Phase 1 (Core Toolbox): 1-2 days
- Phase 2 (Wavetables): 1 day
- Phase 3 (Granular): 1-2 days
- Phase 4 (Polish): Ongoing
- **Total to feature parity: ~1 week**

**If working part-time (10 hours/week):**
- Phase 1: 2 weeks
- Phase 2: 1 week
- Phase 3: 2 weeks
- **Total: ~5 weeks**

---

## The Endgame

**After Phase 1-3, you'll have:**

```javascript
// Complete synthesis environment in ~2000 lines

// 🔥 KANON - Pure mathematics
play('fire', pipe(
  sine(440),
  distort(_, 2),
  gain(_, 0.3)
));

// 🌍 RHYTHMOS - Stateful oscillators
play('earth', pipe(
  saw(110),
  resonantLP(_, 800, 0.8),
  adsr(0.01, 0.3, 0.5, 1.0, gate),
  gain(_, 0.4)
));

// 💨 ATOMOS - Granular synthesis
loadBuffer('texture', recordedMaterial);
play('air', pipe(
  grainCloud('texture', 20, 0.05, 0.5),
  lowpass(_, 2000),
  gain(_, 0.3)
));

// 💧 PHYSIS - Physics simulation
play('water', pipe(
  springMass(100, 0.5, impulse),
  wavefold(_, 0.8),
  feedback(_, 2.0, 0.8, 0.2),
  gain(_, 0.3)
));

// ✨ CHORA - Spatial field
play('aither', s => {
  const { x, y, z } = s.position;
  const d = Math.sqrt(x*x + y*y + z*z);
  return wavetableMorph('sine-to-saw', d * 10, 110)(s) / (d + 1) * 0.3;
});

// MIX ALL FIVE PARADIGMS
play('unified', pipe(
  mix(fire, earth, air, water, aither),
  resonantLP(_, 1200, 0.7),
  feedback(_, 3.0, 1.2, 0.25),
  gain(_, 0.5)
));

// ONE FILTER WORKS ON ALL OF THEM
```

**This is the vision. We're 80% there. Let's finish it.**

---

## Contributing

Want to help build Aither? Here are high-impact areas:

- 🔥 **High Priority:** Implement Phase 1 features (oscillators, filters, envelopes)
- ⚠️ **Medium Priority:** Wavetable synthesis, granular helpers
- 📖 **Documentation:** Write tutorials, create examples
- 🎨 **Examples:** Share your Aither compositions
- 🐛 **Testing:** Find bugs, suggest improvements

---

## Final Thoughts

**SuperCollider took 25+ years to build.**

**Aither can match its synthesis power in a few weeks.**

This is possible because:
1. **Modern runtime** - Bun/JavaScript is fast enough
2. **Simpler architecture** - One interface, no server/client split
3. **Functional purity** - Composition without complexity
4. **Standing on giants** - We learned from SC's mistakes

**The goal isn't to replace SuperCollider** - it's the GOAT and will remain so.

**The goal is to prove a point:** Synthesis doesn't have to be complex. A simple, unified architecture can be just as powerful.

And maybe, just maybe, inspire the next generation of live coding tools.

---

**Let's build it.**

🔥🌍💨💧✨
