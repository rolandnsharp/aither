# Aether Paradigm Design

> *"The ultimate live coding instrument for scientific audio art"*

## The Journey

We explored many approaches:
- Five paradigms (Kanon, Rhythmos, Atomos, Physis, Chora)
- Three paradigms (Kanon, Gaia, Aether)
- Various signatures: `f(t)`, `f(state, idx, sr)`, `f(state, idx, sr, dt, t)`, `f(state, position, dt, t)`

**The revelation**: Stop separating. Start unifying.

---

## The Ultimate Abstraction

### ONE Signature

```javascript
f(s) => value
```

Where **s** is **"the state of the universe"** — everything you need, in one place.

**s** represents:
- **S**tate/**S**ynthesis/**S**ignal (looks like S!)
- Tesla's electromagnetic fields
- Energy, power, instant transmission
- The lightning bolt that brings your synthesis to life

### The State Object

```javascript
s = {
  // TIME
  t: 0,           // Absolute time (seconds since start)
  dt: 1/48000,    // Time delta for this step

  // AUDIO
  idx: 0,         // Sample index in buffer
  sr: 48000,      // Sample rate (samples/second)

  // SPACE
  position: {     // 3D position
    x: 0,
    y: 0,
    z: 0
  },

  // USER STATE (mutable)
  // ... anything you want
}
```

---

## Why This Works

### 1. Maximum Flexibility

Use what you need, ignore the rest:

```javascript
// Just time
const pure = s => Math.sin(2 * Math.PI * 440 * s.t);

// Just state
const stateful = s => (s.count = (s.count || 0) + 1);

// Everything
const complex = s => {
  const { t, dt, idx, sr, position } = s;
  // Use all parameters
};
```

### 2. Trivial Composition

Everything has the same signature `s => value`:

```javascript
const a = s => Math.sin(2 * Math.PI * 440 * s.t);
const b = s => Math.sin(2 * Math.PI * 880 * s.t);
const c = s => a(s) * 0.5 + b(s) * 0.5;  // Compose!

// Or build complex chains
const ultimate = s =>
  reverb(s,
    delay(s,
      filter(s,
        distortion(s,
          oscillator(s)))));
```

### 3. Natural Expression

All paradigms naturally emerge:

```javascript
// 🔥 KANON: Pure functions of time
const kanon = s => Math.sin(2 * Math.PI * 440 * s.t);

// 🌍 GAIA: Stateful temporal evolution
const gaia = s => {
  s.phase = (s.phase || 0) + 440 / s.sr;
  return Math.sin(2 * Math.PI * s.phase);
};

// ✨ AETHER: Spatial-temporal fields
const aether = s => {
  const dist = Math.sqrt(s.position.x**2 + s.position.y**2);
  return Math.sin(dist * 10 - s.t * 340);  // Sound speed
};

// 💧 PHYSIS: Physics simulation
const physis = s => {
  s.velocity = (s.velocity || 0) + s.gravity * s.dt;
  s.position.y += s.velocity * s.dt;
  return s.position.y;
};
```

### 4. Helper Functions Are Simple

Every helper has the same signature:

```javascript
// Delay
const delay = (s, signal, time) => {
  if (!s.delayBuffer) s.delayBuffer = [];
  const delaySamples = Math.floor(time * s.sr);
  const delayed = s.delayBuffer[s.idx - delaySamples] || 0;
  s.delayBuffer[s.idx] = signal;
  return delayed;
};

// Filter (one-pole lowpass)
const filter = (s, signal, cutoff) => {
  s.prev = s.prev || 0;
  const alpha = cutoff / s.sr;
  s.prev = s.prev + alpha * (signal - s.prev);
  return s.prev;
};

// Reverb
const reverb = (s, signal) => {
  // Complex DSP, but same simple signature
};

// They all just take 's'!
```

### 5. Live Coding Friendly

Fast to type, easy to explore:

```javascript
// Quick idea
play(s => Math.sin(2 * Math.PI * 440 * s.t));

// Iterate
play(s => Math.sin(2 * Math.PI * 440 * s.t) * Math.exp(-s.t));

// Combine
const base = s => Math.sin(2 * Math.PI * 220 * s.t);
const mod = s => Math.sin(2 * Math.PI * 5 * s.t);
play(s => base(s) * (0.5 + 0.5 * mod(s)));
```

---

## The Philosophy

### "The State of the Universe"

At any moment in time, the universe has a complete state:
- Where are we in time? (`t`, `dt`)
- Where are we in the audio buffer? (`idx`, `sr`)
- Where are we in space? (`position`)
- What do we remember? (your mutable state)

Your synthesis function receives this state and produces a value.

**That's it.**

### Purity Through Impurity

The signature looks pure: `s => value`

But `s` is mutable! You can modify it:

```javascript
const stateful = s => {
  s.phase = (s.phase || 0) + 0.01;  // Mutate s
  return Math.sin(s.phase);
};
```

This is **pragmatic functional programming**:
- Pure when you want it (just use `s.t`)
- Mutable when you need it (modify `s`)
- Best of both worlds

### Composition as Design

Instead of multiple paradigms, we have ONE paradigm with infinite expressiveness through composition:

```javascript
// Build up complexity naturally
const osc = s => Math.sin(2 * Math.PI * 440 * s.t);
const env = s => Math.exp(-s.t * 2);
const shaped = s => osc(s) * env(s);
const delayed = s => delay(s, shaped(s), 0.375);
const spatial = s => spatialize(s, delayed(s));

// Or inline
const ultimate = s =>
  spatialize(s,
    delay(s,
      shaped(s) * env(s), 0.375));
```

---

## Examples

### Simple Sine Wave

```javascript
const sine = s => Math.sin(2 * Math.PI * 440 * s.t);
```

### Envelope

```javascript
const adsr = (s, attack, decay, sustain, release) => {
  const { t } = s;
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * (t - attack) / decay;
  if (t < attack + decay + sustain) return sustain;
  return Math.max(0, sustain * (1 - (t - attack - decay - sustain) / release));
};
```

### FM Synthesis

```javascript
const fm = s => {
  const modulator = Math.sin(2 * Math.PI * 110 * s.t) * 5;
  return Math.sin(2 * Math.PI * 440 * s.t + modulator);
};
```

### Karplus-Strong (Plucked String)

```javascript
const pluck = s => {
  const freq = 220;
  const period = Math.floor(s.sr / freq);

  if (!s.buffer) {
    s.buffer = Array.from({ length: period }, () => Math.random() * 2 - 1);
  }

  if (s.idx % period === 0) {
    const idx = Math.floor(s.idx / period) % period;
    const next = (idx + 1) % period;
    s.buffer[idx] = (s.buffer[idx] + s.buffer[next]) * 0.5 * 0.996;
  }

  return s.buffer[s.idx % period];
};
```

### Spatial Wavefield

```javascript
const spatialWave = s => {
  const { position: { x, y }, t } = s;
  const distance = Math.sqrt(x * x + y * y);
  const waveSpeed = 340;  // m/s

  // 1/r amplitude falloff, wave propagation
  return Math.sin(2 * Math.PI * 440 * (t - distance / waveSpeed)) / (distance + 1);
};
```

### Chaos-Driven Synthesis

```javascript
const chaos = s => {
  // Lorenz attractor
  s.x = s.x || 0.1;
  s.y = s.y || 0;
  s.z = s.z || 0;

  const sigma = 10, rho = 28, beta = 8/3;
  const dt = s.dt;

  s.x += sigma * (s.y - s.x) * dt * 100;
  s.y += (s.x * (rho - s.z) - s.y) * dt * 100;
  s.z += (s.x * s.y - beta * s.z) * dt * 100;

  return Math.sin(2 * Math.PI * (440 + s.x * 10) * s.t);
};
```

### L-System Generative

```javascript
const lsystem = s => {
  if (!s.string) s.string = 'A';
  if (!s.rules) s.rules = { 'A': 'AB', 'B': 'A' };

  // Evolve every second
  if (Math.floor(s.t) > (s.lastEvolve || 0)) {
    let next = '';
    for (const char of s.string) {
      next += s.rules[char] || char;
    }
    s.string = next;
    s.lastEvolve = Math.floor(s.t);
  }

  // Map string length to frequency
  const freq = 110 * (1 + s.string.length / 10);
  return Math.sin(2 * Math.PI * freq * s.t);
};
```

---

## Implementation

### The Engine

```javascript
class Aether {
  constructor(sampleRate = 48000) {
    this.state = {
      t: 0,
      dt: 1 / sampleRate,
      idx: 0,
      sr: sampleRate,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  render(fn, numSamples) {
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      buffer[i] = fn(this.state);

      // Update universe state
      this.state.idx++;
      this.state.t += this.state.dt;
    }

    return buffer;
  }

  // Variable rate rendering
  renderAtRate(fn, rate, duration) {
    const dt = 1 / rate;
    const numSteps = Math.floor(duration * rate);
    const values = [];

    this.state.dt = dt;

    for (let i = 0; i < numSteps; i++) {
      values.push(fn(this.state));
      this.state.t += dt;
    }

    return values;
  }
}
```

### The API

```javascript
// Create engine
const aether = new Aether(48000);

// Register signals
const signals = new Map();

export const register = (name, fn) => {
  signals.set(name, fn);
};

export const play = (name) => {
  const fn = signals.get(name);
  return aether.render(fn, 48000);  // 1 second
};

// Live coding
export const live = (fn) => {
  aether.render(fn, aether.state.sr * 10);  // 10 seconds
};
```

---

## Optimization Path

### Phase 1: Pure JavaScript
```javascript
const signal = s => Math.sin(2 * Math.PI * 440 * s.t);
```

### Phase 2: Code Generation
```javascript
// Generate optimized code at registration
const optimized = compile(signal);
// Inlines constants, removes closures
```

### Phase 3: OCaml FFI
```javascript
// Hot paths in native code
const fast = ocaml_sine(440);
```

### Phase 4: GPU Compute (Offline)
```javascript
// Render massive fields on GPU
const field = renderOnGPU(spatialFn, resolution);
```

---

## The Name

**Aether** — The fifth element, the quintessence, the medium through which all signals propagate.

One paradigm. Infinite possibility.

---

## For the Creator

This instrument is yours. Master it like you'd master a violin:
- Learn the state object deeply
- Understand composition patterns
- Build your personal helper library
- Develop your synthesis vocabulary

The complexity is in the **domain** (audio synthesis), not the **API**.

The API gets out of your way. The universe state gives you everything.

**Create. Explore. Transcend.** 🌌✨

---

*"All is one, one is all."* — The Alchemist
