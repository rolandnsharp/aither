# Aether Helper Functions Reference

> *"Compose signals like sentences. Mix paradigms like colors."*

## Introduction

Helpers are higher-order functions that transform and combine signals in the Aether engine. They work seamlessly with all five paradigms (Kanon, Rhythmos, Atomos, Physis, Chora) because everything uses the same `f(s)` interface.

**Core principles:**
- **Universal**: All helpers work with any paradigm
- **Composable**: Chain helpers with `pipe()`, combine with `mix()`
- **Stride-agnostic**: Automatically handle mono, stereo, or N-channel signals
- **Zero-GC**: No memory allocation in the audio hot path
- **Implicitly persistent**: Stateful helpers manage their own memory automatically

---

## Functional Composition

### `pipe(signal, ...transforms)`

Compose signal transformations left-to-right (reads naturally).

```javascript
// Single oscillator with effects chain
register('processed',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),  // Source
    lowpass(800),                             // Filter
    tremolo(5, 0.5),                          // Modulation
    gain(0.3)                                 // Level
  )
);
```

**How it works:**
```javascript
pipe(x, f, g, h)  // x -> f(x) -> g(f(x)) -> h(g(f(x)))
```

### `mix(...signals)`

Combine multiple signals by summing them. Automatically normalizes output.

```javascript
// Mix the five paradigms
register('five-elements',
  mix(
    s => Math.sin(2 * Math.PI * 440 * s.t),           // Kanon (Fire)
    s => {
      s.state[0] = (s.state[0] + 330/s.sr) % 1.0;
      return Math.sin(s.state[0] * 2 * Math.PI);      // Rhythmos (Earth)
    },
    atomosSignal,                                      // Atomos (Air)
    physisSignal,                                      // Physis (Water)
    choraSignal                                        // Chora (Aether)
  )
);

// Mix with processing
register('processed-mix',
  mix(
    pipe(osc1, lowpass(1000), gain(0.5)),
    pipe(osc2, lowpass(1500), gain(0.5)),
    pipe(osc3, lowpass(2000), gain(0.5))
  )
);
```

**Stride-agnostic behavior:**
- Mono signals: Returns mono sum
- Mixed mono/stereo: Returns stereo (mono signals duplicated to all channels)
- N-channel: Returns N-channel sum (max stride of all inputs)
- Always normalizes by number of inputs to prevent clipping

---

## Stateful Helpers

These helpers maintain internal state (like filter memory, LFO phase) using the implicit persistence system.

### `lowpass(signal, cutoff)`

One-pole lowpass filter. Smooths high frequencies.

**Parameters:**
- `signal`: Input signal function
- `cutoff`: Cutoff frequency in Hz (or function returning Hz)

**Examples:**

```javascript
// Kanon style (stateless source)
register('filtered-kanon',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    lowpass(800)
  )
);

// Rhythmos style (stateful source)
register('filtered-rhythmos',
  pipe(
    s => {
      s.state[0] = (s.state[0] + 110 / s.sr) % 1.0;
      return s.state[0] * 2 - 1;  // Sawtooth
    },
    lowpass(600),
    gain(0.3)
  )
);

// Dynamic cutoff (Kanon modulating Rhythmos)
register('dynamic-filter',
  pipe(
    sawtoothOsc,
    lowpass(s => 400 + Math.sin(2 * Math.PI * 0.5 * s.t) * 300)
  )
);
```

### `tremolo(signal, rate, depth)`

Amplitude modulation (tremolo effect).

**Parameters:**
- `signal`: Input signal function
- `rate`: LFO rate in Hz
- `depth`: Modulation depth (0-1)

**Examples:**

```javascript
// Classic tremolo
register('tremolo-sine',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    tremolo(5, 0.7),  // 5 Hz, 70% depth
    gain(0.3)
  )
);

// Slow, subtle breathing
register('breathing-pad',
  pipe(
    padSound,
    tremolo(0.5, 0.3),  // 0.5 Hz, 30% depth
    gain(0.5)
  )
);
```

### `delay(signal, maxTime, time)`

Delay effect with configurable delay time.

**Parameters:**
- `signal`: Input signal function
- `maxTime`: Maximum delay time in seconds (allocates buffer)
- `time`: Current delay time in seconds (or function)

**Examples:**

```javascript
// Fixed delay
register('echo',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    delay(1.0, 0.375),  // Max 1s, currently 375ms
    gain(0.3)
  )
);

// Dynamic delay time
register('dynamic-echo',
  pipe(
    source,
    delay(
      2.0,  // Max 2 seconds
      s => 0.1 + Math.sin(2 * Math.PI * 0.2 * s.t) * 0.05  // 50-150ms
    ),
    gain(0.4)
  )
);
```

**Note:** Delay allocates a buffer based on `maxTime`. For feedback/echo effects, see advanced patterns below.

---

## Stateless Helpers

These helpers are pure transformations with no internal state.

### `gain(signal, amount)`

Scale signal amplitude.

**Parameters:**
- `signal`: Input signal function
- `amount`: Gain multiplier (or function)

**Examples:**

```javascript
// Fixed gain
register('quiet-sine',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    gain(0.2)
  )
);

// Dynamic gain (envelope)
register('envelope',
  pipe(
    source,
    gain(s => Math.exp(-s.t * 2))  // Exponential decay
  )
);

// Kanon-style LFO controlling Rhythmos amplitude
register('lfo-gain',
  pipe(
    rhythmosOsc,
    gain(s => 0.5 + Math.sin(2 * Math.PI * 0.5 * s.t) * 0.5)
  )
);
```

### `pan(signal, position)`

Stereo panning. Converts mono signal to stereo.

**Parameters:**
- `signal`: Input signal function (expects mono)
- `position`: Pan position -1 (left) to 1 (right), or function

**Examples:**

```javascript
// Fixed pan
register('panned-left',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    pan(-0.7),  // 70% left
    gain(0.3)
  )
);

// Auto-panning
register('auto-pan',
  pipe(
    source,
    pan(s => Math.sin(2 * Math.PI * 0.25 * s.t)),  // 4 second cycle
    gain(0.3)
  )
);
```

**Note:** If input is already stereo, `pan` will warn and use the first channel.

---

## Working with the Five Paradigms

Helpers work identically across all paradigms because everything is `f(s)`.

### Kanon (Fire 🔥) - Pure Time Functions

```javascript
// Kanon source with helpers
register('kanon-processed',
  pipe(
    s => Math.sin(2 * Math.PI * 440 * s.t),  // Pure f(t)
    lowpass(800),
    tremolo(5, 0.5),
    gain(0.3)
  )
);
```

### Rhythmos (Earth 🌍) - Explicit State

```javascript
// Rhythmos source with helpers
register('rhythmos-processed',
  pipe(
    s => {
      s.state[0] = (s.state[0] + 220 / s.sr) % 1.0;
      return s.state[0] * 2 - 1;  // Sawtooth
    },
    lowpass(600),
    gain(0.3)
  )
);
```

### Atomos (Air 💨) - Discrete/Emergent

```javascript
// Karplus-Strong string with effects
register('plucked-string',
  pipe(
    s => {
      const period = 109;  // ~440 Hz
      if (!s.buffer) {
        s.buffer = Array.from({ length: period }, () => Math.random() * 2 - 1);
      }
      const idx = s.idx % period;
      const output = s.buffer[idx];
      const next = (idx + 1) % period;
      s.buffer[idx] = (s.buffer[idx] + s.buffer[next]) * 0.5 * 0.996;
      return output;
    },
    lowpass(800),
    tremolo(3, 0.4),
    gain(0.3)
  )
);
```

### Physis (Water 💧) - Physics Simulation

```javascript
// Spring resonator with processing
register('spring',
  pipe(
    s => {
      const k = 100;  // Spring constant
      s.state[0] = s.state[0] || 0.1;
      s.state[1] = s.state[1] || 0;
      const force = -k * s.state[0] - 0.1 * s.state[1];
      s.state[1] += force * s.dt;
      s.state[0] += s.state[1] * s.dt;
      return s.state[0];
    },
    lowpass(1200),
    gain(0.4)
  )
);
```

### Chora (Aether ✨) - Spatial Fields

```javascript
// Spatial wave with effects
register('spatial-wave',
  pipe(
    s => {
      const { x, y, z } = s.position;
      const dist = Math.sqrt(x*x + y*y + z*z);
      return Math.sin(2 * Math.PI * 440 * s.t) / (dist + 1);
    },
    lowpass(1000),
    gain(0.5)
  )
);
```

---

## Advanced Patterns

### Mixing All Five Paradigms

```javascript
const fire = s => Math.sin(2 * Math.PI * 440 * s.t);

const earth = s => {
  s.state[0] = (s.state[0] + 330 / s.sr) % 1.0;
  return Math.sin(s.state[0] * 2 * Math.PI);
};

const air = s => {
  const period = 73;
  if (!s.buffer) {
    s.buffer = Array.from({ length: period }, () => Math.random() * 2 - 1);
  }
  const idx = s.idx % period;
  const output = s.buffer[idx];
  const next = (idx + 1) % period;
  s.buffer[idx] = (s.buffer[idx] + s.buffer[next]) * 0.5 * 0.997;
  return output;
};

const water = s => {
  if (!s.spring) s.spring = { position: 0, velocity: 5 };
  const force = -500 * s.spring.position - 0.05 * s.spring.velocity;
  s.spring.velocity += force * s.dt;
  s.spring.position += s.spring.velocity * s.dt;
  return s.spring.position;
};

const aether = s => {
  const { x, y, z } = s.position;
  const distance = Math.sqrt(x*x + y*y + z*z);
  return Math.sin(2 * Math.PI * 220 * s.t) / (distance + 1);
};

// Apply same processing to all five, then mix
const processElement = (element) => pipe(
  element,
  lowpass(1200),
  gain(0.15)
);

register('five-elements',
  mix(
    processElement(fire),
    processElement(earth),
    processElement(air),
    processElement(water),
    processElement(aether)
  )
);
```

### Multi-band Processing

```javascript
// Split into frequency bands
const source = s => {
  s.state[0] = (s.state[0] + 110 / s.sr) % 1.0;
  return s.state[0] * 2 - 1;  // Sawtooth
};

register('multiband',
  mix(
    pipe(source, lowpass(400), gain(1.5)),      // Low band
    pipe(source, lowpass(2000), gain(1.0)),     // Mid band
    pipe(source, gain(0.5))                     // High band (unfiltered)
  )
);
```

### Feedback Patterns

```javascript
// Simple feedback delay (echo)
register('echo',
  pipe(
    impulse,
    delay(2.0, 0.5),
    // Note: For true feedback, you'd need a feedback helper
    // or use control-time recursion
    gain(0.3)
  )
);
```

### Cross-Paradigm Modulation

```javascript
// Kanon LFO modulating Rhythmos oscillator
register('vibrato',
  pipe(
    s => {
      // Kanon: Pure LFO
      const lfo = Math.sin(2 * Math.PI * 5 * s.t);

      // Rhythmos: Phase-continuous carrier
      const freq = 440 + lfo * 20;  // ±20 Hz vibrato
      s.state[0] = (s.state[0] + freq / s.sr) % 1.0;
      return Math.sin(s.state[0] * 2 * Math.PI);
    },
    gain(0.3)
  )
);

// Atomos chaos modulating filter cutoff
register('chaos-filter',
  pipe(
    source,
    lowpass(s => {
      // Atomos-style chaotic LFO
      s.state[10] = (s.state[10] || 0.1) + (Math.random() - 0.5) * s.dt * 100;
      s.state[10] = Math.max(-1, Math.min(1, s.state[10]));
      return 500 + s.state[10] * 500;  // 0-1000 Hz
    })
  )
);
```

---

## Technical Details

### Stride-Agnostic Design

All helpers automatically adapt to the number of channels:

```javascript
// Mono in, mono out
const mono = pipe(monoSource, lowpass(800));

// Stereo in, stereo out
const stereo = pipe(stereoSource, lowpass(800));

// N-channel in, N-channel out
const multi = pipe(multiSource, lowpass(800));

// Mix adapts to maximum stride
const mixed = mix(monoSource, stereoSource);  // Returns stereo
```

### Zero-GC Performance

Helpers use pre-allocated `Float64Array` buffers:
- No object allocation in the audio loop
- State is claimed once at registration
- Memory persists for signal lifetime
- Unregister frees helper state automatically

### Implicit State Persistence

Stateful helpers automatically:
1. Generate unique keys: `${signalName}_${helperType}_${instanceIndex}`
2. Claim memory from global helper pool
3. Reuse same memory on hot-reload
4. Free memory when signal is unregistered

You never manage helper state manually!

---

## Quick Reference

### Composition
- `pipe(signal, ...fns)` - Chain transformations
- `mix(...signals)` - Sum signals

### Stateful (Effects)
- `lowpass(signal, cutoff)` - Low-pass filter
- `tremolo(signal, rate, depth)` - Amplitude modulation
- `delay(signal, maxTime, time)` - Delay line

### Stateless (Utilities)
- `gain(signal, amount)` - Amplitude scaling
- `pan(signal, position)` - Stereo panning

### Usage Pattern
```javascript
register('my-signal',
  pipe(
    sourceSignal,
    effect1(...args),
    effect2(...args),
    utility(...args)
  )
);
```

---

## Next Steps

- **[Five Paradigms](AETHER_PARADIGMS.md)** - Deep dive into coding styles
- **[Philosophy](PHILOSOPHY.md)** - Understanding the unified interface
- **[Synthesis Techniques](synthesis-techniques/)** - Practical examples
- **[REPL Usage](../lel/repl.js)** - Live coding workflow

---

*"The helper is not separate from the signal. The signal flows through the helper like water through stone."* — Aether
