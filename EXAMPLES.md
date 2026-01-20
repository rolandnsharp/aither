# Signal API Examples

Complete guide to the Signal API with examples.

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

## Bar-Based Composition (Recommended)

### Async/Await Style

```javascript
const { bars } = signal;
const BPM = 120;

// Create instruments (stopped)
const pad = signal('pad').sin(220).gain(0.15).stop();
const bass = signal('bass').sin(110).gain(0.3).stop();
const melody = signal('melody').sin(440).gain(0.2).stop();

async function song() {
  // Intro - 4 bars
  pad.play();
  await bars(4, BPM);

  // Verse - 8 bars
  bass.play();
  await bars(8, BPM);

  // Chorus - 8 bars
  melody.play();
  await bars(8, BPM);

  // Break - 4 bars
  bass.stop();
  melody.stop();
  await bars(4, BPM);

  // Outro
  pad.stop();
}

song();
```

### Declarative Style

```javascript
const { onBar } = signal;
const BPM = 120;

const pad = signal('pad').sin(220).gain(0.15).stop();
const bass = signal('bass').sin(110).gain(0.3).stop();
const melody = signal('melody').sin(440).gain(0.2).stop();

// Define song structure
onBar(0, BPM, () => pad.play());         // Intro
onBar(4, BPM, () => bass.play());        // Verse
onBar(12, BPM, () => melody.play());     // Chorus
onBar(20, BPM, () => {                   // Break
  bass.stop();
  melody.stop();
});
onBar(24, BPM, () => pad.stop());        // End
```

### Looping Patterns

```javascript
const { loop } = signal;
const BPM = 140;

const kick = signal('kick').sin(60).gain(0.4);

// Trigger every 4 bars
loop(4, BPM, (currentBar) => {
  console.log(`Loop at bar ${currentBar}`);
  // Change pattern every loop
});
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

## Complete Song Example

```javascript
const signal = require('./signal');
const { step } = require('./signal/rhythm');
const { freq } = require('./signal/melody');
const { env } = require('./signal/envelopes');
const scales = require('./signal/scales');
const { bars } = signal;

const BPM = 120;

// Instruments
const bass = signal('bass').fn(t => {
  const { index, phase } = step(t, BPM, 2);
  const pattern = [0, 0, 5, 3];
  const f = freq(110, scales.minor, pattern[index % 4]);
  return signal.sin(f).eval(t) * env.exp(phase, 3) * 0.3;
}).stop();

const melody = signal('melody').fn(t => {
  const { index, phase } = step(t, BPM, 8);
  const pattern = [0, 3, 5, 3, 7, 5, 3, 0];
  const f = freq(440, scales.minor, pattern[index % 8]);
  return signal.sin(f).eval(t) * env.exp(phase, 5) * 0.15;
}).stop();

const kick = signal('kick').fn(t => {
  const { beat, phase } = step(t, BPM, 4);
  if (beat % 4 !== 0 || phase > 0.25) return 0;
  const f = 50 + 80 * env.exp(phase, 20);
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.35;
}).stop();

// Song structure
async function song() {
  // Intro
  bass.play();
  await bars(8, BPM);

  // Verse
  kick.play();
  await bars(8, BPM);

  // Chorus
  melody.play();
  await bars(16, BPM);

  // Break
  kick.stop();
  melody.stop();
  await bars(4, BPM);

  // Outro
  bass.stop();
}

song();
```

---

## Run Examples

```bash
# Builder style basics
node signal/builder-session.js

# Bar-based composition (async)
node signal/bosca-async.js

# Bar-based composition (declarative)
node signal/bosca-style.js

# Imperative programming
node signal/imperative-session.js

# Async patterns
node signal/async-patterns.js

# Live performance template
node signal/runner.js signal/performance-session.js
```
