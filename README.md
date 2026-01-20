# Signal API - Pure Mathematical Audio Synthesis

Minimal, composable audio synthesis for live coding.

## Quick Start

```javascript
const signal = require('./signal');

// Create a sine wave - audio starts automatically!
signal('tone').sin(432).gain(0.2);

// Or create a composition with async/await
const { sleep } = signal;

const bass = signal('bass').sin(110).gain(0.3).stop();
const melody = signal('melody').sin(440).gain(0.2).stop();

async function play() {
  bass.play();
  await sleep(4000);
  melody.play();
}

play();
```

## Live Coding

```bash
node signal/runner.js signal/example-session.js
```

Edit `example-session.js` and save - changes apply immediately!

## Core API

### Signal Creation

```javascript
// Builder style (preferred)
signal('tone').sin(432).gain(0.2)

// Custom function - builder style
signal('custom').fn(t => Math.sin(2 * Math.PI * 432 * t) * 0.2)

// Custom function - direct style
signal('custom', t => Math.sin(2 * Math.PI * 432 * t) * 0.2)

// Unnamed signal (for modulators)
const lfo = signal.sin(5)

// Stereo signal
signal('stereo', {
  left: t => signal.sin(432).eval(t),
  right: t => signal.sin(435).eval(t)
})
```

### Helper Generators

```javascript
// Builder style (named signal)
signal('tone').sin(432)
signal('bass').square(110)
signal('pad').saw(220)
signal('lead').tri(880)
signal('noise').noise()

// Unnamed style (for modulators, internal use)
const lfo = signal.sin(5)
const carrier = signal.square(440)
```

### Chainable Methods

```javascript
// Chain methods after any signal generator
signal('tone').sin(432)
  .gain(0.5)                              // Amplitude
  .offset(0.1)                            // DC offset
  .clip(0.8)                              // Hard clipping
  .fold(0.7)                              // Wavefolder
  .modulate(lfo)                          // AM/RM
  .fx(sample => Math.tanh(sample * 3))   // Custom effect
  .fx((sample, t) => sample * Math.sin(t)) // Time-varying
  .play()                                 // Start playing (auto-starts by default)
  .stop()                                  // Stop playing
```

### Play/Stop Control

```javascript
// Signals auto-play by default
const bass = signal('bass').sin(110).gain(0.3)  // Playing immediately

// Create signal but don't play yet
const melody = signal('melody').sin(440).gain(0.2).stop()

// Play it later
setTimeout(() => melody.play(), 4000)

// Stop and restart
bass.stop()   // Mute
bass.play()   // Unmute

// Imperative composition
const layers = [
  signal('layer1').sin(100).gain(0.2).stop(),
  signal('layer2').sin(200).gain(0.15).stop(),
  signal('layer3').sin(300).gain(0.1).stop()
]

// Bring in layers over time
layers.forEach((layer, i) => {
  setTimeout(() => layer.play(), i * 2000)
})
```

### Bar-Based Composition (Bosca Ceoil Style)

Musical timing based on bars/measures instead of milliseconds:

```javascript
const { bars, onBar, getCurrentBar, loop } = signal;
const BPM = 120;

// Wait for N bars (async/await)
async function composition() {
  pad.play();
  await bars(4, BPM);    // Wait 4 bars

  bass.play();
  await bars(4, BPM);    // Wait 4 more bars

  melody.play();
  await bars(8, BPM);    // Wait 8 bars

  bass.stop();           // Break
}

composition();

// Trigger on specific bar (declarative)
onBar(0, BPM, () => pad.play());        // Bar 0: Intro
onBar(4, BPM, () => bass.play());       // Bar 4: Verse
onBar(8, BPM, () => kick.play());       // Bar 8: Build
onBar(12, BPM, () => melody.play());    // Bar 12: Chorus
onBar(20, BPM, () => kick.stop());      // Bar 20: Break

// Loop every N bars
loop(4, BPM, (currentBar) => {
  console.log(`Bar ${currentBar}: Loop trigger`);
  // Do something every 4 bars
});

// Get current bar
const bar = getCurrentBar(BPM);
console.log(`Currently on bar ${bar}`);
```

### Mixing

```javascript
const bass = signal.sin(110).gain(0.3)
const harmony = signal.sin(165).gain(0.15)

// Module-level
signal.mix(bass, harmony)

// Chainable
bass.mix(harmony)
```

### Stereo

```javascript
const left = signal.sin(432)
const right = signal.sin(435)

// Module-level
signal.stereo(left, right)

// Chainable
left.stereo(right)
```

## Helper Utilities

### Rhythm

```javascript
const { step, euclidean } = require('./signal/rhythm')

// Beat/phase info
const { beat, index, phase } = step(t, 120, 16)  // 120 BPM, 16th notes

// Euclidean rhythm
const pattern = euclidean(5, 16)  // 5 pulses in 16 steps
```

### Melody

```javascript
const { freq, mtof, ftom } = require('./signal/melody')
const scales = require('./signal/scales')

// Scale degree to frequency
freq(432, scales.major, 2)  // => 486 Hz (major third)

// MIDI conversions
mtof(69)  // => 440 Hz
ftom(440) // => 69
```

### Scales

```javascript
const scales = require('./signal/scales')

scales.major       // [0, 2, 4, 5, 7, 9, 11, 12]
scales.minor       // [0, 2, 3, 5, 7, 8, 10, 12]
scales.pentatonic  // [0, 2, 4, 7, 9, 12]
scales.blues       // [0, 3, 5, 6, 7, 10, 12]
// ... and more
```

### Envelopes

```javascript
const { env } = require('./signal/envelopes')

env.exp(phase, 5)                           // Exponential decay
env.ramp(phase, 0, 1)                       // Linear ramp
env.adsr(phase, duration, a, d, s, r)      // ADSR envelope
```

## Imperative Programming

Signal API works great with loops, arrays, and imperative logic:

### Generate Chord with Loop

```javascript
const chordDegrees = [0, 4, 7, 11];  // Major 7th

for (let i = 0; i < chordDegrees.length; i++) {
  const f = freq(200, scales.major, chordDegrees[i]);
  signal(`chord-${i}`, signal.sin(f).gain(0.1));
}
```

### Build Harmonics

```javascript
const fundamental = 110;
const harmonicSignals = [];

for (let n = 1; n <= 6; n++) {
  const harmonicFreq = fundamental * n;
  const amplitude = 1 / n;  // Decay
  harmonicSignals.push(signal.sin(harmonicFreq).gain(amplitude));
}

signal('rich-tone', signal.mix(...harmonicSignals).gain(0.15));
```

### Array Methods

```javascript
// Generate frequencies
const frequencies = [100, 150, 200, 250, 300];

// Filter to odd harmonics
const odd = frequencies.filter((f, i) => i % 2 === 0);

// Map to signals
const layers = odd.map((f, i) =>
  signal.sin(f).gain(0.05 / (i + 1))
);

signal('texture', signal.mix(...layers));
```

### Conditional Logic

```javascript
signal('evolving', t => {
  const { beat, index, phase } = step(t, 120, 8);

  // Change pattern every 8 beats
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

### Polyrhythms with Loop

```javascript
const rhythms = [
  { period: 3, freq: 200 },
  { period: 5, freq: 300 },
  { period: 7, freq: 400 }
];

for (const rhythm of rhythms) {
  signal(`poly-${rhythm.period}`, t => {
    const phase = (t / rhythm.period) % 1;
    if (phase > 0.05) return 0;

    return signal.sin(rhythm.freq).eval(t) * env.exp(phase * 20, 10) * 0.2;
  });
}
```

### Programmatic Pattern Generation

```javascript
function generatePattern(pulses, steps) {
  const pattern = [];
  for (let i = 0; i < steps; i++) {
    const bucket = Math.floor(i * pulses / steps);
    const next = Math.floor((i + 1) * pulses / steps);
    pattern.push(bucket !== next ? 1 : 0);
  }
  return pattern;
}

const kickPattern = generatePattern(5, 16);

signal('kick', t => {
  const { index, phase } = step(t, 128, 16);
  if (!kickPattern[index % kickPattern.length]) return 0;

  const f = 50 + 80 * env.exp(phase, 20);
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.4;
});
```

See `imperative-session.js` for more examples.

### Time-Based Composition with Async/Await

```javascript
const { sleep } = signal;  // Built-in sleep helper

// Create instruments (stopped)
const bass = signal('bass').sin(110).gain(0.3).stop()
const melody = signal('melody').sin(440).gain(0.2).stop()
const pad = signal('pad').sin(220).gain(0.15).stop()

// Clean async composition
async function composition() {
  console.log('Starting...');

  pad.play();
  await sleep(4000);

  console.log('Adding bass...');
  bass.play();
  await sleep(4000);

  console.log('Adding melody...');
  melody.play();
  await sleep(8000);

  console.log('Break...');
  bass.stop();
  await sleep(4000);

  console.log('Drop!');
  bass.play();
  await sleep(8000);

  console.log('Outro...');
  melody.stop();
  bass.stop();
  pad.stop();
}

composition();
```

### Async Patterns

```javascript
// Sequential - one after another
await sleep(1000);
bass.play();
await sleep(1000);
melody.play();

// Parallel - start together
bass.play();
melody.play();
pad.play();

// Staggered - overlapping
sleep(0).then(() => bass.play());
sleep(500).then(() => melody.play());
sleep(1000).then(() => pad.play());

// Loop - repeating
for (let i = 0; i < 4; i++) {
  bass.play();
  await sleep(500);
  bass.stop();
  await sleep(500);
}

// Conditional
if (section === 'intro') {
  pad.play();
} else if (section === 'drop') {
  bass.play();
  melody.play();
}
await sleep(4000);

// Array methods
const layers = [bass, melody, pad];
for (const layer of layers) {
  layer.play();
  await sleep(1000);
}

// Nested compositions
async function intro() {
  pad.play();
  await sleep(4000);
}

async function verse() {
  bass.play();
  await sleep(8000);
}

await intro();
await verse();
```

See `composition-async.js` and `async-patterns.js` for complete examples.

---

## Examples

### Tremolo

```javascript
const lfo = signal.sin(3).gain(0.5).offset(0.5)
signal('tremolo', t => {
  return signal.sin(432).modulate(lfo).gain(0.2).eval(t)
})
```

### Distorted Bass

```javascript
signal('bass', t => {
  return signal.sin(110)
    .fx(sample => Math.tanh(sample * 3))
    .gain(0.3)
    .eval(t)
})
```

### Melodic Sequencer

```javascript
const { step } = require('./signal/rhythm')
const { freq } = require('./signal/melody')
const { env } = require('./signal/envelopes')
const scales = require('./signal/scales')

signal('melody', t => {
  const { index, phase } = step(t, 120, 8)  // 8th notes
  const pattern = [0, 2, 4, 2, 5, 4, 2, 0]
  const degree = pattern[index % pattern.length]

  const f = freq(432, scales.major, degree)
  const envelope = env.exp(phase, 5)

  return signal.sin(f).eval(t) * envelope * 0.2
})
```

### Euclidean Kick

```javascript
const { step, euclidean } = require('./signal/rhythm')
const { env } = require('./signal/envelopes')

signal('kick', t => {
  const { index, phase } = step(t, 120, 16)
  const pattern = euclidean(5, 16)

  if (!pattern[index % pattern.length]) return 0

  const pitchEnv = 100 * env.exp(phase, 15)
  const f = 50 + pitchEnv

  return signal.sin(f).eval(t) * env.exp(phase, 8) * 0.4
})
```

## Signal Management

```javascript
signal.clear()                  // Remove all signals
signal.remove('name')           // Remove specific signal
signal.list()                   // List all signal names
signal.stopAudio()              // Stop audio output

// Time helpers
signal.sleep(ms)                // Promise-based sleep (milliseconds)
signal.bars(n, bpm)             // Promise-based wait (N bars)

// Bar-based composition
signal.onBar(barNum, bpm, fn)   // Trigger on specific bar
signal.getCurrentBar(bpm)       // Get current bar number
signal.loop(bars, bpm, fn)      // Repeat every N bars
signal.resetTimer()             // Reset bar counter
```

## Philosophy

- **Pure functions** - Signals are `Time → Sample` functions
- **Explicit math** - You write the DSP, helpers just reduce boilerplate
- **Composable** - Chain operations, mix signals
- **Live coding** - Hot reload, named signals
- **Minimal API** - Only what you can't easily write yourself

## Files

- `index.js` - Core Signal API
- `rhythm.js` - Beat and pattern helpers
- `melody.js` - Frequency and scale helpers
- `scales.js` - Scale definitions
- `envelopes.js` - Envelope shapes
- `runner.js` - Hot reload runner
- `builder-session.js` - Builder style examples (recommended)
- `bosca-async.js` - Bar-based composition with async/await (Bosca Ceoil style)
- `bosca-style.js` - Bar-based composition with onBar() (declarative)
- `composition-async.js` - Time-based async/await composition
- `async-patterns.js` - Async composition patterns
- `composition-session.js` - Time-based composition with setTimeout
- `performance-session.js` - Live performance layer control
- `example-session.js` - Live coding example
- `imperative-session.js` - Imperative programming examples
- `test-session.js` - API tests
- `test-builder.js` - Builder syntax tests
- `test-start-stop.js` - Start/stop functionality tests
