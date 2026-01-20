# Signal API - Pure Mathematical Audio Synthesis

Minimal, composable audio synthesis for live coding.

## Quick Start

```javascript
const signal = require('@rolandnsharp/signal');

// Create a sine wave - audio starts automatically!
signal('tone', t => Math.sin(2 * Math.PI * 432 * t) * 0.2);
```

## Installation

```bash
npm install -g @rolandnsharp/signal
```

## Live Coding

```bash
signal sessions/example-session.js
```

Edit `example-session.js` and save - changes apply immediately!

## Core API

### Signal Creation

The first parameter is just an **arbitrary name** for tracking the signal (used for hot reload).
It doesn't determine the sound - that's defined by what you chain after it.

```javascript
// Builder style (preferred)
// 'tone' is just a name - the actual sound is sin(432)
signal('tone').sin(432).gain(0.2)

// You could call it anything:
signal('mySound').sin(432).gain(0.2)
signal('x').sin(432).gain(0.2)

// Custom function - builder style
signal('custom').fn(t => Math.sin(2 * Math.PI * 432 * t) * 0.2)

// Custom function - direct style
signal('custom', t => Math.sin(2 * Math.PI * 432 * t) * 0.2)

// Manual sine wave with amplitude modulation (no chainable methods)
signal('tremolo', t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t)    // 440 Hz carrier
  const lfo = Math.sin(2 * Math.PI * 5 * t)          // 5 Hz LFO
  const modulator = 0.5 + 0.5 * lfo                  // Scale LFO to 0-1
  return carrier * modulator * 0.2                    // Apply modulation
})

// Stereo signal
signal('stereo', {
  left: t => signal.sin(432).eval(t),
  right: t => signal.sin(435).eval(t)
})
```

### Helper Generators

```javascript
// Builder style (named signal)
// Note: 'bass', 'pad', etc. are just arbitrary names, not presets!
signal('tone').sin(432)       // Name: 'tone', Sound: sine wave at 432 Hz
signal('bass').square(110)    // Name: 'bass', Sound: square wave at 110 Hz
signal('pad').saw(220)        // Name: 'pad', Sound: saw wave at 220 Hz
signal('lead').tri(880)       // Name: 'lead', Sound: triangle wave at 880 Hz
signal('noise').noise()       // Name: 'noise', Sound: white noise

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
const signal = require('@rolandnsharp/signal');
const { step, euclidean } = signal;

// Beat/phase info
const { beat, index, phase } = step(t, 120, 16)  // 120 BPM, 16th notes

// Euclidean rhythm
const pattern = euclidean(5, 16)  // 5 pulses in 16 steps
```

### Melody

```javascript
const signal = require('@rolandnsharp/signal');
const { freq, mtof, ftom, scales } = signal;

// Scale degree to frequency
freq(432, scales.major, 2)  // => 486 Hz (major third)

// MIDI conversions
mtof(69)  // => 440 Hz
ftom(440) // => 69
```

### Scales

```javascript
const signal = require('@rolandnsharp/signal');
const { scales } = signal;

scales.major       // [0, 2, 4, 5, 7, 9, 11, 12]
scales.minor       // [0, 2, 3, 5, 7, 8, 10, 12]
scales.pentatonic  // [0, 2, 4, 7, 9, 12]
scales.blues       // [0, 3, 5, 6, 7, 10, 12]
// ... and more
```

### Envelopes

```javascript
const signal = require('@rolandnsharp/signal');
const { env } = signal;

env.exp(phase, 5)                           // Exponential decay
env.ramp(phase, 0, 1)                       // Linear ramp
env.adsr(phase, duration, a, d, s, r)      // ADSR envelope
```

## Imperative Programming

Signal API works great with loops, arrays, and imperative logic:

### Generate Chord with Loop

```javascript
const signal = require('@rolandnsharp/signal');
const { freq, scales } = signal;

const chordDegrees = [0, 4, 7, 11];  // Major 7th

for (let i = 0; i < chordDegrees.length; i++) {
  const f = freq(200, scales.major, chordDegrees[i]);
  signal(`chord-${i}`).sin(f).gain(0.1);
}
```

### Create Multiple Layers with a Loop

```javascript
// Create 8 detuned oscillators for a rich pad sound
const baseFreq = 220;
const detuneAmount = 5;  // Hz

for (let i = 0; i < 8; i++) {
  const detune = (Math.random() * 2 - 1) * detuneAmount;  // Random detune
  const freq = baseFreq + detune;
  signal(`pad-${i}`).sin(freq).gain(0.02);
}
```

### Generate Drum Pattern with Nested Loops

```javascript
const signal = require('@rolandnsharp/signal');
const { step, env } = signal;

// Create multiple kick drums with different patterns
const patterns = [
  [1, 0, 0, 0, 1, 0, 0, 0],  // Four on the floor
  [1, 0, 0, 1, 0, 0, 1, 0],  // Syncopated
  [1, 0, 1, 0, 1, 0, 1, 0],  // Eighth notes
];

for (let i = 0; i < patterns.length; i++) {
  const pattern = patterns[i];

  signal(`kick-${i}`, t => {
    const { index, phase } = step(t, 120, 8);

    if (!pattern[index % pattern.length]) return 0;
    if (phase > 0.3) return 0;

    const pitchEnv = 50 + 80 * Math.exp(-15 * phase);
    return Math.sin(2 * Math.PI * pitchEnv * t) * Math.exp(-8 * phase) * 0.3;
  }).stop();  // Start stopped, enable manually
}

// Enable just one pattern
// patterns[0] is active by default when you call .play()
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

## Examples

### Tremolo

```javascript
const lfo = signal.sin(3).gain(0.5).offset(0.5)
signal('tremolo').sin(432).modulate(lfo).gain(0.2)
```

### Distorted Bass

```javascript
signal('bass').sin(110)
  .fx(sample => Math.tanh(sample * 3))
  .gain(0.3)
```

### Melodic Sequencer

```javascript
const signal = require('@rolandnsharp/signal');
const { step, freq, env, scales } = signal;

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
const signal = require('@rolandnsharp/signal');
const { step, euclidean, env } = signal;

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
```

## What Makes Signal Different?

Most JavaScript live coding libraries (like Tidal Cycles, Gibber, Strudel) and tools like Sonic Pi act as frontends that send commands to SuperCollider or other synthesis engines. You're essentially scripting a synthesizer, not programming sound itself.

**Signal is different**: you're writing the mathematical wave function directly. When you write:

```javascript
signal('tone', t => Math.sin(2 * Math.PI * 432 * t) * 0.2)
```

You're not calling a synthesizer - you're computing the actual sample values that become the sound wave. You're learning and interacting with the wave function itself, understanding exactly how sound works at the sample level.

This makes Signal ideal for:
- Learning digital signal processing fundamentals
- Understanding how synthesis actually works
- Direct mathematical control over every sample
- Building your own synthesis techniques from first principles

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
- `example-session.js` - Live coding example
- `performance-session.js` - Live performance layer control
- `imperative-session.js` - Imperative programming examples
- `test-session.js` - API tests
- `test-builder.js` - Builder syntax tests
- `test-start-stop.js` - Start/stop functionality tests
