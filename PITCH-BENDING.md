# Pitch Bending and Time-Varying Frequency in Signal

## The Problem

Signal's pure functional `Time → Sample` model works beautifully for constant frequencies:

```javascript
signal('tone', t => Math.sin(2 * Math.PI * 440 * t) * 0.2)
```

But naive time-varying frequency produces incorrect results:

```javascript
// INCORRECT - phase discontinuities
signal('bend', t => {
  const freq = 440 + 440 * Math.min(t, 1);  // 440→880 Hz over 1 second
  return Math.sin(2 * Math.PI * freq * t) * 0.2;
});
```

### Why It's Wrong

The formula `sin(2π × freq × t)` assumes constant frequency. When frequency changes, you need the **integral** of frequency over time (phase accumulation), not just frequency times time.

**Physical intuition:**
- At constant 440 Hz for 1 second → 440 cycles completed → phase = 440
- Ramping 440→880 Hz over 1 second → ~660 cycles completed → phase should be 660
- But `freq × t = 880 × 1 = 880` gives wrong phase

### When This Matters

**Works fine (approximation acceptable):**
- ✓ Different static frequencies per note
- ✓ Slow LFO/vibrato (< 20 Hz modulation with small depth)
- ✓ Percussive sounds where amplitude envelope masks artifacts
- ✓ Quick experiments and sketches

**Breaks down:**
- ✗ Fast FM synthesis
- ✗ Sustained pitch bends (glissando)
- ✗ Large frequency sweeps (chirps)
- ✗ Accurate vibrato on sustained notes
- ✗ Professional/polished productions

## Solution 1: Analytical Integration

For simple frequency functions, compute the phase integral analytically.

### Vibrato (Sinusoidal Modulation)

```javascript
signal('vibrato', t => {
  const baseFreq = 440;
  const vibRate = 5;      // 5 Hz vibrato
  const vibDepth = 10;    // ±10 Hz

  // Frequency: f(t) = 440 + 10·sin(2π·5·t)
  // Phase integral: ∫f(t)dt = 440t - (10/2π·5)·cos(2π·5·t)
  const phase = baseFreq * t - (vibDepth / (2 * Math.PI * vibRate)) *
                Math.cos(2 * Math.PI * vibRate * t);

  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

### Linear Pitch Bend (Glissando)

```javascript
signal('glissando', t => {
  const f0 = 440;
  const f1 = 880;
  const duration = 2;
  const progress = Math.min(t / duration, 1);

  // Frequency: f(t) = f0 + (f1-f0)·progress
  // Phase integral: f0·t + (f1-f0)·t·progress/2
  const phase = f0 * t + (f1 - f0) * t * progress / 2;

  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

### Exponential Pitch Envelope (Kick Drums)

```javascript
const { step, env } = signal;

signal('kick', t => {
  const { index, phase: stepPhase } = step(t, 120, 16);

  const f0 = 130;
  const f1 = 50;
  const decay = 15;

  // Frequency: f(t) = f1 + (f0-f1)·exp(-decay·t)
  // Phase integral: f1·t + (f0-f1)·(1-exp(-decay·t))/decay
  const phase = f1 * stepPhase + (f0 - f1) * (1 - Math.exp(-decay * stepPhase)) / decay;

  return Math.sin(2 * Math.PI * phase) * env.exp(stepPhase, 8) * 0.4;
});
```

**Pros:**
- Mathematically exact
- No state required
- Pure functional
- Efficient (O(1) per sample)

**Cons:**
- Requires deriving integral for each frequency function
- Not practical for arbitrary modulation
- Limited to functions with closed-form integrals

## Solution 2: Stateful Phase Accumulator

The traditional approach used by all audio libraries.

```javascript
class Oscillator {
  constructor(freq) {
    this.phase = 0;  // STATE
    this.freq = freq;
  }

  next(freqModulation = 0) {
    const output = Math.sin(2 * Math.PI * this.phase);
    this.phase += (this.freq + freqModulation) / SAMPLE_RATE;
    if (this.phase >= 1.0) this.phase -= 1.0;
    return output;
  }

  setFreq(freq) {
    this.freq = freq;
  }
}

// Usage in Signal
const carrier = new Oscillator(440);
const modulator = new Oscillator(5);

signal('fm', t => {
  const mod = modulator.next() * 100;  // 5 Hz LFO, ±100 Hz depth
  return carrier.next(mod) * 0.2;
});
```

**Pros:**
- Efficient (O(1) per sample)
- Handles arbitrary frequency modulation
- Industry standard approach
- Simple to understand and use

**Cons:**
- Requires mutable state
- Not pure functional
- Must process samples sequentially
- Breaks Signal's `Time → Sample` random access model

## Solution 3: Recursive with Memoization

Purely functional phase accumulation through corecursion.

```javascript
function fmOsc(carrierFreq, modulator) {
  const dt = 1 / SAMPLE_RATE;
  const cache = new Map();

  // Recursive phase accumulator with memoization
  const phase = t => {
    const key = Math.round(t * SAMPLE_RATE);  // Quantize to sample number
    if (cache.has(key)) return cache.get(key);

    if (t <= dt) return 0;  // Base case

    const freq = carrierFreq + modulator.eval(t);
    const result = phase(t - dt) + (freq * dt);

    cache.set(key, result);
    return result;
  };

  return new Signal(t => Math.sin(2 * Math.PI * phase(t)));
}

// Usage - proper vibrato
const lfo = signal.sin(5).gain(10);  // 5 Hz LFO, ±10 Hz depth
const vibrato = fmOsc(440, lfo);

signal('vibrato', vibrato.fn);
```

**How it works:**
- `phase(t)` recursively calls `phase(t - dt)` (one sample back)
- Each sample looks one sample into the past
- Not circular because of time delay (corecursion)
- Memoization makes it O(1) per sample when evaluated sequentially
- Works because `fillBuffer` processes samples in order

**Pros:**
- Pure functional (corecursion)
- Handles arbitrary frequency modulation
- Works with Signal's `Time → Sample` model
- More flexible than analytical integrals

**Cons:**
- Requires memoization for efficiency
- Only efficient if samples evaluated in order (which `fillBuffer` does)
- More complex than analytical or stateful approaches
- Cache memory grows with audio duration

## Solution 4: Hybrid Approach

Keep pure functional API for most cases, add stateful oscillators for complex modulation.

```javascript
// Pure functional for 90% of use cases (static frequencies)
signal('tone').sin(440).gain(0.2)

// Stateful oscillators for complex modulation (10% of use cases)
const carrier = signal.osc(440);    // Returns stateful Oscillator
const modulator = signal.osc(5);

signal('fm', () => {
  const mod = modulator.next() * 100;
  carrier.setFreq(440 + mod);
  return carrier.next() * 0.2;
});
```

**Pros:**
- Simple API for both approaches
- Users choose functional vs stateful based on needs
- Efficient for both use cases
- Gradual learning curve

**Cons:**
- Two paradigms in one library
- Need to document when to use each
- Slightly more API surface

## Pipes: Stateless vs Stateful

`.pipe()` is just a chaining mechanism - it can be stateless or stateful depending on what you pipe through.

### Stateless Pipes

Pure mathematical transformations that work perfectly with `Time → Sample`:

```javascript
signal.sin(440)
  .pipe(gain(0.5))       // x => x * 0.5
  .pipe(clip(0.8))       // x => Math.max(-0.8, Math.min(0.8, x))
  .pipe(distort)         // x => Math.tanh(x * 3)
  .pipe(fold(0.7))       // Wavefolder algorithm
```

These are already available as chainable methods (`.gain()`, `.clip()`, `.fx()`).

**Key characteristic:** Output depends only on current input sample.

### Stateful Pipes

Operations that need previous samples - require stream processing:

```javascript
signal.sin(440)
  .pipe(lowpass(1000))   // IIR filter - needs previous output samples
  .pipe(delay(0.5, 0.6)) // Feedback delay - needs sample buffer
  .pipe(reverb())        // Needs delay lines + feedback
  .pipe(compressor())    // Needs envelope follower
```

**Key characteristic:** Output depends on previous input/output samples.

### The Difference

**Stateless:** `sample_out = f(sample_in)` - pure function
**Stateful:** `sample_out = f(sample_in, history)` - needs context

### What Can Be Stateless

Operations that work with single samples:
- ✓ Gain/amplitude scaling
- ✓ Clipping/saturation
- ✓ Waveshaping/distortion
- ✓ Wavefolding
- ✓ Ring modulation (multiplying signals)
- ✓ Any `sample → sample` transformation

### What Must Be Stateful

Operations needing history:
- ✗ IIR filters (lowpass, highpass, etc.) - need previous outputs
- ✗ Feedback delays - need delay buffers
- ✗ Reverb - needs delay networks
- ✗ Compressors/limiters - need envelope following
- ✗ Time-varying frequency oscillators - need phase accumulation

### Exception: Simple Delays

**Simple delays (no feedback)** work purely functionally by evaluating at earlier times:

```javascript
// No state needed - just look backwards!
signal('echo', t => {
  const dry = Math.sin(2 * Math.PI * 440 * t);
  const wet = Math.sin(2 * Math.PI * 440 * (t - 0.5));  // 500ms ago
  return (dry + wet * 0.5) * 0.2;
});
```

This is purely functional and needs no pipe at all.

## Pipe Architecture for Signal

If implementing pipes, you'd have:

```javascript
// Stateless effect - function signature
function gain(amount) {
  return sample => sample * amount;
}

// Stateful effect - class with .process() method
class Lowpass {
  constructor(cutoff) {
    this.alpha = cutoff / SAMPLE_RATE;
    this.lastOutput = 0;
  }

  process(sample) {
    this.lastOutput = this.alpha * sample + (1 - this.alpha) * this.lastOutput;
    return this.lastOutput;
  }
}

// Unified .pipe() that handles both
Signal.prototype.pipe = function(effect) {
  if (typeof effect === 'function') {
    // Stateless - works with Time → Sample
    return new Signal(t => effect(this.eval(t)));
  } else {
    // Stateful - must process sequentially (breaks random access)
    return new StatefulSignal(effect, this);
  }
};
```

**Trade-off:** Stateful pipes break Signal's random access `Time → Sample` model because they must be evaluated sequentially.

## Comparison: How Other Libraries Handle This

### SuperCollider
Uses stateful phase accumulators in C++:

```supercollider
SinOsc.ar(freq: 440, phase: 0, mul: 0.2)
```

Phase accumulation handled internally with state.

### Incudine (Common Lisp)
Virtual UGens with implicit state management through the synthesis engine.

### hsc3 (Haskell SuperCollider)
Pure functional **graph description**, but sends to SuperCollider server (C++) for actual synthesis:

```haskell
sinOsc ar 440 0 * 0.1
```

The synthesis itself uses state - hsc3 is only describing the graph.

### Euterpea (Haskell)
Stream processing with arrows and `delay` primitive:

```haskell
osc_ phs = proc freq -> do
  rec
    let delta = 1 / sr * freq
        phase = if next > 1 then frac next else next
    next <- delay phs -< frac (phase + delta)
  outA -< phase
```

Uses state encoded through recursive streams, not random access.

### Signal's Advantage
Signal is actually **more purely functional** - true `Time → Sample` random access. But can add memoized recursion or explicit state when needed.

## Recommended API Additions

### 1. Pitch Bend Helpers (melody.js)

```javascript
// Simple semitone conversion
function bend(freq, semitones) {
  return freq * Math.pow(2, semitones / 12);
}

// Pre-computed phase functions for common patterns
function vibratoPhase(t, baseFreq, vibratoRate, vibratoDepth) {
  return baseFreq * t - (vibratoDepth / (2 * Math.PI * vibratoRate)) *
         Math.cos(2 * Math.PI * vibratoRate * t);
}

function sweepPhase(t, f0, f1, duration) {
  const progress = Math.min(t / duration, 1);
  return f0 * t + (f1 - f0) * t * progress / 2;
}

function expPitchPhase(t, f0, f1, decay) {
  return f1 * t + (f0 - f1) * (1 - Math.exp(-decay * t)) / decay;
}

// Usage
const { vibratoPhase, bend } = signal;

signal('vibrato', t => {
  const phase = vibratoPhase(t, 440, 5, 10);
  return Math.sin(2 * Math.PI * phase) * 0.2;
});

signal('pitch-wheel', t => {
  const semitones = Math.sin(t) * 2;  // ±2 semitone bend
  const freq = bend(440, semitones);
  return Math.sin(2 * Math.PI * freq * t) * 0.2;
});
```

### 2. Memoization Helper (index.js)

```javascript
// General memoization for any Time → Sample function
signal.memoize = function(fn) {
  const cache = new Map();
  return t => {
    const key = Math.round(t * SAMPLE_RATE);
    if (cache.has(key)) return cache.get(key);
    const result = fn(t);
    cache.set(key, result);
    return result;
  };
};
```

### 3. Recursive FM Oscillator (index.js)

```javascript
// Arbitrary frequency modulation (pure functional with memoization)
signal.fmOsc = function(carrierFreq, modulator) {
  const dt = 1 / SAMPLE_RATE;
  const phase = signal.memoize(t => {
    if (t <= dt) return 0;
    const freq = carrierFreq + modulator.eval(t);
    return phase(t - dt) + (freq * dt);
  });
  return new Signal(t => Math.sin(2 * Math.PI * phase(t)));
};

// Usage
const lfo = signal.sin(5).gain(100);
const fm = signal.fmOsc(440, lfo);
signal('fm-synth', fm.fn);
```

### 4. Stateful Oscillator (Optional, index.js)

```javascript
// Traditional stateful approach for maximum performance
class Oscillator {
  constructor(freq) {
    this.phase = 0;
    this.freq = freq;
  }

  next(freqMod = 0) {
    const output = Math.sin(2 * Math.PI * this.phase);
    this.phase += (this.freq + freqMod) / SAMPLE_RATE;
    if (this.phase >= 1.0) this.phase -= 1.0;
    return output;
  }

  setFreq(freq) {
    this.freq = freq;
  }
}

signal.osc = function(freq) {
  return new Oscillator(freq);
};

// Usage
const osc = signal.osc(440);
const mod = signal.osc(5);

signal('fm', () => {
  osc.setFreq(440 + mod.next() * 100);
  return osc.next() * 0.2;
});
```

## Usage Examples

### Example 1: Quick Vibrato Sketch (Approximate)

```javascript
// Quick and dirty - approximation good enough for sketching
const vibrato = t => Math.sin(t) * 5;  // ±5 semitones
signal('sketch').sin(bend(440, vibrato)).gain(0.2);
```

### Example 2: Proper Vibrato (Analytical)

```javascript
// Mathematically correct with pre-computed phase
const { vibratoPhase } = signal;

signal('proper-vib', t => {
  const phase = vibratoPhase(t, 440, 5, 10);
  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

### Example 3: Complex FM (Memoized Recursive)

```javascript
// Arbitrary modulation with memoization
const carrier = signal.fmOsc(440, signal.sin(3).gain(200));
const modulated = signal.fmOsc(carrier, signal.sin(7).gain(50));

signal('complex-fm', modulated.fn);
```

### Example 4: Fast FM (Stateful)

```javascript
// Maximum performance for real-time use
const carrier = signal.osc(440);
const mod1 = signal.osc(3);
const mod2 = signal.osc(7);

signal('fast-fm', () => {
  const m1 = mod1.next() * 200;
  const m2 = mod2.next() * 50;
  carrier.setFreq(440 + m1 + m2);
  return carrier.next() * 0.2;
});
```

### Example 5: Glissando (Analytical)

```javascript
// Smooth pitch sweep
const { sweepPhase } = signal;

signal('gliss', t => {
  const phase = sweepPhase(t, 220, 880, 4);  // A3 to A5 over 4 seconds
  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

### Example 6: Portamento (Exponential approach to target)

```javascript
// Smooth exponential glide to target frequency
signal('portamento', t => {
  const f0 = 440;
  const target = 660;
  const rate = 5;  // Glide rate

  const freq = target + (f0 - target) * Math.exp(-rate * t);
  const phase = target * t + (f0 - target) * (1 - Math.exp(-rate * t)) / rate;

  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

## Philosophy for Signal

Signal embraces **flexibility** - code music however JavaScript allows:

1. **Quick sketches:** Use approximations, they're often good enough
2. **Analytical solutions:** For common patterns (vibrato, sweeps)
3. **Memoized recursion:** For arbitrary modulation while staying functional
4. **Explicit state:** When you need maximum performance
5. **Pipes:** For chaining effects (both stateless and stateful)

No single approach is "correct" - different tools for different situations. Signal provides all the tools and lets you choose.

## Further Reading

- [STATE-AND-RECURSION.md](./STATE-AND-RECURSION.md) - Deep dive into state, recursion, and memoization
- [Phase Accumulator (Wikipedia)](https://en.wikipedia.org/wiki/Numerically-controlled_oscillator)
- [Wavetable Oscillator Implementation](https://www.earlevel.com/main/2012/05/25/a-wavetable-oscillator-the-code/)
- [SuperCollider SinOsc Documentation](https://doc.sccode.org/Classes/SinOsc.html)
