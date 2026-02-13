# FFT and Spectral Processing in Aither

> *Can we do FFT with functional composition? Yes. Should we? Let's explore.*

## What is FFT?

**FFT (Fast Fourier Transform)** is an algorithm that converts audio from **time domain** to **frequency domain** and back.

### Time Domain vs Frequency Domain

```
TIME DOMAIN (what we normally work with):
Amplitude over time
     │     ╱╲      ╱╲      ╱╲
  1  │    ╱  ╲    ╱  ╲    ╱  ╲
     │   ╱    ╲  ╱    ╲  ╱    ╲
  0  │──────────────────────────── Time
     │ ╱      ╲╱      ╲╱      ╲
 -1  │╱

FREQUENCY DOMAIN (after FFT):
Amplitude of each frequency
     │
  1  │ █
     │ █
  0.5│ █  ▄  ▂
     │ █  █  █  ▁
  0  │─────────────────── Frequency
     0  440 880 1320...
```

**The fundamental theorem:** Any complex waveform is a sum of simple sine waves.

```javascript
// These are equivalent:
const complex = s => /* complex waveform */;

// Equals:
const complex = s =>
  Math.sin(2*Math.PI*440*s.t) * 1.0 +      // Fundamental
  Math.sin(2*Math.PI*880*s.t) * 0.5 +      // 2nd harmonic
  Math.sin(2*Math.PI*1320*s.t) * 0.25 +    // 3rd harmonic
  Math.sin(2*Math.PI*1760*s.t) * 0.125;    // 4th harmonic
```

FFT tells you: **"This sound contains these frequencies at these amplitudes."**

---

## Why FFT in Synthesis?

### 1. Spectral Effects

**Freeze Effect:**
```javascript
// Capture a moment of sound and hold it forever
FFT(input) → freeze spectrum → IFFT(frozen) → sustained sound
```

**Spectral Filtering:**
```javascript
// Remove specific frequency ranges
FFT(input) → zero out bins 10-20 → IFFT → filtered output
```

**Phase Vocoder:**
```javascript
// Time-stretch or pitch-shift independently
FFT → manipulate phase/magnitude → IFFT → transformed sound
```

**Spectral Morphing:**
```javascript
// Blend the spectrums of two sounds
FFT(sound1) × 0.7 + FFT(sound2) × 0.3 → IFFT → morphed sound
```

### 2. Analysis (as Control Signals)

```javascript
// What's the pitch?
FFT → find peak bin → frequency → use as control signal

// How bright is the sound?
FFT → measure energy above 2kHz → spectral centroid

// Spectral envelope
FFT → bin magnitudes → envelope follower per band
```

### 3. Additive Resynthesis

```javascript
// Analyze a signal's harmonics
FFT(input) → extract peaks

// Resynthesize with independent control over each harmonic
for each harmonic:
  oscillator(freq) * amplitude
```

---

## Traditional Approach: Block-Based Processing

Most systems (including SuperCollider) process FFT in **blocks**:

```javascript
// Collect samples → Process block → Output block
const blockSize = 1024;

// Collect 1024 samples
const inputBlock = new Float32Array(blockSize);
for (let i = 0; i < blockSize; i++) {
  inputBlock[i] = signal(s);
}

// FFT
const spectrum = fft(inputBlock);

// Process in frequency domain
for (let bin = 0; bin < spectrum.length; bin++) {
  spectrum[bin] *= someProcessing;
}

// IFFT back
const outputBlock = ifft(spectrum);

// Output 1024 samples
return outputBlock;
```

**This requires changing the architecture** from sample-by-sample to block-based processing.

**SuperCollider example:**
```supercollider
// Block-based FFT processing
chain = FFT(buffer, input);
chain = PV_MagFreeze(chain, freeze);
output = IFFT(chain);
```

---

## The Aither Way: Functional Composition

**Key insight:** FFT can be **just another signal transformation**, like `lowpass()` or `delay()`.

We use:
- **Sliding window buffers** (via `s.state`)
- **Continuous processing** (not waiting for blocks)
- **Pure functional interface** (composable with `pipe()`, `mix()`, etc.)

### Example 1: Spectral Freeze

```javascript
const spectralFreeze = (signal, freeze) => {
  return expand((s, input, mem, base, chan, freezeSignal) => {
    const WINDOW_SIZE = 1024;
    const BUFFER_START = 0;
    const WRITE_POS = WINDOW_SIZE;
    const FROZEN_SPECTRUM = WINDOW_SIZE + 1;
    const PHASE_ACCUM = FROZEN_SPECTRUM + WINDOW_SIZE * 2;

    // Sliding window buffer (continuous)
    const writePos = mem[base + WRITE_POS] || 0;
    mem[base + BUFFER_START + writePos] = input;
    mem[base + WRITE_POS] = (writePos + 1) % WINDOW_SIZE;

    const shouldFreeze = freezeSignal(s) > 0.5;

    // Capture spectrum when freeze triggered
    if (shouldFreeze && mem[base + FROZEN_SPECTRUM] === 0) {
      const buffer = mem.subarray(base + BUFFER_START, base + BUFFER_START + WINDOW_SIZE);
      const spectrum = fft(buffer); // Returns {magnitudes, phases}

      // Store frozen spectrum
      for (let i = 0; i < spectrum.bins; i++) {
        mem[base + FROZEN_SPECTRUM + i] = spectrum.magnitudes[i];
        mem[base + FROZEN_SPECTRUM + WINDOW_SIZE + i] = spectrum.phases[i];
      }
      mem[base + FROZEN_SPECTRUM] = 1; // Mark as frozen
    } else if (!shouldFreeze) {
      mem[base + FROZEN_SPECTRUM] = 0; // Unfreeze
    }

    // Synthesize from frozen spectrum (additive synthesis)
    if (mem[base + FROZEN_SPECTRUM] === 1) {
      let output = 0;
      for (let bin = 0; bin < WINDOW_SIZE / 2; bin++) {
        const mag = mem[base + FROZEN_SPECTRUM + bin];
        const phase = mem[base + FROZEN_SPECTRUM + WINDOW_SIZE + bin];
        const freq = bin * s.sr / WINDOW_SIZE;

        // Phase accumulator for this bin
        mem[base + PHASE_ACCUM + bin] = (mem[base + PHASE_ACCUM + bin] || 0) + (2 * Math.PI * freq / s.sr);

        output += Math.sin(mem[base + PHASE_ACCUM + bin] + phase) * mag;
      }
      return output / (WINDOW_SIZE / 2);
    }

    return input; // Pass through when not frozen
  }, 'spectralFreeze', (signal, freeze) => {
    return 1024 + 1 + 1024*2 + 512; // buffer + writePos + spectrum + phases
  });
};

// Usage - pure functional composition!
play('frozen', pipe(
  s => Math.sin(2 * Math.PI * 440 * s.t) * 0.3,
  spectralFreeze(_, s => s.t % 4 < 2 ? 1 : 0), // Freeze every 2 seconds
  gain(_, 0.5)
));
```

### Example 2: Pitch Detection as Control Signal

```javascript
// FFT pitch detection returns a value, just like any control signal
const pitchDetect = (signal, updateRate = 512) => {
  return s => {
    const WINDOW_SIZE = 2048;
    const BUFFER_START = 0;
    const WRITE_POS = WINDOW_SIZE;
    const DETECTED_PITCH = WINDOW_SIZE + 1;

    // Fill sliding window
    const input = signal(s);
    const writePos = s.state[WRITE_POS] || 0;
    s.state[BUFFER_START + writePos] = input;
    s.state[WRITE_POS] = (writePos + 1) % WINDOW_SIZE;

    // Update pitch estimate every N samples
    if (s.idx % updateRate === 0) {
      const buffer = s.state.subarray(BUFFER_START, BUFFER_START + WINDOW_SIZE);
      const spectrum = fft(buffer);
      const peakBin = findPeakBin(spectrum.magnitudes);
      const pitch = peakBin * s.sr / WINDOW_SIZE;
      s.state[DETECTED_PITCH] = pitch;
    }

    return s.state[DETECTED_PITCH] || 0; // Return detected pitch
  };
};

// Use it like any control signal!
const inputPitch = pitchDetect(microphoneInput);

play('harmonizer', s => {
  const detected = inputPitch(s);
  const harmony = detected * 1.5; // Perfect fifth
  return Math.sin(2 * Math.PI * harmony * s.t) * 0.3;
});
```

### Example 3: Spectral Band Reject

```javascript
const spectralBandReject = (signal, lowFreq, highFreq) => {
  return expand((s, input, mem, base, chan, low, high) => {
    const WINDOW_SIZE = 1024;
    const HOP_SIZE = 256; // Overlap for smooth output
    const BUFFER = base;
    const OUTPUT_BUFFER = base + WINDOW_SIZE;

    // Sliding window
    mem[base + WINDOW_SIZE * 2] = (mem[base + WINDOW_SIZE * 2] || 0) + 1;
    const writePos = mem[base + WINDOW_SIZE * 2] % WINDOW_SIZE;
    mem[BUFFER + writePos] = input;

    // Process every HOP_SIZE samples
    if ((mem[base + WINDOW_SIZE * 2] % HOP_SIZE) === 0) {
      const buffer = mem.subarray(BUFFER, BUFFER + WINDOW_SIZE);
      const spectrum = fft(buffer);

      // Zero out frequency range
      const lowBin = Math.floor(low(s) * WINDOW_SIZE / s.sr);
      const highBin = Math.floor(high(s) * WINDOW_SIZE / s.sr);

      for (let i = lowBin; i < highBin; i++) {
        spectrum.magnitudes[i] = 0;
      }

      // IFFT back to time domain
      const processed = ifft(spectrum);

      // Overlap-add to output buffer
      for (let i = 0; i < WINDOW_SIZE; i++) {
        mem[OUTPUT_BUFFER + i] += processed[i];
      }
    }

    // Read from output buffer
    const readPos = (mem[base + WINDOW_SIZE * 2] - HOP_SIZE) % WINDOW_SIZE;
    const output = mem[OUTPUT_BUFFER + readPos];
    mem[OUTPUT_BUFFER + readPos] = 0; // Clear after reading

    return output;
  }, 'spectralBandReject', 1024 * 3);
};

// Usage
play('notched', pipe(
  s => Math.sin(2 * Math.PI * 440 * s.t) * 0.3,
  spectralBandReject(_, 800, 1200), // Remove 800-1200 Hz
  gain(_, 0.8)
));
```

### Example 4: Spectral Morphing

```javascript
const spectralMorph = (signal1, signal2, morph) => {
  return expand((s, input1, input2, mem, base, chan, morphAmount) => {
    const WINDOW_SIZE = 1024;
    const BUFFER1 = base;
    const BUFFER2 = base + WINDOW_SIZE;
    const SPECTRUM1 = base + WINDOW_SIZE * 2;
    const SPECTRUM2 = base + WINDOW_SIZE * 3;
    const PHASE_ACCUM = base + WINDOW_SIZE * 4;

    // Fill two sliding window buffers
    const writePos = mem[base + WINDOW_SIZE * 5] || 0;
    mem[BUFFER1 + writePos] = input1;
    mem[BUFFER2 + writePos] = input2;
    mem[base + WINDOW_SIZE * 5] = (writePos + 1) % WINDOW_SIZE;

    // Analyze both signals
    if (writePos % 256 === 0) { // Update every 256 samples
      const spectrum1 = fft(mem.subarray(BUFFER1, BUFFER1 + WINDOW_SIZE));
      const spectrum2 = fft(mem.subarray(BUFFER2, BUFFER2 + WINDOW_SIZE));

      // Store spectrums
      for (let i = 0; i < WINDOW_SIZE / 2; i++) {
        mem[SPECTRUM1 + i] = spectrum1.magnitudes[i];
        mem[SPECTRUM2 + i] = spectrum2.magnitudes[i];
      }
    }

    // Synthesize morphed output
    const m = morphAmount(s);
    let output = 0;

    for (let bin = 0; bin < WINDOW_SIZE / 2; bin++) {
      const mag1 = mem[SPECTRUM1 + bin] || 0;
      const mag2 = mem[SPECTRUM2 + bin] || 0;
      const morphedMag = mag1 * (1 - m) + mag2 * m;

      const freq = bin * s.sr / WINDOW_SIZE;
      mem[PHASE_ACCUM + bin] = (mem[PHASE_ACCUM + bin] || 0) + (2 * Math.PI * freq / s.sr);

      output += Math.sin(mem[PHASE_ACCUM + bin]) * morphedMag;
    }

    return output / (WINDOW_SIZE / 2);
  }, 'spectralMorph', 1024 * 5 + 512);
};

// Usage
play('morph',
  spectralMorph(
    s => Math.sin(2 * Math.PI * 440 * s.t),
    s => Math.sin(2 * Math.PI * 220 * s.t),
    s => (Math.sin(s.t * 0.5) + 1) * 0.5 // Morph over time
  )
);
```

---

## Implementation Requirements

To add FFT-based helpers to Aither, we'd need:

### 1. FFT/IFFT Library

```javascript
// Option A: Use existing library
import FFT from 'fft.js';

// Option B: Implement our own (educational)
function fft(buffer) {
  // Cooley-Tukey FFT algorithm
  // Returns { magnitudes: Float32Array, phases: Float32Array }
}

function ifft(magnitudes, phases) {
  // Inverse FFT
  // Returns Float32Array of time-domain samples
}
```

### 2. Windowing Functions

```javascript
// Reduce spectral leakage
function applyHannWindow(buffer) {
  const windowed = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / buffer.length));
    windowed[i] = buffer[i] * window;
  }
  return windowed;
}

function applyHammingWindow(buffer) { /* ... */ }
function applyBlackmanWindow(buffer) { /* ... */ }
```

### 3. Overlap-Add for Continuous Output

```javascript
// Smooth output from block-based FFT processing
function overlapAdd(outputBuffer, newBlock, writePos, hopSize) {
  for (let i = 0; i < newBlock.length; i++) {
    const pos = (writePos + i) % outputBuffer.length;
    outputBuffer[pos] += newBlock[i];
  }
}
```

### 4. Helper Utilities

```javascript
// Find peak bin (for pitch detection)
function findPeakBin(magnitudes) {
  let maxBin = 0;
  let maxMag = magnitudes[0];
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxBin = i;
    }
  }
  return maxBin;
}

// Convert bin to frequency
function binToFrequency(bin, sampleRate, fftSize) {
  return bin * sampleRate / fftSize;
}

// Convert frequency to bin
function frequencyToBin(freq, sampleRate, fftSize) {
  return Math.floor(freq * fftSize / sampleRate);
}
```

---

## Arguments FOR Functional FFT in Aither

### ✅ Fits the Architecture Perfectly

- Uses existing `expand()` pattern
- No changes to sample-by-sample processing
- State management via `s.state` / helper memory
- Pure functional interface: `pipe(signal, spectralFreeze(_), gain(_, 0.5))`

### ✅ Composable

```javascript
// Chain spectral effects like any other helper
play('complex', pipe(
  oscillator,
  spectralFreeze(_, freezeControl),
  spectralBandReject(_, 800, 1200),
  lowpass(_, 2000),
  gain(_, 0.5)
));
```

### ✅ Enables Unique Effects

- Spectral freeze (Paulstretch-style)
- Pitch detection/tracking
- Spectral morphing
- Frequency-specific processing
- Harmonizer effects
- Vocoder-like processing

### ✅ Analysis as Control Signals

FFT can provide control signals for other paradigms:

```javascript
const brightness = spectralCentroid(inputSignal);
const pitch = pitchDetect(inputSignal);

play('responsive', s => {
  const freq = pitch(s) * 2; // Octave up
  const cutoff = brightness(s) * 10; // Brightness controls filter
  return pipe(
    s => Math.sin(2 * Math.PI * freq * s.t),
    lowpass(_, cutoff),
    gain(_, 0.3)
  )(s);
});
```

### ✅ SuperCollider Has It

SC's PV_* (Phase Vocoder) UGens are popular for experimental sounds.

### ✅ Educational Value

Understanding FFT is fundamental to audio DSP. Implementing it functionally would be a great learning tool.

---

## Arguments AGAINST FFT in Aither

### ⚠️ Complexity

- FFT/IFFT implementation (or dependency)
- Windowing functions
- Overlap-add logic
- Phase unwrapping for pitch shifting
- Significantly more complex than time-domain helpers

### ⚠️ Inherent Latency

FFT introduces latency equal to the window size:
- 1024 samples @ 48kHz = ~21ms
- 2048 samples @ 48kHz = ~43ms

This is unavoidable and can feel sluggish in live performance.

### ⚠️ Not Heavily Used in Live Coding

Most live coding focuses on:
- Pattern generation (TidalCycles)
- Algorithmic composition
- Time-domain synthesis (filters, oscillators, delays)

Spectral effects are less common in live coding contexts.

### ⚠️ Time-Domain Alternatives

Many spectral effects can be approximated in time domain:
- Spectral freeze → very long feedback delays
- Pitch shifting → granular time-stretching
- Morphing → crossfading + filtering
- Analysis → envelope followers, zero-crossing detection

### ⚠️ Memory Requirements

FFT processing needs significant state:
- Window buffer: 1024-2048 floats
- Spectrum storage: 512-1024 complex numbers (2x floats)
- Output buffer: 1024-2048 floats
- Phase accumulators: 512-1024 floats

Total per instance: ~10-20KB (vs ~100 bytes for a simple filter)

### ⚠️ Performance Cost

- FFT is O(N log N) - expensive for real-time
- Running multiple spectral effects could strain CPU
- Though modern JS engines are fast, it's still a concern

### ⚠️ Not Core to "Five Paradigms"

Aither's philosophy centers on:
- 🔥 Kanon - Pure time functions
- 🌍 Rhythmos - Stateful oscillators
- 💨 Atomos - Discrete processes
- 💧 Physis - Physics simulation
- ✨ Chora - Spatial fields

None of these are fundamentally about frequency-domain processing.

---

## Is Functional Composition the Best Way?

**For Aither: Absolutely yes.**

### Why Functional Composition Wins

**1. Architecture Alignment**
- Aither is built on `f(s) → sample`
- Everything is a signal transformation
- FFT as a helper fits perfectly

**2. Composability**
- Works with `pipe()`, `mix()`, all existing infrastructure
- Can combine spectral and time-domain processing seamlessly
- Control signals from FFT can modulate other signals

**3. No Special Cases**
- Don't need a separate "spectral signal type"
- Don't need block-based processing mode
- Don't need architectural changes

**4. Consistency**
```javascript
// All of these have the same shape:
lowpass(signal, cutoff)
delay(signal, maxTime, time)
spectralFreeze(signal, freeze)  // ← Looks the same!
```

**5. User Experience**
Users don't need to think differently about spectral processing vs time-domain processing. It's all just signal transformation.

### Traditional Block-Based Approach: Not for Aither

```javascript
// Would require this:
class SpectralProcessor {
  constructor(signal, blockSize) { /* ... */ }
  process() {
    const block = this.collectSamples(blockSize);
    const spectrum = fft(block);
    // ...
    return ifft(spectrum);
  }
}

// Doesn't compose with existing helpers!
```

This breaks the `f(s)` paradigm and introduces special cases.

---

## Recommendation

### Should Aither Implement FFT?

**My take: Not yet, but keep it as a future possibility.**

**Prioritize first:**
1. ✅ More oscillators (saw, square, triangle)
2. ✅ More filters (resonant LP/HP, bandpass)
3. ✅ Noise generators (white, pink)
4. ✅ Envelopes (ADSR, line generators)
5. ✅ Waveshaping/distortion
6. ✅ Compressor/limiter

**These give 90% of the synthesis capability with 10% of the complexity.**

**Add FFT later if:**
- Users request spectral effects
- You want to explore experimental sounds
- You need analysis (pitch tracking, etc.)
- You're interested in the educational value

### If You Do Implement FFT

**Use the functional composition approach** shown in this document:
- Sliding window buffers
- Continuous processing (not block-based)
- Pure functional interface using `expand()`
- Composable with all existing helpers

**Start simple:**
1. Just `spectralFreeze()` first
2. Then `pitchDetect()` (useful as a control signal)
3. Then `spectralMorph()`
4. Build complexity gradually

**Use a library:**
- `fft.js` - Well-tested, MIT license
- Or `dsp.js` - More comprehensive

Don't implement FFT from scratch unless it's for learning.

---

## Conclusion

**FFT can absolutely be done with functional composition in Aither.** The architecture supports it beautifully through the `expand()` pattern and state management. It would fit naturally into the existing helper ecosystem.

**However, FFT is not essential** for Aither's core philosophy. The five paradigms are about generating sound from first principles - math, state, physics, space. Spectral processing is more about transforming existing sound.

**The functional approach is definitively the right way** for Aither. Block-based processing would break the `f(s)` paradigm and introduce architectural complexity.

**If FFT is added, it should be after** the core synthesis helpers are complete. Build the foundation first, then add experimental features.

---

**Related documents:**
- [COMPARISON.md](docs/COMPARISON.md) - How Aither relates to other systems
- [HELPERS.md](docs/HELPERS.md) - Current DSP helper implementation
- [CORE_VISION.md](docs/CORE_VISION.md) - The `f(s)` interface

**Further reading:**
- Julius O. Smith III - [Mathematics of the Discrete Fourier Transform](https://ccrma.stanford.edu/~jos/mdft/)
- [The Scientist and Engineer's Guide to Digital Signal Processing](http://www.dspguide.com/)
- [SuperCollider PV UGens](https://doc.sccode.org/Guides/FFT-Overview.html)
