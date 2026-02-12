# Modulation Techniques (AM, FM, PM, RM)

> *"Modulation is the art of making one signal affect another."*

## Introduction

Modulation creates complex, evolving timbres by using one signal (the **modulator**) to control a parameter of another signal (the **carrier**).

---

## Amplitude Modulation (AM)

Multiply the carrier amplitude by the modulator.

### Tremolo (Slow AM)

```javascript
import { Kanon } from './src/arche/kanon/index.js';

const tremolo = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 5 * t);  // 5 Hz LFO

  // Scale modulator to 0.5 - 1.0 range
  const am = carrier * (0.5 + 0.5 * modulator);

  return am * 0.3;
};

Kanon.register('tremolo', tremolo);
```

**Result**: Rhythmic volume oscillation.

### Ring Modulation (Fast AM)

```javascript
const ringMod = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 220 * t);

  // Unscaled multiplication
  return carrier * modulator * 0.3;
};

Kanon.register('ring-mod', ringMod);
```

**Result**: Creates sum and difference frequencies:
- `f_carrier + f_mod = 440 + 220 = 660 Hz`
- `f_carrier - f_mod = 440 - 220 = 220 Hz`

### AM Sidebands

When `f_mod` is in audio range, AM creates sidebands:

```
f_carrier ± f_mod
```

```javascript
const amSidebands = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 100 * t);

  return carrier * (0.5 + 0.5 * modulator) * 0.3;
};

// Produces: 440 Hz (carrier), 340 Hz, 540 Hz (sidebands)
```

### Using the AM Helper

```javascript
const carrier = t => Math.sin(2 * Math.PI * 440 * t);
const modulator = t => Math.sin(2 * Math.PI * 5 * t);

Kanon.register('tremolo',
  Kanon.pipe(
    Kanon.am(modulator, carrier),
    Kanon.gain(0.3)
  )
);
```

---

## Frequency Modulation (FM)

Modulate the instantaneous frequency of the carrier.

### Simple Vibrato

For slow FM (vibrato), you can derive the phase analytically:

```javascript
const vibrato = t => {
  const carrierFreq = 440;
  const vibratoRate = 5;     // Hz
  const vibratoDepth = 10;   // Hz

  // Phase = integral of frequency
  // freq(t) = 440 + 10·sin(2π·5·t)
  // phase(t) = 440t - (10/(2π·5))·cos(2π·5·t)

  const phase = carrierFreq * t
    - (vibratoDepth / (2 * Math.PI * vibratoRate))
      * Math.cos(2 * Math.PI * vibratoRate * t);

  return Math.sin(2 * Math.PI * phase) * 0.3;
};

Kanon.register('vibrato', vibrato);
```

### Classic FM Synthesis

For audio-rate FM, phase modulation is easier:

```javascript
const fmSynth = t => {
  const carrierFreq = 440;
  const modFreq = 220;
  const modIndex = 5;  // Modulation depth

  const modulator = Math.sin(2 * Math.PI * modFreq * t) * modIndex;
  const carrier = Math.sin(2 * Math.PI * carrierFreq * t + modulator);

  return carrier * 0.3;
};

Kanon.register('fm-basic', fmSynth);
```

### FM Sidebands

FM creates sidebands at `f_carrier ± n·f_mod`:

```
f_carrier, f_carrier ± f_mod, f_carrier ± 2·f_mod, ...
```

The **modulation index** controls how many sidebands are audible:

```javascript
const fmSidebands = (carrierFreq, modFreq, modIndex) => t => {
  const modulator = Math.sin(2 * Math.PI * modFreq * t) * modIndex;
  const carrier = Math.sin(2 * Math.PI * carrierFreq * t + modulator);
  return carrier * 0.3;
};

// Example: C:M ratio of 1:1 (harmonic)
Kanon.register('fm-harmonic', fmSidebands(440, 440, 3));

// Example: C:M ratio of 1:1.5 (inharmonic)
Kanon.register('fm-bell', fmSidebands(440, 660, 5));
```

### DX7-Style FM (Multiple Operators)

```javascript
const dx7Algorithm = t => {
  // Algorithm 1: 6 operators in cascade

  // Op 6 (bottom of stack)
  const op6 = Math.sin(2 * Math.PI * 55 * t);

  // Op 5 modulates Op 6
  const op5 = Math.sin(2 * Math.PI * 110 * t + op6 * 2);

  // Op 4 modulates Op 5
  const op4 = Math.sin(2 * Math.PI * 220 * t + op5 * 1.5);

  // Op 3 modulates Op 4
  const op3 = Math.sin(2 * Math.PI * 440 * t + op4 * 1);

  // Op 2 modulates Op 3
  const op2 = Math.sin(2 * Math.PI * 880 * t + op3 * 0.5);

  // Op 1 is the carrier
  const op1 = Math.sin(2 * Math.PI * 1760 * t + op2 * 0.25);

  return op1 * 0.2;
};

Kanon.register('dx7-cascade', dx7Algorithm);
```

### Using the FM Helper

```javascript
const depth = 5;
const modulator = t => Math.sin(2 * Math.PI * 220 * t);
const carrier = t => Math.sin(2 * Math.PI * 440 * t);

Kanon.register('fm',
  Kanon.fm(depth, modulator, carrier)
);
```

---

## Phase Modulation (PM)

Similar to FM, but modulates phase directly instead of frequency:

```javascript
const phaseMod = t => {
  const carrierFreq = 440;
  const modFreq = 5;
  const modIndex = 2;

  const modulator = Math.sin(2 * Math.PI * modFreq * t) * modIndex;
  const carrier = Math.sin(2 * Math.PI * carrierFreq * t + modulator);

  return carrier * 0.3;
};

Kanon.register('phase-mod', phaseMod);
```

**Note**: PM and FM are mathematically equivalent, but PM is easier to implement in pure `f(t)` style.

---

## Ring Modulation (RM)

Unipolar multiplication creating sum and difference frequencies:

```javascript
const ring = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 220 * t);

  // Ring mod = simple multiplication
  return carrier * modulator * 0.4;
};

Kanon.register('ring', ring);
```

**Produces**:
- Sum: 440 + 220 = 660 Hz
- Difference: 440 - 220 = 220 Hz
- (Original frequencies disappear!)

### Inharmonic Ring Mod

Use non-integer ratios for metallic/bell timbres:

```javascript
const bellRing = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 666 * t);  // 1.514:1 ratio

  return carrier * modulator * 0.4;
};

Kanon.register('bell-ring', bellRing);
```

---

## Cross-Modulation

Two oscillators modulating each other:

```javascript
const crossMod = t => {
  const freq1 = 440;
  const freq2 = 550;
  const depth = 2;

  // Each modulates the other
  const osc1 = Math.sin(2 * Math.PI * freq1 * t);
  const osc2 = Math.sin(2 * Math.PI * freq2 * t);

  const out1 = Math.sin(2 * Math.PI * freq1 * t + osc2 * depth);
  const out2 = Math.sin(2 * Math.PI * freq2 * t + osc1 * depth);

  return (out1 + out2) * 0.2;
};

Kanon.register('cross-mod', crossMod);
```

**Result**: Complex, evolving timbres.

---

## Through-Zero FM

Frequency goes negative, creating unique sounds:

```javascript
const throughZeroFM = t => {
  const carrierFreq = 440;
  const modFreq = 5;
  const modDepth = 500;  // Can exceed carrier frequency!

  // Frequency can go negative
  const instantFreq = carrierFreq + Math.sin(2 * Math.PI * modFreq * t) * modDepth;

  // Integrate frequency to get phase
  // (Simplified - in practice needs memoization)
  const phase = carrierFreq * t;  // Approximation

  return Math.sin(2 * Math.PI * phase) * 0.3;
};

Kanon.register('through-zero', throughZeroFM);
```

---

## Waveshaping as Modulation

Use one signal to distort another:

```javascript
const waveshaper = t => {
  const carrier = Math.sin(2 * Math.PI * 440 * t);
  const modulator = Math.sin(2 * Math.PI * 3 * t);  // Slow LFO

  // Modulator controls distortion amount
  const drive = 1 + modulator * 5;  // 0-6 range

  // Waveshape
  const shaped = Math.tanh(carrier * drive);

  return shaped * 0.3;
};

Kanon.register('dynamic-distortion', waveshaper);
```

---

## Pulse Width Modulation (PWM)

Modulate the duty cycle of a square wave:

```javascript
const pwm = t => {
  const freq = 110;
  const modRate = 0.5;

  // Modulate pulse width (0.1 to 0.9)
  const pulseWidth = 0.5 + 0.4 * Math.sin(2 * Math.PI * modRate * t);

  // Square wave with variable pulse width
  const phase = (freq * t) % 1;
  const pulse = phase < pulseWidth ? 1 : -1;

  return pulse * 0.3;
};

Kanon.register('pwm', pwm);
```

**Result**: Evolving harmonic content.

---

## Vector Synthesis

Blend between multiple oscillators dynamically:

```javascript
const vectorSynth = t => {
  const osc1 = Math.sin(2 * Math.PI * 220 * t);
  const osc2 = Math.sin(2 * Math.PI * 440 * t);
  const osc3 = Math.sin(2 * Math.PI * 660 * t);
  const osc4 = Math.sin(2 * Math.PI * 880 * t);

  // LFOs control blend
  const lfo1 = (Math.sin(2 * Math.PI * 0.2 * t) + 1) / 2;  // 0-1
  const lfo2 = (Math.sin(2 * Math.PI * 0.3 * t) + 1) / 2;

  // Mix based on position in 2D "vector space"
  const mix = osc1 * (1 - lfo1) * (1 - lfo2) +
              osc2 * lfo1 * (1 - lfo2) +
              osc3 * (1 - lfo1) * lfo2 +
              osc4 * lfo1 * lfo2;

  return mix * 0.3;
};

Kanon.register('vector', vectorSynth);
```

---

## Granular Time-Stretching

Modulate grain playback rate:

```javascript
const granular = t => {
  const grainRate = 50;  // Grains per second
  const grainDur = 0.05;  // 50ms grains

  const grainIndex = Math.floor(t * grainRate);
  const grainPhase = (t * grainRate) % 1;

  // Modulate playback speed per grain
  const speedMod = 1 + Math.sin(grainIndex * 0.1) * 0.2;  // 0.8-1.2

  // Envelope
  const env = Math.sin(Math.PI * grainPhase);

  // Content (modulated playback)
  const content = Math.sin(2 * Math.PI * 440 * t * speedMod);

  return content * env * 0.3;
};

Kanon.register('granular-stretch', granular);
```

---

## LFO Shapes

Different LFO waveforms create different modulation characters:

```javascript
// Sine LFO (smooth)
const sineLFO = t => Math.sin(2 * Math.PI * freq * t);

// Triangle LFO (linear)
const triLFO = t => {
  const phase = (freq * t) % 1;
  return phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
};

// Square LFO (stepped)
const squareLFO = t => {
  const phase = (freq * t) % 1;
  return phase < 0.5 ? 1 : -1;
};

// Sawtooth LFO (ramp)
const sawLFO = t => {
  const phase = (freq * t) % 1;
  return phase * 2 - 1;
};

// Random LFO (sample & hold)
const randomLFO = t => {
  const sampleRate = 10;  // Samples per second
  const index = Math.floor(t * sampleRate);
  // Deterministic random based on index
  return (Math.sin(index * 1234.5678) * 2 - 1);
};
```

---

## Modulation Matrix

Create complex routings:

```javascript
const modulationMatrix = t => {
  // Sources
  const lfo1 = Math.sin(2 * Math.PI * 0.5 * t);
  const lfo2 = Math.sin(2 * Math.PI * 0.3 * t);
  const env = Math.exp(-t * 2);

  // Destinations
  const carrierFreq = 440 + lfo1 * 50 + env * 200;  // Pitch
  const modIndex = 2 + lfo2 * 3;                     // FM depth
  const amplitude = 0.5 + lfo1 * 0.3;                // Volume

  // FM synthesis
  const modulator = Math.sin(2 * Math.PI * 220 * t) * modIndex;
  const carrier = Math.sin(2 * Math.PI * carrierFreq * t + modulator);

  return carrier * amplitude * 0.3;
};

Kanon.register('mod-matrix', modulationMatrix);
```

---

## Vortex Morph (Advanced Phase Modulation)

**An organic, growling cello-like tone that continuously evolves.**

The Vortex Morph uses phase modulation with a slow-breathing LFO to create complex, non-linear harmonics that evolve over time. This technique produces organic, rich timbres reminiscent of bowed strings or evolving pads.

### Core Concept

Two oscillators in a modulator-carrier relationship, where:
1. The **modulator** oscillates at a non-harmonic ratio to the carrier
2. A slow **morphing LFO** controls the modulation depth
3. The **phase modulation depth** varies continuously, creating evolving harmonics

### Basic Implementation (Rhythmos Style)

```javascript
register('vortex-morph', s => {
  // --- Parameters (change these live!) ---
  const baseFreq = 122.0;      // Deep G2 note
  const modRatio = 1.618;      // Golden Ratio (non-harmonic shimmer)
  const morphSpeed = 0.2;      // How fast the "vortex" breathes (Hz)
  const intensity = 4.0;       // Modulation depth (try 50.0 for chaos!)

  // Calculate phase increments
  const p1Inc = baseFreq / s.sr;
  const p2Inc = (baseFreq * modRatio) / s.sr;
  const tInc = morphSpeed / s.sr;

  // Accumulate three phases
  s.state[0] = (s.state[0] || 0) + p1Inc;     // Carrier phase
  s.state[1] = (s.state[1] || 0) + p2Inc;     // Modulator phase
  s.state[2] = (s.state[2] || 0) + tInc;      // Global LFO for morphing

  // Wrap phases
  s.state[0] %= 1.0;
  s.state[1] %= 1.0;
  s.state[2] %= 1.0;

  // The Vortex: Use the second osc to warp the time-space of the first osc
  const depthLFO = Math.sin(s.state[2] * 2 * Math.PI) * intensity;
  const modulator = Math.sin(s.state[1] * 2 * Math.PI) * depthLFO;
  const sample = Math.sin(s.state[0] * 2 * Math.PI + modulator);

  return sample * 0.5;
});
```

### Parameter Guide

**baseFreq** (22-500 Hz)
- Lower values: Deep, rumbling drones
- Higher values: Bright, shimmer pads

**modRatio** (1.0-3.0)
- 1.0: Harmonic (boring)
- 1.618 (φ): Golden ratio - organic, natural shimmer
- 2.0-3.0: Inharmonic, bell-like tones

**morphSpeed** (0.05-2.0 Hz)
- Slow (0.05-0.2): Glacial evolution, meditation drones
- Medium (0.5-1.0): Breathing, alive quality
- Fast (1.5-2.0): Tremolo-like pulsing

**intensity** (1.0-50.0)
- 1-5: Subtle shimmer, musical
- 10-20: Rich evolving harmonics
- 30-50: Chaotic, aggressive, noisy

### Variations

**Three-Voice Vortex**

```javascript
// Mix three vortexes at different ratios
const vortex = (baseFreq, modRatio, morphSpeed, intensity) => s => {
  const p1Inc = baseFreq / s.sr;
  const p2Inc = (baseFreq * modRatio) / s.sr;
  const tInc = morphSpeed / s.sr;

  s.state[0] = (s.state[0] || 0) + p1Inc;
  s.state[1] = (s.state[1] || 0) + p2Inc;
  s.state[2] = (s.state[2] || 0) + tInc;

  s.state[0] %= 1.0;
  s.state[1] %= 1.0;
  s.state[2] %= 1.0;

  const depthLFO = Math.sin(s.state[2] * 2 * Math.PI) * intensity;
  const modulator = Math.sin(s.state[1] * 2 * Math.PI) * depthLFO;
  return Math.sin(s.state[0] * 2 * Math.PI + modulator);
};

register('triple-vortex',
  mix(
    vortex(122, 1.618, 0.2, 4.0),   // Low
    vortex(359, 1.414, 0.1, 22.0),  // Mid (√2 ratio)
    vortex(22, 2.1, 0.1, 44)        // Sub-bass
  )
);
```

**Filtered Vortex**

```javascript
register('smooth-vortex',
  pipe(
    vortexMorph,
    lowpass(1200),
    tremolo(0.5, 0.3),
    gain(0.4)
  )
);
```

**Dual Vortex (Panned Mix)**

```javascript
// Two vortexes panned left/right and mixed
register('dual-vortex',
  mix(
    pipe(vortex(122, 1.618, 0.2, 4.0), pan(-0.7)),
    pipe(vortex(122, 1.618, 0.21, 4.0), pan(0.7))  // Slightly detuned
  )
);
```

### Musical Applications

**Cello-Like Drone**
```javascript
// baseFreq: 65-130 Hz (C2-C3)
// modRatio: 1.5-1.7 (cello-like)
// morphSpeed: 0.1-0.3 (slow bow)
// intensity: 3-8 (organic)
```

**Evolving Pad**
```javascript
// baseFreq: 220-440 Hz (A3-A4)
// modRatio: 1.618 (golden ratio)
// morphSpeed: 0.2-0.5 (breathing)
// intensity: 10-20 (rich harmonics)
```

**Aggressive Bass**
```javascript
// baseFreq: 40-80 Hz
// modRatio: 2.0-3.0 (harsh)
// morphSpeed: 1.0-2.0 (fast)
// intensity: 30-50 (chaotic)
```

### Why It Works

The Vortex Morph creates its characteristic sound through:

1. **Non-harmonic ratios** (like φ = 1.618) prevent periodicity, creating evolving spectra
2. **Time-varying modulation depth** makes the timbre constantly shift
3. **Phase modulation** (rather than frequency modulation) creates cleaner, more musical harmonics
4. **Low fundamental + high mod ratio** spreads energy across a wide frequency range

The result is a sound that feels **alive** - it breathes, evolves, and never repeats exactly.

---

## Further Reading

- [Additive Synthesis](additive-synthesis.md) - Building blocks
- [Delay & Feedback](delay-and-feedback.md) - Time-based effects
- [Steinmetz Conjugate Synthesis](../esoteric/steinmetz-conjugate-synthesis.md) - Complex modulation
- [Tesla Longitudinal Waves](../esoteric/tesla-longitudinal-waves.md) - Wave physics

---

**Next**: [Envelopes](envelopes.md) | [Filters](filters.md)
