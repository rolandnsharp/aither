# State, Recursion, and Pure Functional Audio Synthesis

## The Core Question

Can Signal's pure `Time → Sample` model handle everything, or do we need state?

**TL;DR:** You can do almost everything purely functionally with recursion + memoization, but explicit state is more efficient and familiar. Signal can support both approaches.

## What Signal Does Now

Pure random-access functions from time to sample:

```javascript
signal('tone', t => Math.sin(2 * Math.PI * 440 * t) * 0.2)
```

Any sample can be computed independently at any time `t`. No state, no dependencies on previous samples.

## Problems That Seem to Need State

### 1. Time-Varying Frequency (Pitch Bends, FM)

**The Problem:**

```javascript
// INCORRECT - produces phase discontinuities
signal('bend', t => {
  const freq = 440 + 440 * Math.min(t, 1);  // 440→880 Hz
  return Math.sin(2 * Math.PI * freq * t) * 0.2;
});
```

The formula `sin(2π·freq·t)` only works for constant frequency. When frequency varies, you need **phase accumulation** - the integral of frequency over time.

**Stateful Solution:**

```javascript
class Oscillator {
  constructor(freq) {
    this.phase = 0;  // STATE
    this.freq = freq;
  }

  next(freqMod = 0) {
    const output = Math.sin(2 * Math.PI * this.phase);
    this.phase += (this.freq + freqMod) / SAMPLE_RATE;
    if (this.phase >= 1.0) this.phase -= 1.0;
    return output;
  }
}
```

**Pure Functional Solution (Analytical):**

For simple frequency functions, derive the phase integral:

```javascript
// Vibrato: f(t) = 440 + 10·sin(2π·5·t)
// Phase: ∫f(t)dt = 440t - (10/2π·5)·cos(2π·5·t)
signal('vibrato', t => {
  const phase = 440 * t - (10 / (2 * Math.PI * 5)) * Math.cos(2 * Math.PI * 5 * t);
  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

**Pure Functional Solution (Recursive):**

```javascript
function fmOsc(carrierFreq, modulator) {
  const dt = 1 / SAMPLE_RATE;
  const cache = new Map();

  const phase = t => {
    const key = Math.round(t * SAMPLE_RATE);
    if (cache.has(key)) return cache.get(key);

    if (t <= dt) return 0;  // Base case
    const freq = carrierFreq + modulator.eval(t);
    const result = phase(t - dt) + (freq * dt);  // Recurse one sample back

    cache.set(key, result);
    return result;
  };

  return new Signal(t => Math.sin(2 * Math.PI * phase(t)));
}

// Usage
const lfo = signal.sin(5).gain(100);  // 5 Hz LFO, ±100 Hz depth
signal('fm', fmOsc(440, lfo).fn);
```

### 2. Feedback Delays

**The Problem:**

Output depends on previous output - seems circular!

```javascript
// How do we make output depend on itself?
signal('feedback-delay', t => {
  const input = Math.sin(2 * Math.PI * 440 * t);
  const delayed = ??? // Needs previous output
  return input + delayed * 0.5;
});
```

**Stateful Solution:**

```javascript
class DelayLine {
  constructor(delaySamples) {
    this.buffer = new Float32Array(delaySamples);
    this.writeIdx = 0;
  }

  process(input, feedback) {
    const delayed = this.buffer[this.writeIdx];
    const output = input + delayed * feedback;
    this.buffer[this.writeIdx] = output;
    this.writeIdx = (this.writeIdx + 1) % this.buffer.length;
    return output;
  }
}
```

**Pure Functional Solution (Recursive):**

It's not circular because we look **backwards in time**!

```javascript
function feedbackDelay(input, delayTime, feedbackAmt) {
  const output = t => {
    const dry = input.eval(t);
    // Not circular - t-delayTime is in the PAST
    const wet = t >= delayTime ? output(t - delayTime) : 0;
    return dry + wet * feedbackAmt;
  };
  return new Signal(output);
}

// Usage - dub echo
const dry = signal.sin(440);
const echo = feedbackDelay(dry, 0.375, 0.7);  // 375ms delay, 70% feedback
signal('dub', echo.fn);
```

This is **corecursion** - recursion where the recursive call is on a *smaller* input (earlier time). Not infinite because of the base case `t >= delayTime`.

**With Memoization:**

```javascript
function feedbackDelayMemo(input, delayTime, feedbackAmt) {
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * SAMPLE_RATE);
    if (cache.has(key)) return cache.get(key);

    const dry = input.eval(t);
    const wet = t >= delayTime ? output(t - delayTime) : 0;
    const result = dry + wet * feedbackAmt;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
}
```

Memoization makes this O(1) per sample when evaluated sequentially (which `fillBuffer` does).

### 3. IIR Filters

**The Problem:**

Infinite Impulse Response filters depend on previous *output* samples.

```javascript
// One-pole lowpass: y[n] = α·x[n] + (1-α)·y[n-1]
// y[n-1] means previous output - seems stateful
```

**Stateful Solution:**

```javascript
class OnePole {
  constructor(cutoff, sampleRate) {
    this.alpha = cutoff / sampleRate;
    this.lastOutput = 0;  // STATE
  }

  process(input) {
    this.lastOutput = this.alpha * input + (1 - this.alpha) * this.lastOutput;
    return this.lastOutput;
  }
}
```

**Pure Functional Solution (Recursive):**

```javascript
function lowpass(input, cutoff) {
  const alpha = cutoff / SAMPLE_RATE;
  const dt = 1 / SAMPLE_RATE;
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * SAMPLE_RATE);
    if (cache.has(key)) return cache.get(key);

    if (t <= dt) return 0;
    const result = alpha * input.eval(t) + (1 - alpha) * output(t - dt);

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
}

// Usage
const tone = signal.sin(440);
const filtered = lowpass(tone, 1000);
signal('smooth', filtered.fn);
```

Again, recursion + memoization makes this work efficiently.

### 4. Simple Delays (No Feedback)

**Good News:** These work perfectly with no state at all!

```javascript
// Just evaluate at an earlier time
signal('echo', t => {
  const dry = Math.sin(2 * Math.PI * 440 * t);
  const wet = Math.sin(2 * Math.PI * 440 * (t - 0.5));  // 500ms ago
  return (dry + wet * 0.5) * 0.2;
});

// Multi-tap echo
signal('multitap', t => {
  const dry = Math.sin(2 * Math.PI * 440 * t);
  return (
    dry +
    dry.eval(t - 0.25) * 0.5 +
    dry.eval(t - 0.5) * 0.25 +
    dry.eval(t - 0.75) * 0.125
  ) * 0.15;
});

// Simple reverb
signal('reverb', t => {
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    sum += Math.sin(2 * Math.PI * 440 * (t - i * 0.01)) * Math.pow(0.8, i);
  }
  return sum * 0.1;
});
```

No recursion, no state, no problem!

### 5. FIR Filters

**Good News:** Finite Impulse Response filters also work purely functionally!

```javascript
// Moving average (simple lowpass)
signal('smoothed', t => {
  const samples = 5;
  const dt = 1 / SAMPLE_RATE;
  let sum = 0;

  for (let i = 0; i < samples; i++) {
    sum += Math.sin(2 * Math.PI * 440 * (t - i * dt));
  }

  return sum / samples * 0.2;
});
```

FIR filters only depend on *input* history, not output history, so they're naturally functional.

## The Performance Question

### Naive Recursion Problem

Without memoization, recursive calls explode:

```javascript
const phase = t => {
  if (t <= dt) return 0;
  return phase(t - dt) + freq * dt;  // Recurses all the way to t=0!
};

// At t=1.0 with 48kHz → 48,000 recursive calls!
```

### Why Memoization Works

Signal's `fillBuffer` processes samples **sequentially in order**:

```javascript
// index.js:356-360
for (let i = 0; i < samplesPerChannel; i++) {
  const t = startTime + (i / SAMPLE_RATE);
  const mono = sig.eval(t);  // Evaluated in order: t₀, t₁, t₂, ...
}
```

With memoization:
1. First sample: compute `phase(t₀)` - needs `phase(t₀-dt)` = 0 (base case)
2. Second sample: compute `phase(t₁)` - `phase(t₀)` already cached!
3. Third sample: compute `phase(t₂)` - `phase(t₁)` already cached!

Each sample only does O(1) work.

### Stream Processing is Memoization Enforced

Traditional "stream processing" is just forcing sequential evaluation with implicit memoization:

```javascript
// Stream processing (traditional)
for (let i = 0; i < samples; i++) {
  phase += freq / SAMPLE_RATE;  // State implicitly "memoizes" previous value
  output[i] = Math.sin(2 * Math.PI * phase);
}

// Recursive + memoized (equivalent)
for (let i = 0; i < samples; i++) {
  const t = i / SAMPLE_RATE;
  output[i] = oscillator.eval(t);  // Cache makes it O(1)
}
```

They're computationally equivalent!

## Comparison with Pure Functional Audio Libraries

### hsc3 (Haskell SuperCollider)

```haskell
-- Pure functional graph description
sinOsc ar 440 0 * 0.1
```

**Reality:** hsc3 builds a pure *description* of the synthesis graph, then sends it to SuperCollider server (C++) which does actual synthesis with traditional stateful phase accumulators. The synthesis itself is not functional.

### Euterpea (Haskell)

```haskell
osc_ phs = proc freq -> do
  rec
    let delta = 1 / sr * freq
        phase = if next > 1 then frac next else next
    next <- delay phs -< frac (phase + delta)
  outA -< phase
```

**Reality:** Uses arrow notation with `delay` primitive for one-sample state through feedback. This is stream processing - state encoded functionally through recursive streams. Not `Time → Sample` random access.

### Signal's Advantage

Signal is actually **more purely functional** than Haskell libraries:
- True `Time → Sample` random access (not sequential streams)
- Can evaluate any sample at any time
- No hidden sequential evaluation requirements

But can also add explicit state or memoized recursion for performance.

## What Can Be Pure vs What Needs State/Memoization

| Operation | Pure Functional | Needs State/Memo | Notes |
|-----------|----------------|------------------|-------|
| Static frequency sine | ✓ | | `sin(2π·f·t)` |
| Simple delays (no feedback) | ✓ | | Just evaluate at `t - delay` |
| FIR filters | ✓ | | Depend only on input history |
| Multi-tap echo | ✓ | | Sum of simple delays |
| Pitch bends (analytical) | ✓ | | If you can derive the phase integral |
| Time-varying frequency (arbitrary) | | ✓ | Phase accumulation needs recursion+memo or state |
| Feedback delays | | ✓ | Corecursion works but needs memoization |
| IIR filters | | ✓ | Depend on output history - recursion+memo or state |
| FM synthesis | | ✓ | Unless you derive analytical phase |

## Philosophy for Signal

**Embrace flexibility** - let users code music however JavaScript allows:

### Level 1: Pure Functional (No state)
```javascript
// Static frequencies
signal('tone').sin(440).gain(0.2)

// Simple delays
signal('echo', t => {
  const dry = Math.sin(2 * Math.PI * 440 * t);
  return dry + dry.eval(t - 0.5) * 0.5;
})
```

### Level 2: Pure with Analytical Integrals
```javascript
// Pre-computed phase functions for common patterns
const { vibratoPhase, sweepPhase } = signal;

signal('vibrato', t => {
  const phase = vibratoPhase(t, 440, 5, 10);
  return Math.sin(2 * Math.PI * phase) * 0.2;
});
```

### Level 3: Recursive + Memoized (Advanced functional)
```javascript
// Full flexibility, stays pure
const lfo = signal.sin(5).gain(100);
const fm = signal.fmOsc(440, lfo);  // Uses recursive phase accumulation
signal('fm-synth', fm.fn);
```

### Level 4: Explicit State (Maximum performance)
```javascript
// Traditional approach - familiar and fast
const osc = signal.osc(440);  // Returns stateful Oscillator
const mod = signal.osc(5);

signal('fm', () => {
  const modAmount = mod.next() * 100;
  osc.setFreq(440 + modAmount);
  return osc.next() * 0.2;
});
```

### Level 5: Stream Processing with .pipe()
```javascript
// Chainable stateful processors
signal.osc(440)
  .pipe(lowpass(1000))    // Stateful IIR filter
  .pipe(delay(0.5, 0.6))  // Stateful feedback delay
  .pipe(reverb())         // Stateful reverb
```

## Recommended Implementation

### Add to melody.js
```javascript
// Semitone helper
function bend(freq, semitones) {
  return freq * Math.pow(2, semitones / 12);
}

// Analytical phase functions
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
```

### Add to index.js
```javascript
// Memoization helper
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

// Recursive FM oscillator
signal.fmOsc = function(carrierFreq, modulator) {
  const dt = 1 / SAMPLE_RATE;
  const phase = signal.memoize(t => {
    if (t <= dt) return 0;
    const freq = carrierFreq + modulator.eval(t);
    return phase(t - dt) + (freq * dt);
  });
  return new Signal(t => Math.sin(2 * Math.PI * phase(t)));
};

// Recursive feedback delay
signal.feedbackDelay = function(input, delayTime, feedbackAmt) {
  const output = signal.memoize(t => {
    const dry = input.eval(t);
    const wet = t >= delayTime ? output(t - delayTime) : 0;
    return dry + wet * feedbackAmt;
  });
  return new Signal(output);
};

// Stateful oscillator (optional)
signal.osc = function(freq) {
  return new Oscillator(freq);
};
```

## The Beautiful Truth

**Pure functional programming has no fundamental limitations** - it's Turing complete. Recursion + memoization can compute anything stateful code can.

**Stream processing is just memoization enforced** through sequential evaluation.

Signal can be:
1. More pure than Haskell audio libraries (true random access)
2. As efficient as stateful libraries (with memoization or explicit state)
3. Flexible enough to let users choose their style

The philosophy: **code music however JavaScript allows** - functional, imperative, or hybrid.
