# Wavetables vs Samples: Understanding the Relationship

> *"Wavetables ARE samples... just very small, perfectly looping ones designed for synthesis."*

## The Key Insight

**Wavetables and samples are technically the same thing** - both are pre-recorded audio data stored in buffers and played back at different speeds to change pitch. The differences are about **scale, purpose, and philosophy**, not fundamental technology.

```javascript
// A wavetable
const wavetable = new Float32Array(2048);  // One cycle
for (let i = 0; i < 2048; i++) {
  wavetable[i] = Math.sin(2 * Math.PI * i / 2048);
}

// A sample
const sample = new Float32Array(2_400_000);  // 50 seconds @ 48kHz
// ... load from kick.wav

// The playback mechanism is IDENTICAL
function playback(buffer, speed, s) {
  const readPos = (s.t * speed * s.sr) % buffer.length;
  const index = Math.floor(readPos);
  const frac = readPos - index;
  const sample1 = buffer[index];
  const sample2 = buffer[(index + 1) % buffer.length];
  return sample1 + (sample2 - sample1) * frac;
}
```

**Both use: buffer storage + variable playback speed = pitch control**

---

## The Spectrum of Buffer-Based Audio

```
Wavetables          Short Buffers        Samples              Full Recordings
│                   │                    │                    │
2048 samples        10,000 samples       480,000 samples      2,400,000+ samples
8 KB                40 KB                2 MB                 10+ MB
One cycle           Short grain          Drum hit             Song
Always loops        May loop             Rarely loops         Never loops
Synthesis           Granular             Composition          Playback
```

They're all points on a continuum, not separate technologies.

---

## The Key Differences

### 1. Size

| Type | Sample Count | Duration @ 48kHz | Memory | Purpose |
|------|-------------|------------------|---------|---------|
| **Wavetable** | 2,048 | 0.043 seconds | 8 KB | One cycle of waveform |
| **Short Buffer** | 10,000 | 0.2 seconds | 40 KB | Grain source |
| **Sample** | 480,000 | 10 seconds | 2 MB | Drum hit, phrase |
| **Recording** | 2,400,000+ | 50+ seconds | 10+ MB | Full track |

### 2. Content & Structure

**Wavetable:**
```
One perfect cycle - seamlessly looping
  ╱╲      ╱╲      ╱╲
 ╱  ╲    ╱  ╲    ╱  ╲
╱    ╲  ╱    ╲  ╱    ╲
      ╲╱      ╲╱      ╲╱
└────────┘
   2048 samples
   Perfect loop point
   No attack/decay
```

**Sample:**
```
Complete sound event - not designed to loop
[attack][sustain][decay][silence]
├─────── kick drum hit ──────┤
        48,000 samples
        Has envelope
        May have silence at end
```

### 3. Usage Philosophy

**Wavetable = Building Block**
- Meant to be pitched up/down freely
- Always loops seamlessly
- Part of a larger synthesis patch
- Modified in real-time (morph, filter, modulate)
- **Generating sound** from components

**Sample = Musical Element**
- Usually played at or near original pitch
- May or may not loop (requires careful loop points)
- Often the complete sound
- Typically left relatively unprocessed
- **Reproducing sound** that was recorded

### 4. How They're Used

```javascript
// WAVETABLE USAGE: Synthesis building block
play('bass', pipe(
  wavetable('saw', 55),           // Building block
  lowpass(_, 800),                // Shaped
  distort(_, 2),                  // Transformed
  feedback(_, 2.0, 0.5, 0.3),     // Spatialized
  gain(_, 0.5)
));

// SAMPLE USAGE: Musical element
play('drums',
  sample('kick'),                 // Complete sound
  // Maybe some reverb, that's it
);
```

---

## The Gray Area: Granular Synthesis

**Granular synthesis blurs the line completely:**

```javascript
// Extract a tiny grain from a sample
const grain = extractGrain(kickDrum, 0.01, 0.02); // 10-20ms = 480-960 samples

// Is this a wavetable or a sample?
// - It's small like a wavetable (480 samples)
// - It's from a recording like a sample
// - It's used as an oscillator like a wavetable
// - It retains timbral character from the sample

// Use it pitched like a wavetable
play('granular-bass', bufferOsc('kick-grain', 55));

// Now we're SYNTHESIZING with SAMPLED material
```

**This is the 💨 Atomos (Air) paradigm** - using discrete fragments to build new sounds.

---

## Single-Cycle Waveforms from Recordings

**Modern wavetable synths (Serum, Massive) commonly do this:**

```javascript
// 1. Record a vocal "Ahhhh"
const vocalRecording = record(microphone, 2.0); // 2 seconds

// 2. Detect the fundamental frequency
const pitch = detectPitch(vocalRecording); // 110 Hz

// 3. Extract ONE cycle
const oneCycle = extractCycle(vocalRecording, pitch); // 2048 samples

// 4. Use as a wavetable
createWavetable('vocal-ah', oneCycle);

// 5. Now it's a synthesizer oscillator
play('vocal-synth', pipe(
  wavetable('vocal-ah', 220),  // Pitched up an octave
  lowpass(_, 1200),
  tremolo(_, 5, 0.4),
  gain(_, 0.3)
));
```

**This is synthesis using sampled timbres** - you've captured a single cycle and now use it as a building block.

---

## What Should Aither Support?

Given Aither's philosophy of **algorithmic sound generation**, here's the recommendation:

### ✅ IMPLEMENT: Wavetables (2K-8K samples)

**Why:**
- Core synthesis building blocks
- Small memory footprint
- Always perfectly looping
- Can be generated mathematically OR from samples
- Essential for modern synthesis
- Fits all five paradigms

```javascript
// Mathematical generation (pure synthesis)
createWavetable('saw', phase => 2 * phase - 1);

// Additive generation (pure synthesis)
createSpectralWavetable('bell', [1, 0.6, 0.4, 0.3]);

// From sample (hybrid approach)
createWavetableFromSample('vocal', recordedAudio, fundamentalFreq);
```

### ✅ IMPLEMENT: Short Buffers (1-10 seconds, ~480K samples max)

**Why:**
- Source material for granular synthesis (Atomos paradigm)
- Wavetable bank creation
- Experimental sound collage
- Still synthesis-focused (transforming the material)
- Manageable memory footprint

```javascript
// Load a short recording for granular processing
loadBuffer('texture', audioData); // Max 10 seconds

play('granular', s => {
  // Extract grains and process
  const grain = extractGrain('texture', s.t % 10, 0.05);
  return grain * 0.3;
});
```

### ❌ SKIP: Full Sample Playback (minutes of audio)

**Why not:**
- Not really synthesis - it's reproduction/composition
- Belongs in a DAW (Ableton, Logic, etc.)
- Massive memory requirements
- File management complexity
- Loading/streaming infrastructure
- Not aligned with "generating sound algorithmically"

**Use case differences:**

| Feature | Aither | DAW (Ableton, etc) |
|---------|--------|-------------------|
| **Purpose** | Live synthesis | Music production |
| **Workflow** | Generate sound | Arrange samples |
| **Memory** | Synthesize on-the-fly | Load full tracks |
| **Philosophy** | Algorithmic creation | Composition |

---

## Unified Implementation

The beauty is that **one system handles all of this:**

```javascript
// Global buffer pool with size constraints
const BUFFER_POOL = new Map();
const MAX_BUFFER_SIZE = 480_000; // 10 seconds @ 48kHz

// Generic buffer loader
export function loadBuffer(name, data) {
  if (data.length > MAX_BUFFER_SIZE) {
    throw new Error(
      `Buffer "${name}" too large (${data.length} samples). ` +
      `Max: ${MAX_BUFFER_SIZE} (10 seconds @ 48kHz)`
    );
  }
  BUFFER_POOL.set(name, Float32Array.from(data));
  console.log(`[Aither] Loaded buffer "${name}": ${data.length} samples`);
}

// Convenience: Create wavetable from generator function
export function createWavetable(name, generator, size = 2048) {
  const data = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = generator(i / size); // phase 0-1
  }
  loadBuffer(name, data);
}

// Convenience: Create wavetable from spectral data
export function createSpectralWavetable(name, magnitudes, phases = null) {
  const size = 2048;
  const data = new Float32Array(size);

  // Additive synthesis from spectrum
  for (let i = 0; i < size; i++) {
    const phase = i / size;
    let sample = 0;

    for (let h = 0; h < magnitudes.length; h++) {
      const mag = magnitudes[h];
      const phs = phases ? phases[h] : 0;
      sample += Math.sin(2 * Math.PI * phase * (h + 1) + phs) * mag;
    }

    data[i] = sample;
  }

  // Normalize
  const max = Math.max(...data.map(Math.abs));
  for (let i = 0; i < size; i++) {
    data[i] /= max;
  }

  loadBuffer(name, data);
}

// Universal buffer oscillator - works for wavetables AND short samples
export const bufferOsc = (bufferName, freq, loop = true) => {
  return expand((s, input, mem, base, chan, f) => {
    const buffer = BUFFER_POOL.get(bufferName);
    if (!buffer) {
      console.warn(`Buffer "${bufferName}" not found`);
      return 0;
    }

    const PHASE = 0;
    const frequency = typeof f === 'function' ? f(s) : f;

    // Phase accumulation
    const phaseIncrement = frequency / s.sr;
    mem[base + PHASE] = (mem[base + PHASE] || 0) + phaseIncrement;

    // Handle looping vs one-shot
    if (loop) {
      mem[base + PHASE] %= 1.0;
    } else if (mem[base + PHASE] >= 1.0) {
      return 0; // Finished playback
    }

    // Read from buffer with interpolation
    const readPos = mem[base + PHASE] * buffer.length;
    const index = Math.floor(readPos);
    const frac = readPos - index;

    const sample1 = buffer[index] || 0;
    const sample2 = buffer[(index + 1) % buffer.length] || 0;

    return sample1 + (sample2 - sample1) * frac;
  }, 'bufferOsc', 1);
};

// Alias for clarity
export const wavetable = (tableName, freq) => bufferOsc(tableName, freq, true);
export const playbuf = (bufferName, freq, loop = false) => bufferOsc(bufferName, freq, loop);
```

### Usage Examples

```javascript
// 1. WAVETABLE: Mathematical generation
createWavetable('saw', phase => 2 * phase - 1);
createWavetable('square', phase => phase < 0.5 ? 1 : -1);

play('synth', pipe(
  wavetable('saw', 110),
  lowpass(_, 800),
  gain(_, 0.3)
));

// 2. WAVETABLE: Spectral generation
createSpectralWavetable('bell', [1.0, 0.6, 0.4, 0.3]);

play('bell', wavetable('bell', 440));

// 3. WAVETABLE: From sample (single cycle extraction)
const vocalCycle = extractOneCycle(recordedVocal, 110);
loadBuffer('vocal-ah', vocalCycle);

play('vocal-synth', wavetable('vocal-ah', 220));

// 4. SHORT BUFFER: Granular synthesis
loadBuffer('texture', recordedTexture); // 5 seconds

play('granular', s => {
  // Random grain positions
  const grainStart = Math.random();
  const grainFreq = 100 + Math.random() * 400;

  return playbuf('texture', grainFreq)(s) * 0.2;
});

// 5. SHORT BUFFER: Wavetable bank creation
const bank = [];
for (let i = 0; i < 64; i++) {
  const slice = recordedTexture.slice(i * 1000, (i + 1) * 1000);
  bank.push(resampleToWavetable(slice, 2048));
}
createWavetableBank('morph-bank', bank);
```

---

## Memory Budget

With a 10-second buffer limit:

```
Wavetables (2048 samples each):
- 100 wavetables = 100 × 8 KB = 800 KB

Short buffers (up to 480K samples each):
- 10 buffers = 10 × 2 MB = 20 MB

Wavetable banks (64 tables × 2048 samples):
- 5 banks = 5 × 512 KB = 2.5 MB

Total: ~23 MB for extensive buffer usage
```

**This is reasonable for modern systems.** We're not loading gigabytes of orchestral libraries.

---

## Relationship to Aither's Paradigms

### 🔥 Kanon (Fire) - Pure Mathematical Wavetables

```javascript
// Generated from pure math, no sampling
createWavetable('pure-sine', phase => Math.sin(2 * Math.PI * phase));
createWavetable('pure-saw', phase => 2 * phase - 1);
```

### 🌍 Rhythmos (Earth) - Stateful Phase Accumulation

```javascript
// Wavetable oscillators ARE Rhythmos
// They use phase state to track position
play('rhythmic', wavetable('saw', 110));
```

### 💨 Atomos (Air) - Granular Buffer Processing

```javascript
// Discrete grains from buffers
loadBuffer('source', audioData);

play('granular', s => {
  const grainPos = Math.floor(Math.random() * 10) / 10;
  const grainPitch = 100 + Math.random() * 300;
  // Extract and window grain from buffer
  return playbuf('source', grainPitch)(s) * envelope;
});
```

### 💧 Physis (Water) - Physics-Modulated Buffer Reading

```javascript
// Spring controls playback position/speed
play('physics-buffer', s => {
  // Spring simulation in state
  const position = s.state[0];
  const speed = s.state[1];
  // ... physics ...

  // Use physics to control buffer playback
  return playbuf('texture', 100 + Math.abs(position) * 100)(s);
});
```

### ✨ Chora (Aither) - Spatial Buffer Fields

```javascript
// Different buffers/wavetables at different spatial positions
play('spatial-wt', s => {
  const { x, y, z } = s.position;
  const distance = Math.sqrt(x*x + y*y + z*z);

  // Position in space selects wavetable
  const wtName = distance < 2 ? 'soft' : 'harsh';

  return wavetable(wtName, 440)(s) / (distance + 1);
});
```

---

## Comparison: What Each System Does

| System | Wavetables | Short Buffers | Full Samples | Philosophy |
|--------|-----------|---------------|--------------|------------|
| **Aither** | ✅ Yes | ✅ Yes (≤10s) | ❌ No | Synthesis-first |
| **SuperCollider** | ✅ Yes | ✅ Yes | ✅ Yes | Everything |
| **Serum** | ✅ Yes | ⚠️ Partial | ❌ No | Wavetable-focused |
| **Ableton** | ⚠️ Simpler | ✅ Yes | ✅ Yes | Production-first |
| **VCV Rack** | ✅ Yes | ✅ Yes | ⚠️ Limited | Modular synthesis |

**Aither's niche:** Pure synthesis with support for granular source material.

---

## Practical Guidelines

### When to Use Wavetables

✅ Building synthesizer patches
✅ Generating rich, evolving timbres
✅ Mathematical sound design
✅ Cross-paradigm synthesis
✅ Pure algorithmic composition

### When to Use Short Buffers

✅ Granular synthesis source material
✅ Creating wavetable banks from recordings
✅ Experimental texture manipulation
✅ Hybrid synthesis approaches

### When to Use a DAW Instead

❌ Arranging full songs with samples
❌ Playing back drum loops or full recordings
❌ Working with vocal takes or instrument recordings
❌ Traditional sample-based music production

---

## Summary

**Key takeaways:**

1. **Wavetables and samples are the same technology** - just different scales and purposes
2. **Wavetables are synthesis tools** - small, looping, pitched building blocks
3. **Samples are composition tools** - complete sounds, usually unpitched playback
4. **Aither should support both wavetables and short buffers** - for synthesis, not production
5. **The implementation is unified** - one buffer pool, one playback engine
6. **Skip full sample playback** - not aligned with synthesis philosophy

**The line between synthesis and sampling is blurry**, and that's okay. What matters is **intent and scale**:
- Wavetables: synthesis building blocks
- Short buffers: granular source material
- Full samples: composition elements (not for Aither)

**Implement buffer support in Aither with size limits** to keep it focused on synthesis while enabling creative techniques like granular processing and wavetable morphing.

---

**Related documents:**
- [WAVETABLE-SYNTHESIS.md](WAVETABLE-SYNTHESIS.md) - Detailed wavetable implementation
- [FFT-AND-SPECTRAL-PROCESSING.md](FFT-AND-SPECTRAL-PROCESSING.md) - Spectral techniques
- [COMPARISON.md](docs/COMPARISON.md) - How Aither compares to other systems
- [CORE_VISION.md](docs/CORE_VISION.md) - The f(s) philosophy

**Further reading:**
- [The difference between wavetable and sample-based synthesis](https://www.soundonsound.com/techniques/difference-between-wavetable-sample-based-synthesis)
- [Granular Synthesis: A Guide](https://www.ableton.com/en/blog/granular-synthesis-guide/)
- [Curtis Roads - Microsound](https://mitpress.mit.edu/9780262681544/microsound/) (definitive book on granular synthesis)
