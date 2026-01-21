# Pure Functional Delay and Feedback

## Introduction

Delay and feedback are fundamental audio effects. In traditional audio programming, they require buffers and state. But with Signal's `Time → Sample` model, we can implement them purely functionally.

**Key insight**: With random access to any time `t`, delays are just evaluation at `t - delayTime`. Feedback is corecursion - looking backward in time.

## Simple Delays (No Feedback)

The easiest case - just evaluate the signal at an earlier time.

### Basic Delay Method

```javascript
// Add to Signal class
Signal.prototype.delay = function(delayTime) {
  const input = this.fn;

  return new Signal(t => {
    // Look backwards in time
    if (t < delayTime) return 0;  // Before signal starts
    return input(t - delayTime);
  });
};

// Usage
const signal = require('@rolandnsharp/signal');

const dry = signal.sin(440).gain(0.3);
const wet = dry.delay(0.5);  // 500ms delay

signal('echo', t => dry.eval(t) + wet.eval(t) * 0.6);
```

### Multi-Tap Delay

Multiple delayed copies at different times.

```javascript
Signal.prototype.multiTap = function(delayTimes, gains) {
  const input = this.fn;

  return new Signal(t => {
    let sum = input(t);  // Dry signal

    delayTimes.forEach((delayTime, i) => {
      if (t >= delayTime) {
        const gain = gains[i] || (1 / (i + 2));  // Default decay
        sum += input(t - delayTime) * gain;
      }
    });

    return sum;
  });
};

// Usage - rhythmic echo
const echo = signal.sin(440)
  .gain(0.3)
  .multiTap(
    [0.125, 0.25, 0.375, 0.5],  // 1/8, 1/4, 3/8, 1/2 second
    [0.6, 0.4, 0.3, 0.2]         // Decay
  );

signal('rhythmic-echo', echo.fn);
```

### Ping-Pong Delay (Stereo)

Alternating delays between left and right channels.

```javascript
Signal.prototype.pingPong = function(delayTime, feedback = 0.6) {
  const input = this.fn;

  return new StereoSignal(
    new Signal(t => {
      // Left: input + right delayed
      if (t < delayTime) return input(t);

      const rightDelayed = input(t - delayTime);
      return input(t) + rightDelayed * feedback;
    }),
    new Signal(t => {
      // Right: input + left delayed
      if (t < delayTime) return input(t);

      const leftDelayed = input(t - delayTime);
      return input(t) + leftDelayed * feedback;
    })
  );
};
```

## Feedback Delays

This is where it gets interesting - output depends on previous output.

### The Challenge

```javascript
// Circular dependency problem:
const output = t => {
  const dry = input(t);
  const wet = output(t - delayTime) * feedback;  // Needs itself!
  return dry + wet;
};
```

### Solution: Corecursion

The recursive call looks **backward in time**, so it's not actually circular - eventually hits `t < delayTime` base case.

```javascript
Signal.prototype.feedback = function(delayTime, feedbackAmount) {
  const input = this.fn;

  // Recursive feedback with memoization
  const cache = new Map();

  const output = t => {
    // Check cache first
    const key = Math.round(t * 48000);  // Quantize to sample
    if (cache.has(key)) return cache.get(key);

    // Base case: before delay starts
    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    // Recursive case: include delayed feedback
    const dry = input(t);
    const wet = output(t - delayTime) * feedbackAmount;  // Corecursion!
    const result = dry + wet;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};

// Usage - classic dub echo
const signal = require('@rolandnsharp/signal');
const { step, env } = signal;

signal('dub', t => {
  const { phase } = step(t, 90, 4);

  // Short hit
  if (phase > 0.1) return 0;

  const hit = Math.sin(2 * Math.PI * 200 * t) * env.exp(phase, 10);

  // Feedback delay creates infinite echoes
  const delayed = signal.sin(200).feedback(0.375, 0.7);

  return hit;
}).feedback(0.375, 0.7).gain(0.3);
```

### Important: Sequential Evaluation

Memoization only works efficiently if samples are evaluated **in order** (which `fillBuffer` does):

```javascript
// Signal's fillBuffer at index.js:356
for (let i = 0; i < samplesPerChannel; i++) {
  const t = startTime + (i / SAMPLE_RATE);  // Sequential!
  const sample = sig.eval(t);
}

// With sequential evaluation + memoization:
// - output(t) needs output(t - delayTime)
// - output(t - delayTime) is already cached from previous iteration
// - Each sample is O(1)!
```

## Advanced Feedback Patterns

### Time-Varying Delay

```javascript
Signal.prototype.variableDelay = function(delayTimeFn, feedbackAmount) {
  const input = this.fn;
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    // Delay time changes over time
    const delayTime = delayTimeFn(t);

    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const dry = input(t);
    const wet = output(t - delayTime) * feedbackAmount;
    const result = dry + wet;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};

// Usage - chorus/flanger effect
const modulated = signal.sin(440).variableDelay(
  t => 0.02 + 0.01 * Math.sin(2 * Math.PI * 0.5 * t),  // 20-30ms varying
  0.5
);
```

### Multi-Band Feedback

Different feedback for different frequency ranges.

```javascript
Signal.prototype.coloredFeedback = function(delayTime, lowFeedback, highFeedback) {
  const input = this.fn;
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const dry = input(t);
    const delayed = output(t - delayTime);

    // Simple one-pole lowpass on feedback
    const dt = 1 / 48000;
    const alpha = 0.3;  // Cutoff
    const lowpass = alpha * delayed + (1 - alpha) * output(t - delayTime - dt);

    const result = dry + lowpass * lowFeedback;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};
```

### Nested Feedback (Multiple Delay Lines)

```javascript
Signal.prototype.multiFeedback = function(delays, feedbacks) {
  const input = this.fn;
  const caches = delays.map(() => new Map());

  const outputs = delays.map((delayTime, i) => {
    const cache = caches[i];

    return t => {
      const key = Math.round(t * 48000);
      if (cache.has(key)) return cache.get(key);

      if (t < delayTime) {
        const result = input(t);
        cache.set(key, result);
        return result;
      }

      const dry = input(t);

      // Each delay feeds back to itself AND cross-feeds to others
      let wet = 0;
      delays.forEach((otherDelay, j) => {
        if (t >= otherDelay) {
          wet += outputs[j](t - otherDelay) * feedbacks[i][j];
        }
      });

      const result = dry + wet;
      cache.set(key, result);
      return result;
    };
  });

  // Mix all outputs
  return new Signal(t => {
    return outputs.reduce((sum, output) => sum + output(t), 0) / outputs.length;
  });
};

// Usage - complex reverb-like network
const reverb = signal.sin(440).multiFeedback(
  [0.029, 0.037, 0.041, 0.043],  // Prime number delays (Schroeder)
  [
    [0.7, 0.2, 0.2, 0.2],  // Delay 0 feeds mostly to itself
    [0.2, 0.7, 0.2, 0.2],  // Delay 1 feeds mostly to itself
    [0.2, 0.2, 0.7, 0.2],  // etc.
    [0.2, 0.2, 0.2, 0.7]
  ]
);
```

## IIR Filters as Feedback Systems

Filters are just feedback at the sample rate!

### One-Pole Lowpass

```javascript
Signal.prototype.lowpass = function(cutoff) {
  const input = this.fn;
  const alpha = cutoff / 48000;
  const cache = new Map();
  const dt = 1 / 48000;

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t <= dt) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    // y[n] = α * x[n] + (1 - α) * y[n-1]
    const result = alpha * input(t) + (1 - alpha) * output(t - dt);

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};

// Usage
const filtered = signal.sin(440).lowpass(1000).gain(0.2);
```

### Two-Pole Filter (More Resonance)

```javascript
Signal.prototype.resonant = function(cutoff, resonance = 0.7) {
  const input = this.fn;
  const cache = new Map();
  const dt = 1 / 48000;

  // Coefficients for 2-pole filter
  const omega = 2 * Math.PI * cutoff / 48000;
  const alpha = Math.sin(omega) / (2 * resonance);
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(omega);
  const a2 = 1 - alpha;
  const b0 = (1 - Math.cos(omega)) / 2;
  const b1 = 1 - Math.cos(omega);
  const b2 = (1 - Math.cos(omega)) / 2;

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t <= 2 * dt) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    // Biquad filter equation
    const result = (
      b0 * input(t) +
      b1 * input(t - dt) +
      b2 * input(t - 2 * dt) -
      a1 * output(t - dt) / a0 -
      a2 * output(t - 2 * dt) / a0
    );

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};
```

## Reverb from Feedback Networks

Classic Schroeder reverb using comb filters and allpass filters.

### Comb Filter (Feedback Delay)

```javascript
Signal.prototype.comb = function(delayTime, feedback = 0.7) {
  // Same as .feedback() but explicit naming for reverb context
  return this.feedback(delayTime, feedback);
};
```

### Allpass Filter

```javascript
Signal.prototype.allpass = function(delayTime, feedback = 0.7) {
  const input = this.fn;
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const delayed = output(t - delayTime);

    // Allpass: y[n] = -x[n] + x[n-M] + g*y[n-M]
    const result = -input(t) + input(t - delayTime) + feedback * delayed;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};
```

### Schroeder Reverb

```javascript
Signal.prototype.reverb = function() {
  // Parallel comb filters
  const comb1 = this.comb(0.0297, 0.7);
  const comb2 = this.comb(0.0371, 0.7);
  const comb3 = this.comb(0.0411, 0.7);
  const comb4 = this.comb(0.0437, 0.7);

  // Mix combs
  const combMix = new Signal(t =>
    (comb1.eval(t) + comb2.eval(t) + comb3.eval(t) + comb4.eval(t)) * 0.25
  );

  // Series allpass filters
  const ap1 = combMix.allpass(0.005, 0.7);
  const ap2 = ap1.allpass(0.0017, 0.7);

  return ap2;
};

// Usage - instant reverb!
const dry = signal.sin(440).gain(0.2);
const wet = dry.reverb().gain(0.4);

signal('hall', t => dry.eval(t) + wet.eval(t));
```

## Practical Examples

### Example 1: Dub Delay Effect

```javascript
const signal = require('@rolandnsharp/signal');
const { step, env, freq, scales } = signal;

// Melody
const melody = signal('melody', t => {
  const { index, phase } = step(t, 85, 8);
  const pattern = [0, 3, 7, 5];
  const degree = pattern[index % pattern.length];
  const f = freq(330, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.15;
});

// Add dub-style feedback delay
const dubbed = melody.feedback(0.375, 0.65).gain(0.8);

signal('dub', dubbed.fn);
```

### Example 2: Shimmer Reverb

Reverb + pitch shift in feedback loop.

```javascript
Signal.prototype.shimmer = function() {
  const input = this.fn;
  const cache = new Map();
  const delayTime = 0.1;
  const feedback = 0.6;

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const dry = input(t);

    // Pitch shift feedback up one octave (2x speed)
    const shifted = output(t - delayTime * 2);
    const result = dry + shifted * feedback;

    cache.set(key, result);
    return result;
  };

  return new Signal(output).reverb();
};
```

### Example 3: Karplus-Strong String Synthesis

Physical modeling using feedback delay + filtering.

```javascript
function karplusStrong(frequency, duration = 2) {
  const delayTime = 1 / frequency;
  const cache = new Map();

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    // Initial excitation: noise burst
    if (t < 0.01) {
      const result = (Math.random() * 2 - 1) * 0.5;
      cache.set(key, result);
      return result;
    }

    if (t < delayTime) {
      cache.set(key, 0);
      return 0;
    }

    // Feedback with averaging (simple lowpass)
    const dt = 1 / 48000;
    const avg = (output(t - delayTime) + output(t - delayTime - dt)) / 2;
    const result = avg * 0.998;  // Slight decay

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
}

// Usage - sounds like a plucked string!
signal('pluck', t => {
  const string = karplusStrong(220);
  return string.eval(t);
});
```

### Example 4: Infinite Reverb (Freeze)

```javascript
Signal.prototype.freeze = function() {
  // Very long feedback = infinite sustain
  return this.feedback(0.1, 0.99).reverb();
};

// Usage
const pad = signal.sin(220).freeze().gain(0.2);
```

## Performance Optimization

### Cache Size Management

```javascript
Signal.prototype.feedback = function(delayTime, feedbackAmount, maxCacheSize = 100000) {
  const input = this.fn;
  const cache = new Map();

  const output = t => {
    // Periodic cache cleanup
    if (cache.size > maxCacheSize) {
      const oldestKey = Math.round((t - 2) * 48000);  // Keep 2 seconds
      for (let key of cache.keys()) {
        if (key < oldestKey) cache.delete(key);
      }
    }

    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    // ... rest of implementation
  };

  return new Signal(output);
};
```

### Stateful Alternative (For Comparison)

For users who want maximum performance, here's the stateful version:

```javascript
class FeedbackDelay {
  constructor(sampleRate, delayTime, feedback) {
    this.buffer = new Float32Array(Math.ceil(sampleRate * delayTime));
    this.writeIndex = 0;
    this.feedback = feedback;
  }

  process(input) {
    // Read from buffer
    const delayed = this.buffer[this.writeIndex];

    // Write to buffer
    const output = input + delayed * this.feedback;
    this.buffer[this.writeIndex] = output;

    // Advance
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;

    return output;
  }
}

// This is faster but breaks random access
```

## Implementation Recommendations

### Add to Signal Core

```javascript
// In src/index.js, add to Signal.prototype:

Signal.prototype.delay = function(delayTime) {
  const input = this.fn;
  return new Signal(t => {
    if (t < delayTime) return 0;
    return input(t - delayTime);
  });
};

Signal.prototype.feedback = function(delayTime, feedbackAmount) {
  const input = this.fn;
  const cache = new Map();
  const SAMPLE_RATE = 48000;

  const output = t => {
    const key = Math.round(t * SAMPLE_RATE);
    if (cache.has(key)) return cache.get(key);

    if (t < delayTime) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const dry = input(t);
    const wet = output(t - delayTime) * feedbackAmount;
    const result = dry + wet;

    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};

Signal.prototype.lowpass = function(cutoff) {
  const input = this.fn;
  const alpha = cutoff / 48000;
  const cache = new Map();
  const dt = 1 / 48000;

  const output = t => {
    const key = Math.round(t * 48000);
    if (cache.has(key)) return cache.get(key);

    if (t <= dt) {
      const result = input(t);
      cache.set(key, result);
      return result;
    }

    const result = alpha * input(t) + (1 - alpha) * output(t - dt);
    cache.set(key, result);
    return result;
  };

  return new Signal(output);
};
```

## Philosophy

Signal's `Time → Sample` model makes delays **trivial** and feedback **elegant**:

- **Simple delays**: Pure functions, no state, just `t - delayTime`
- **Feedback**: Corecursion with memoization maintains purity
- **Filters**: Special case of feedback at sample rate
- **Composable**: Chain `.delay().feedback().lowpass()` naturally

The memoization "trick" is just making explicit what stateful code does implicitly - cache previous results. But we keep the mathematical purity and random access benefits.

## Trade-offs

**Pure Functional Approach:**
- ✓ Random access to any time
- ✓ Mathematical purity
- ✓ Easy to reason about
- ✓ Composable
- ✗ Requires memoization
- ✗ Cache memory grows (manageable with cleanup)

**Stateful Approach:**
- ✓ Slightly faster
- ✓ Fixed memory (circular buffer)
- ✗ Must process sequentially
- ✗ Harder to reason about
- ✗ State management complexity

For Signal, the pure approach aligns with the philosophy while remaining practical.

## Further Reading

- [STATE-AND-RECURSION.md](./STATE-AND-RECURSION.md) - Deep dive on recursion
- [PITCH-BENDING.md](./PITCH-BENDING.md) - Phase accumulation with memoization
- Julius O. Smith - "Physical Audio Signal Processing" (Stanford CCRMA)
- Schroeder, M. R. - "Natural Sounding Artificial Reverberation" (1962)

## Related Documentation

- [Y-COMBINATOR-MUSIC.md](./Y-COMBINATOR-MUSIC.md) - Recursion patterns
- [GENERATIVE-SEQUENCES.md](./GENERATIVE-SEQUENCES.md) - Infinite sequences
