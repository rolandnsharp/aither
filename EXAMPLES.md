# Kanon API Examples

Complete guide to the Kanon API with examples.

---

## Quick Examples

### Simple Tone

```javascript
const signal = require('./signal');

// Simple sine wave
signal('tone').sin(432).gain(0.2);
```

### Distorted Bass

```javascript
signal('bass').sin(110)
  .fx(sample => Math.tanh(sample * 3))
  .gain(0.3);
```

### Tremolo (AM)

```javascript
const lfo = signal.sin(3).gain(0.5).offset(0.5);
signal('tremolo').sin(440).modulate(lfo).gain(0.2);
```

### Chord

```javascript
signal('chord').sin(432)
  .mix(signal.sin(540), signal.sin(648))
  .gain(0.15);
```

---

## Melodic Sequencing

```javascript
const { step } = require('./signal/rhythm');
const { freq } = require('./signal/melody');
const { env } = require('./signal/envelopes');
const scales = require('./signal/scales');

signal('melody').fn(t => {
  const { index, phase } = step(t, 120, 8);  // 8th notes at 120 BPM
  const pattern = [0, 2, 4, 2, 5, 4, 2, 0];  // Scale degrees
  const degree = pattern[index % pattern.length];

  const f = freq(432, scales.major, degree);
  const envelope = env.exp(phase, 5);  // Exponential decay

  return signal.sin(f).eval(t) * envelope * 0.2;
});
```

---

## Rhythmic Patterns

### Step Sequencer

```javascript
const { step } = require('./signal/rhythm');

signal('kick').fn(t => {
  const { index, phase } = step(t, 128, 16);  // 16th notes
  const pattern = [1, 0, 0, 0, 1, 0, 0, 0];   // Kick pattern

  if (!pattern[index % pattern.length]) return 0;
  if (phase > 0.3) return 0;  // Short trigger

  const f = 60 + 50 * Math.exp(-15 * phase);  // Pitch envelope
  return signal.sin(f).eval(t) * Math.exp(-8 * phase) * 0.4;
});
```

### Euclidean Rhythm

```javascript
const { step, euclidean } = require('./signal/rhythm');

const pattern = euclidean(5, 16);  // 5 pulses in 16 steps

signal('euclid').fn(t => {
  const { index, phase } = step(t, 120, 16);

  if (!pattern[index % pattern.length]) return 0;

  return signal.sin(432).eval(t) * Math.exp(-8 * phase) * 0.3;
});
```

---

## Tempo Control with `step`

**Why `step` instead of a tempo API?**

Signal uses `step(t, bpm, subdivision)` because it's a **pure mathematical function** (`Time → {beat, index, phase}`), not a scheduler or global state manager. This fits Signal's philosophy:

- **Explicit**: You see the BPM right in your code
- **Pure**: Same time input = same rhythm output
- **Live-codeable**: Change `60` to `120` and save - instant feedback
- **Composable**: Use `phase`, `index`, or `beat` directly in your DSP math

### Slowing Down Complex Signals

When a continuous signal sounds "mushed together," add rhythmic gating:

```javascript
const { step, env } = require('@rolandnsharp/kanon');

// Without rhythm - continuous drone (sounds muddy)
signal('continuous', t => {
  return fractalSynth(t) * 0.3;
});

// With rhythm - gated by tempo (clear articulation)
signal('gated', t => {
  const { phase } = step(t, 60, 4);  // 60 BPM, quarter notes
  return fractalSynth(t) * env.exp(phase, 8);  // Gate with envelope
});
```

### Tempo Ranges

```javascript
const { step, env } = require('@rolandnsharp/kanon');

// Very slow - meditative, spacious (20-40 BPM)
signal('slow', t => {
  const { phase } = step(t, 30, 4);
  return signal.sin(110).eval(t) * env.exp(phase, 6) * 0.3;
});

// Slow - downtempo, hip-hop (60-90 BPM)
signal('downtempo', t => {
  const { phase } = step(t, 75, 8);
  return signal.sin(220).eval(t) * env.exp(phase, 5) * 0.3;
});

// Medium - house, pop (90-130 BPM)
signal('medium', t => {
  const { phase } = step(t, 120, 8);
  return signal.sin(330).eval(t) * env.exp(phase, 5) * 0.3;
});

// Fast - techno, drum & bass (130-180 BPM)
signal('fast', t => {
  const { phase } = step(t, 160, 16);
  return signal.sin(440).eval(t) * env.exp(phase, 4) * 0.3;
});
```

### Subdivision Controls Note Density

The third parameter is **note subdivision**, not the number of steps:

```javascript
// Same BPM, different subdivisions
const { step, env } = require('@rolandnsharp/kanon');

// Quarter notes - sparse (4 notes per bar at 4/4)
signal('quarters', t => {
  const { phase } = step(t, 120, 4);
  return signal.sin(440).eval(t) * env.exp(phase, 5) * 0.3;
});

// Eighth notes - medium (8 notes per bar)
signal('eighths', t => {
  const { phase } = step(t, 120, 8);
  return signal.sin(440).eval(t) * env.exp(phase, 5) * 0.3;
});

// Sixteenth notes - dense (16 notes per bar)
signal('sixteenths', t => {
  const { phase } = step(t, 120, 16);
  return signal.sin(440).eval(t) * env.exp(phase, 5) * 0.3;
});
```

### Live Tempo Changes

```javascript
const { step, env } = require('@rolandnsharp/kanon');

// Change this value and save file for instant tempo change
const BPM = 60;  // Try 40, 80, 120, 160...

signal('adaptable', t => {
  const { phase } = step(t, BPM, 8);
  return signal.sin(330).eval(t) * env.exp(phase, 5) * 0.3;
});
```

### Using Beat Counter for Tempo-Synced Changes

```javascript
const { step, env } = require('@rolandnsharp/kanon');

signal('evolving', t => {
  const { beat, phase } = step(t, 100, 8);

  // Change pattern every 16 beats
  const section = Math.floor(beat / 16) % 2;
  const freq = section === 0 ? 220 : 330;

  return signal.sin(freq).eval(t) * env.exp(phase, 6) * 0.25;
});
```

---

## Effects

### Custom Distortion

```javascript
signal('distorted').sin(110)
  .fx(sample => Math.tanh(sample * 3))  // Soft clipping
  .gain(0.3);
```

### Wavefolder

```javascript
signal('folded').square(220)
  .fold(0.7)  // Fold threshold
  .gain(0.25);
```

### Hard Clipping

```javascript
signal('clipped').sin(110)
  .gain(4)      // Drive
  .clip(0.8)    // Clip threshold
  .gain(0.3);   // Output gain
```

### Time-Varying Effect

```javascript
signal('evolving').sin(440)
  .fx((sample, t) => {
    const depth = Math.sin(2 * Math.PI * 0.2 * t);  // Slow LFO
    return Math.tanh(sample * (1 + depth * 3));
  })
  .gain(0.2);
```

---

## Imperative Programming

### Generate Chord with Loop

```javascript
const chordDegrees = [0, 4, 7, 11];  // Major 7th
const scales = require('./signal/scales');
const { freq } = require('./signal/melody');

for (let i = 0; i < chordDegrees.length; i++) {
  const f = freq(200, scales.major, chordDegrees[i]);
  signal(`chord-${i}`).sin(f).gain(0.12);
}
```

### Build Harmonics

```javascript
const fundamental = 110;
const harmonics = [];

for (let n = 1; n <= 8; n++) {
  harmonics.push(
    signal.sin(fundamental * n).gain(1 / n)
  );
}

signal('rich').fn(signal.mix(...harmonics).gain(0.2));
```

### Array Methods

```javascript
const frequencies = [100, 150, 200, 250, 300];

const layers = frequencies
  .filter((f, i) => i % 2 === 0)  // Odd harmonics
  .map((f, i) => signal.sin(f).gain(0.05 / (i + 1)));

signal('texture').fn(signal.mix(...layers));
```

### Conditional Patterns

```javascript
const { step } = require('./signal/rhythm');

signal('evolving').fn(t => {
  const { beat, index, phase } = step(t, 120, 8);

  let pattern;
  if (Math.floor(beat / 8) % 2 === 0) {
    pattern = [0, 2, 4, 5];  // Major
  } else {
    pattern = [0, 3, 5, 7];  // Minor
  }

  const degree = pattern[index % pattern.length];
  const f = freq(330, scales.major, degree);

  return signal.sin(f).eval(t) * env.exp(phase, 6) * 0.15;
});
```

---

## JavaScript Patterns for Live Coding

Signal leverages JavaScript itself for live coding - no special syntax needed. Here are patterns that make performances dynamic:

### Array Indexing for Value Cycling

```javascript
// Cycle through frequencies every 5 seconds
const freq = [440, 550, 660][Math.floor(Date.now() / 5000) % 3];
signal('cycling').sin(freq).gain(0.2);
```

How it works:
- `[440, 550, 660]` - array of values
- `[Math.floor(Date.now() / 5000) % 3]` - index that cycles 0→1→2
- `Date.now()` - milliseconds since 1970
- `/ 5000` - divide into 5-second chunks
- `% 3` - modulo gives 0, 1, or 2

### Ternary Operators for Quick Switching

```javascript
// Switch between two sounds based on time
const freq = Date.now() % 10000 < 5000 ? 440 : 220;
signal('toggle').sin(freq).gain(0.2);

// Conditional effects
signal('dynamic').sin(330)
  .fx(sample => Date.now() % 8000 < 4000
    ? Math.tanh(sample * 3)  // Distorted
    : sample)                 // Clean
  .gain(0.2);
```

### Template Literals for Dynamic Names

```javascript
// Generate multiple variations
const variations = 3;
for (let i = 0; i < variations; i++) {
  const detune = i * 5;  // Detune by 5 Hz each
  signal(`layer-${i}`).sin(440 + detune).gain(0.1);
}
```

### Live Value Exploration

Instead of SuperCollider's Ctrl+Enter on individual lines, use comments:

```javascript
// Try different values by uncommenting:
const freq = 440;
// const freq = 550;
// const freq = 660;

signal('tone').sin(freq).gain(0.2);

// Or use an array and change the index:
const freqs = [440, 550, 660, 880];
signal('tone').sin(freqs[0]).gain(0.2);  // Change 0 to 1, 2, 3...
```

### Time-Based Patterns Without Hot Reload

```javascript
// Pattern evolves automatically based on clock time
signal('evolving', t => {
  const second = Math.floor(Date.now() / 1000);
  const freq = [200, 300, 400, 500][second % 4];
  return Math.sin(2 * Math.PI * freq * t) * 0.2;
});

// Different sound every 10 seconds
const waveforms = [
  t => Math.sin(2 * Math.PI * 440 * t),      // Sine
  t => Math.sign(Math.sin(2 * Math.PI * 440 * t)),  // Square
  t => (440 * t % 1) * 2 - 1                 // Saw
];
const wave = waveforms[Math.floor(Date.now() / 10000) % 3];
signal('morphing', wave).gain(0.2);
```

### Combining Patterns

```javascript
// Everything you know about JavaScript just works:
const scales = [
  [0, 2, 4, 5, 7, 9, 11],  // Major
  [0, 2, 3, 5, 7, 8, 10],  // Minor
  [0, 2, 4, 7, 9]          // Pentatonic
];

const scaleIndex = Math.floor(Date.now() / 8000) % scales.length;
const scale = scales[scaleIndex];
const degree = scale[Math.floor(Date.now() / 1000) % scale.length];

signal('smart').sin(440 * Math.pow(2, degree / 12)).gain(0.2);
```

### Bitwise Operators for Compact Rhythms

```javascript
const { step } = require('@rolandnsharp/kanon');

// Binary literal - each bit is a step (1 = hit, 0 = rest)
const pattern = 0b1001010010010100;  // 16-bit kick pattern

signal('kick', t => {
  const { index, phase } = step(t, 128, 16);

  // Extract bit at current index
  const isActive = (pattern >> (index % 16)) & 1;
  if (!isActive) return 0;

  const f = 50 + 80 * Math.exp(-15 * phase);
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-8 * phase) * 0.4;
});

// Easy to read and modify:
// 0b1001010010010100
//   ^   ^  ^  ^  ^    - kick hits
```

### Object Presets with Spread Operator

```javascript
// Define base preset
const baseSound = {
  freq: 440,
  gain: 0.2,
  detune: 0,
  filter: 1.0
};

// Create variations by overriding specific properties
const presets = {
  warm: { ...baseSound, freq: 220, gain: 0.3 },
  bright: { ...baseSound, freq: 880, gain: 0.15 },
  wide: { ...baseSound, detune: 10 },
  dark: { ...baseSound, filter: 0.5 }
};

// Switch between presets by changing one line:
const current = presets.warm;
// const current = presets.bright;
// const current = presets.wide;

signal('preset').sin(current.freq + current.detune).gain(current.gain);
```

### Seeded Random for Reproducible Patterns

```javascript
// Deterministic random - same seed always gives same result
const random = seed => Math.abs(Math.sin(seed) * 10000) % 1;

// Generate the same "random" pattern every time
const { step } = require('@rolandnsharp/kanon');

signal('generative', t => {
  const { index, phase } = step(t, 120, 8);

  // Each index gets a consistent random frequency
  const freq = 200 + random(index) * 400;

  return Math.sin(2 * Math.PI * freq * t) * Math.exp(-5 * phase) * 0.2;
});

// Change the seed to get a different pattern:
// const freq = 200 + random(index + 100) * 400;
```

### Closures for Stateful Patterns

```javascript
// Counter that persists across calls
const makeCounter = (max) => {
  let count = 0;
  return () => (count++) % max;
};

const stepIndex = makeCounter(4);
const freqs = [200, 300, 400, 500];

// Each file save advances the counter
signal('stepping').sin(freqs[stepIndex()]).gain(0.2);
```

### Destructuring with Defaults

```javascript
// Flexible synth function with sensible defaults
const synth = ({
  name = 'synth',
  freq = 440,
  gain = 0.2,
  detune = 0,
  wave = 'sin'
} = {}) => {
  const osc = wave === 'square'
    ? signal(name).square(freq + detune)
    : signal(name).sin(freq + detune);

  return osc.gain(gain);
};

// Use defaults
synth();

// Override just what you need
synth({ freq: 550 });
synth({ freq: 220, wave: 'square', gain: 0.3 });
```

### Bitwise Math Tricks

```javascript
const { step } = require('@rolandnsharp/kanon');

signal('fast', t => {
  const { index, phase } = step(t, 140, 16);

  // Fast integer conversion (instead of Math.floor)
  const whichNote = ~~(Math.random() * 8);

  // Fast modulo for powers of 2 (& is faster than %)
  const patternPos = index & 15;  // Same as index % 16
  const fourBeat = index & 3;     // Same as index % 4

  const freq = 200 * Math.pow(2, whichNote / 12);
  return Math.sin(2 * Math.PI * freq * t) * Math.exp(-6 * phase) * 0.2;
});
```

### Array.from() for Generative Sequences

```javascript
// Generate harmonic series in one line
const harmonics = Array.from({ length: 8 }, (_, i) =>
  signal.sin(110 * (i + 1)).gain(1 / (i + 1))
);
signal('rich', signal.mix(...harmonics).gain(0.2));

// Create Euclidean-style pattern
const euclidPattern = Array.from({ length: 16 }, (_, i) =>
  (i * 5) % 16 < 5 ? 1 : 0
);

// Generate chord from intervals
const intervals = [0, 4, 7, 11];  // Major 7th
const chord = Array.from(intervals, semitones =>
  signal.sin(440 * Math.pow(2, semitones / 12)).gain(0.12)
);
signal('chord', signal.mix(...chord));
```

### Generator Functions for Pattern Iteration

```javascript
// Infinite pattern generator
function* patternGen() {
  const notes = [0, 3, 7, 10, 7, 3];
  let i = 0;
  while (true) yield notes[(i++) % notes.length];
}

const melody = patternGen();

// Each save advances to next note
const degree = melody.next().value;
signal('melody').sin(440 * Math.pow(2, degree / 12)).gain(0.2);
```

### Recursive Functions for Fractal Patterns

```javascript
// Self-similar harmonic structure
const fractal = (depth, freq, gain) => {
  if (depth === 0) return signal.sin(freq).gain(gain);

  return signal.mix(
    signal.sin(freq).gain(gain),
    fractal(depth - 1, freq * 1.5, gain * 0.6),
    fractal(depth - 1, freq * 2, gain * 0.4)
  );
};

signal('fractal', fractal(3, 110, 0.15));

// Fibonacci-based recursion
const fib = (n) => n <= 1 ? n : fib(n - 1) + fib(n - 2);
const fibSeries = Array.from({ length: 8 }, (_, i) => fib(i + 1));
// [1, 1, 2, 3, 5, 8, 13, 21]
```

### Array Rotation for Pattern Shifting

```javascript
// Rotate array elements
const rotate = (arr, n) => [...arr.slice(n), ...arr.slice(0, n)];

const pattern = [1, 0, 1, 0, 1, 1, 0, 0];
const shifted = rotate(pattern, 2);  // [1, 0, 1, 1, 0, 0, 1, 0]

// Change rotation amount to shift pattern:
const rotation = 0;  // Try 1, 2, 3...
const currentPattern = rotate(pattern, rotation);
```

### Object.entries for Iterating Presets

```javascript
// Define multiple layers as an object
const layers = {
  bass: { freq: 110, gain: 0.3, wave: 'sin' },
  mid: { freq: 330, gain: 0.2, wave: 'square' },
  high: { freq: 880, gain: 0.15, wave: 'sin' }
};

// Generate all signals at once
Object.entries(layers).forEach(([name, { freq, gain, wave }]) => {
  const osc = wave === 'square'
    ? signal(name).square(freq)
    : signal(name).sin(freq);
  osc.gain(gain);
});
```

### IIFE for Scoped State

```javascript
// Immediately Invoked Function Expression with closure
const arp = (() => {
  let position = 0;
  const notes = [0, 4, 7, 12, 7, 4];

  return () => {
    const freq = 440 * Math.pow(2, notes[position] / 12);
    position = (position + 1) % notes.length;
    return freq;
  };
})();

// Each file save cycles to next note in sequence
signal('arp').sin(arp()).gain(0.2);
```

### Memoization for Expensive Calculations

```javascript
// Cache results to avoid recalculating
const memoize = fn => {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    return cache[key] || (cache[key] = fn(...args));
  };
};

const expensiveScale = memoize((root, degree) => {
  // Complex scale calculation only happens once per input
  return root * Math.pow(2, degree / 12);
});

const freq = expensiveScale(432, 7);
signal('cached').sin(freq).gain(0.2);
```

### Reduce for Complex Mixing

```javascript
// Build up complex signals with reduce
const freqs = [110, 165, 220, 330];

const mixed = freqs.reduce((acc, freq, i) => {
  const osc = signal.sin(freq).gain(0.15 / (i + 1));
  return acc ? acc.mix(osc) : osc;
}, null);

signal('reduced', mixed);
```

---

## Live Performance

```javascript
// Create layers
const layers = {
  bass: signal('bass').sin(110).gain(0.3),
  arp: signal('arp').sin(440).gain(0.2).stop(),
  pad: signal('pad').sin(220).gain(0.15).stop(),
  kick: signal('kick').sin(60).gain(0.4)
};

// Toggle during performance (edit and save file)
layers.arp.play();   // Bring in arp
layers.pad.play();   // Bring in pad
layers.bass.stop();  // Remove bass
```

---

## Run Examples

```bash
# Builder style basics
node builder-session.js

# Imperative programming
node imperative-session.js

# Live performance template (with hot reload)
node runner.js performance-session.js

# Live coding example
node runner.js example-session.js
```
