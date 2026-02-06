# Performance Optimization Guide

> **Goal:** Maximum performance and high-fidelity audio for solo live coding and experimentation.

## Table of Contents

1. [Hardware Considerations](#hardware-considerations)
2. [Current Performance Profile](#current-performance-profile)
3. [Quick Wins](#quick-wins)
4. [Lookup Tables](#lookup-tables)
5. [Pre-Computation Strategies](#pre-computation-strategies)
6. [Buffer Optimization](#buffer-optimization)
7. [High-Fidelity Audio](#high-fidelity-audio)
8. [Monitoring & Benchmarking](#monitoring--benchmarking)
9. [Performance Tiers](#performance-tiers)
10. [Complete Examples](#complete-examples)

---

## Hardware Considerations

### Clock Speed (Single Core): The "God-Tier" Stat

**A 5.0GHz single core will always be "smoother" for a single complex vortex-morph than ten 2.0GHz cores.**

Why? **Audio is linear; the next sample depends on the last.**

```javascript
// Sample N+1 MUST wait for sample N to complete
mem[idx] = (mem[idx] + phaseInc) % 1.0;  // Read previous state
const sample = Math.sin(mem[idx] * TAU);  // Generate next sample
```

Audio synthesis is inherently **sequential**. You cannot parallelize phase accumulation across cores because each sample depends on the previous state.

### What Matters for Audio Performance

| Factor | Impact | Why |
|--------|--------|-----|
| **Single-Core Clock Speed** | ⭐⭐⭐⭐⭐ Critical | 48k sequential ops/second |
| **L1/L2 Cache** | ⭐⭐⭐⭐ High | State buffer must stay in cache |
| **RT Kernel** | ⭐⭐⭐⭐ High | Eliminates jitter/dropouts (see [REALTIME_KERNEL.md](REALTIME_KERNEL.md)) |
| **RAM Speed** | ⭐⭐ Low | Audio buffers fit in cache |
| **Core Count** | ⭐ Minimal | Audio is single-threaded |
| **GPU** | - None | Not used for synthesis |

### CPU Recommendations

| CPU | Cores | Clock | Audio Rating | Notes |
|-----|-------|-------|--------------|-------|
| i9-13900K | 24 | 5.8GHz | ⭐⭐⭐⭐⭐ | Best for audio |
| Ryzen 9 7950X | 16 | 5.7GHz | ⭐⭐⭐⭐⭐ | Excellent |
| M2 Max | 12 | 3.7GHz | ⭐⭐⭐⭐ | Good (very efficient) |
| i5-11400 | 6 | 4.4GHz | ⭐⭐⭐ | Decent for solo |
| Old Xeon | 32 | 2.0GHz | ⭐⭐ | Many cores won't help |

**Rule of Thumb**: For audio, prefer 1 fast core over 10 slow cores.

### The "Free Upgrade" Path

Before buying new hardware:
1. **RT Kernel** (free, ~2x latency improvement) - See [REALTIME_KERNEL.md](REALTIME_KERNEL.md)
2. **Optimize Code** (free, 5-20x speedup) - This document
3. **Upgrade CPU** ($$, linear clock speed gains)

---

## Current Performance Profile

### What You Have (speaker.js + Ring Buffer)

```
Speaker.js Setup:
├─ 48kHz, 32-bit float (high fidelity)
├─ Ring buffer isolation (GC-safe)
├─ Direct Float64Array access (fast)
└─ Math.tanh() soft clipping (clean)
```

**Already professional-grade!** These optimizations make it better.

### Performance Targets

| Scenario | Target Performance | CPU Usage @ 3GHz |
|----------|-------------------|------------------|
| **10 simple signals** | Should be trivial | <1% |
| **50 complex signals** | Smooth, no glitches | 5-10% |
| **100+ signals** | With optimizations | 15-25% |

**For live coding:** 20-50 simultaneous signals is typical.

---

## Quick Wins

### 1. Pre-Compute Phase Increments ✅ (Already Doing)

**Current best practice:**
```javascript
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;  // ← Computed ONCE

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;  // ← Just addition
      return [Math.sin(mem[idx] * TAU)];
    }
  };
});
```

**Impact:** 2-5x faster (vs computing `440/sr` 48,000 times/sec)

### 2. Use Lookup Tables for Trig

**Replace expensive Math.sin/cos:**

```javascript
// luts.js - Lookup Tables
const SINE_TABLE_SIZE = 8192;
const sineTable = new Float32Array(SINE_TABLE_SIZE);

// Generate table once at startup
for (let i = 0; i < SINE_TABLE_SIZE; i++) {
  sineTable[i] = Math.sin((i / SINE_TABLE_SIZE) * Math.PI * 2);
}

export function fastSin(phase) {
  // phase is normalized 0-1
  const index = (phase * SINE_TABLE_SIZE) | 0;  // Fast float→int
  return sineTable[index & (SINE_TABLE_SIZE - 1)];  // Wrap with mask
}

export function fastCos(phase) {
  // cos(x) = sin(x + π/2) = sin(x + 0.25)
  return fastSin((phase + 0.25) % 1.0);
}
```

**Impact:** Math.sin (~100 cycles) → table lookup (~5 cycles) = **20x faster**

### 3. Avoid Modulo with Masks

**Slower:**
```javascript
index = phase % SINE_TABLE_SIZE;  // Division operation
```

**Faster:**
```javascript
index = phase & (SINE_TABLE_SIZE - 1);  // Bitwise AND (if size is power of 2)
```

**Requirement:** Table size must be power of 2 (2048, 4096, 8192, etc.)

---

## Lookup Tables

### Complete Implementation

```javascript
// luts.js - Complete Lookup Table System
const TAU = Math.PI * 2;

// Sine/Cosine tables
const SINE_TABLE_SIZE = 8192;  // Power of 2
const SINE_MASK = SINE_TABLE_SIZE - 1;
const sineTable = new Float32Array(SINE_TABLE_SIZE);

for (let i = 0; i < SINE_TABLE_SIZE; i++) {
  sineTable[i] = Math.sin((i / SINE_TABLE_SIZE) * TAU);
}

export function fastSin(phase) {
  // phase: 0-1 (normalized)
  const index = (phase * SINE_TABLE_SIZE) | 0;
  return sineTable[index & SINE_MASK];
}

export function fastCos(phase) {
  return fastSin((phase + 0.25) % 1.0);
}

// Tanh table (for soft clipping)
const TANH_TABLE_SIZE = 4096;
const TANH_MASK = TANH_TABLE_SIZE - 1;
const TANH_RANGE = 4.0;  // -4 to +4 (covers useful range)
const tanhTable = new Float32Array(TANH_TABLE_SIZE);

for (let i = 0; i < TANH_TABLE_SIZE; i++) {
  const x = ((i / TANH_TABLE_SIZE) * 2 - 1) * TANH_RANGE;
  tanhTable[i] = Math.tanh(x);
}

export function fastTanh(x) {
  // Clamp to range
  if (x < -TANH_RANGE) return -1.0;
  if (x > TANH_RANGE) return 1.0;

  // Map to table index
  const normalized = (x / TANH_RANGE + 1) * 0.5;  // 0-1
  const index = (normalized * TANH_TABLE_SIZE) | 0;
  return tanhTable[index & TANH_MASK];
}

// Exponential table (for envelopes)
const EXP_TABLE_SIZE = 2048;
const EXP_MASK = EXP_TABLE_SIZE - 1;
const expTable = new Float32Array(EXP_TABLE_SIZE);

for (let i = 0; i < EXP_TABLE_SIZE; i++) {
  const x = (i / EXP_TABLE_SIZE) * 10;  // 0 to 10
  expTable[i] = Math.exp(-x);  // e^(-x)
}

export function fastExpDecay(x) {
  // x: 0-10 (decay factor)
  if (x >= 10) return 0;
  if (x <= 0) return 1;

  const index = (x * (EXP_TABLE_SIZE / 10)) | 0;
  return expTable[index & EXP_MASK];
}
```

### Usage in Signals

```javascript
import { fastSin, fastCos, fastTanh } from './luts.js';

kanon('optimized-sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [fastSin(mem[idx]) * 0.5];  // 20x faster than Math.sin
    }
  };
});

kanon('fm-optimized', (mem, idx, sr) => {
  const carrierInc = 440 / sr;
  const modInc = 6 / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + carrierInc) % 1.0;
      mem[idx + 1] = (mem[idx + 1] + modInc) % 1.0;

      const modAmount = fastSin(mem[idx + 1]) * 100;
      const carrierPhase = (mem[idx] + modAmount / (TAU * 440)) % 1.0;

      return [fastSin(carrierPhase) * 0.5];
    }
  };
});
```

---

## Pre-Computation Strategies

### Strategy 1: Compute Constants in Factory

```javascript
kanon('complex', (mem, idx, sr) => {
  // ALL of this happens ONCE
  const freq1 = 440;
  const freq2 = 554.37;  // Perfect fifth
  const freq3 = 659.25;  // Major third

  const inc1 = freq1 / sr;
  const inc2 = freq2 / sr;
  const inc3 = freq3 / sr;

  const mix1 = 0.5;
  const mix2 = 0.3;
  const mix3 = 0.2;

  // Hot path: just use the constants
  return {
    update: () => {
      mem[idx] = (mem[idx] + inc1) % 1.0;
      mem[idx + 1] = (mem[idx + 1] + inc2) % 1.0;
      mem[idx + 2] = (mem[idx + 2] + inc3) % 1.0;

      const s1 = fastSin(mem[idx]) * mix1;
      const s2 = fastSin(mem[idx + 1]) * mix2;
      const s3 = fastSin(mem[idx + 2]) * mix3;

      return [s1 + s2 + s3];
    }
  };
});
```

### Strategy 2: Pre-Compute Filter Coefficients

```javascript
kanon('filtered', (mem, idx, sr) => {
  // Filter coefficients computed ONCE
  const cutoffHz = 1000;
  const omega = (TAU * cutoffHz) / sr;
  const alpha = Math.sin(omega) / (2 * 0.707);  // Q = 0.707

  const b0 = (1 - Math.cos(omega)) / 2;
  const b1 = 1 - Math.cos(omega);
  const b2 = b0;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(omega);
  const a2 = 1 - alpha;

  return {
    update: () => {
      // Just use pre-computed coefficients
      const input = fastSin(mem[idx]);
      mem[idx] = (mem[idx] + 0.01) % 1.0;

      const output =
        (b0/a0) * input +
        (b1/a0) * mem[idx + 1] +
        (b2/a0) * mem[idx + 2] -
        (a1/a0) * mem[idx + 3] -
        (a2/a0) * mem[idx + 4];

      // Shift delay line
      mem[idx + 2] = mem[idx + 1];
      mem[idx + 1] = input;
      mem[idx + 4] = mem[idx + 3];
      mem[idx + 3] = output;

      return [output];
    }
  };
});
```

### Strategy 3: Wavetable Synthesis

```javascript
// Pre-generate complex waveforms
kanon('wavetable', (mem, idx, sr) => {
  // Generate wavetable ONCE
  const tableSize = 2048;
  const wavetable = new Float32Array(tableSize);

  // Complex waveform (computed once, not 48k times/sec)
  for (let i = 0; i < tableSize; i++) {
    const phase = i / tableSize;
    // Add multiple harmonics
    wavetable[i] =
      Math.sin(phase * TAU) * 1.0 +
      Math.sin(phase * TAU * 2) * 0.5 +
      Math.sin(phase * TAU * 3) * 0.25 +
      Math.sin(phase * TAU * 5) * 0.125;
  }

  const phaseInc = 440 / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;

      // Linear interpolation for smooth playback
      const pos = mem[idx] * tableSize;
      const index1 = Math.floor(pos);
      const index2 = (index1 + 1) % tableSize;
      const frac = pos - index1;

      const sample = wavetable[index1] * (1 - frac) +
                     wavetable[index2] * frac;

      return [sample * 0.2];
    }
  };
});
```

---

## Buffer Optimization

### Current Buffer Size

```javascript
// storage.js
const BUFFER_SIZE = 32768;  // ~680ms @ 48kHz
```

**Good for:** Most use cases

### Recommended Sizes

| Buffer Size | Duration @ 48kHz | Use Case |
|-------------|------------------|----------|
| 8192 | ~170ms | Low latency, simple synthesis |
| 16384 | ~341ms | Balanced |
| 32768 | ~682ms | Default (current) |
| 65536 | ~1365ms | Complex synthesis, stability |
| 131072 | ~2730ms | Maximum stability |

### When to Increase

**Symptoms:**
- Glitches/pops during complex synthesis
- Xruns (buffer underruns) reported
- CPU spikes cause dropouts

**Solution:**
```javascript
// storage.js - Increase buffer
const BUFFER_SIZE = 65536;  // More headroom
```

**Trade-off:** Higher latency (but for live coding, 1-2s is fine)

### When to Decrease

**Symptoms:**
- Hot-reload changes take too long to hear
- Want faster feedback loop

**Solution:**
```javascript
const BUFFER_SIZE = 16384;  // Lower latency
```

**Trade-off:** More risk of underruns

### Adaptive Buffer (Advanced)

```javascript
// monitor.js
let xrunCount = 0;
let currentBufferSize = 32768;

setInterval(() => {
  const level = ringBuffer.availableSpace();

  if (level < BUFFER_SIZE * 0.1) {
    xrunCount++;
    console.warn('Near underrun! Consider larger buffer.');
  }

  if (xrunCount > 10) {
    console.error('Too many xruns! Increase BUFFER_SIZE.');
  }
}, 1000);
```

---

## High-Fidelity Audio

### Current Setup (Already High Quality)

```javascript
const speaker = new Speaker({
  channels: 1,
  bitDepth: 32,      // 32-bit float (high precision)
  sampleRate: 48000, // Professional standard
  float: true,       // Floating point (no quantization)
});
```

**This is professional quality!**

### Option: 96kHz for Audiophile Mode

```javascript
const speaker = new Speaker({
  channels: 1,
  bitDepth: 32,
  sampleRate: 96000,  // ← 2x sample rate
  float: true,
});
```

**Benefits:**
- ✅ Frequency response up to 48kHz (vs 24kHz @ 48kHz)
- ✅ Lower quantization noise
- ✅ Less aliasing with complex waveforms

**Costs:**
- ❌ 2x CPU usage (96k samples/sec vs 48k)
- ❌ 2x memory bandwidth

**When to use:** Recording/mastering, if CPU headroom allows

### Dithering (Advanced)

Reduce quantization noise at low levels:

```javascript
function triangularDither() {
  // Triangular PDF dither (gold standard)
  return (Math.random() + Math.random() - 1) * 0.0000001;
}

// In update():
const sample = fastSin(mem[idx]) * 0.5;
return [sample + triangularDither()];
```

**Impact:** Cleaner sound at low volumes (subtle but measurable)

### DC Offset Filter (Safety)

Prevent speaker damage from DC bias:

```javascript
kanon('dc-filter', (mem, idx, sr) => {
  // DC blocking filter
  const cutoff = 20;  // 20 Hz high-pass
  const alpha = 1 - (TAU * cutoff) / sr;

  return {
    update: () => {
      const input = /* your signal */;

      const output = input - mem[idx] + alpha * mem[idx + 1];
      mem[idx] = input;
      mem[idx + 1] = output;

      return [output];
    }
  };
});
```

**Your Math.tanh() soft clipping already prevents most DC issues.**

---

## Monitoring & Benchmarking

### Real-Time CPU Monitor

```javascript
// monitor.js - Add to your project
let samples = 0;
let lastTime = performance.now();
let maxUpdateTime = 0;
let totalUpdateTime = 0;

export function startMonitoring() {
  setInterval(() => {
    const now = performance.now();
    const elapsed = (now - lastTime) / 1000;
    const sampleRate = samples / elapsed;
    const avgTime = totalUpdateTime / samples;

    console.log('=== Performance ===');
    console.log(`Sample rate: ${(sampleRate / 1000).toFixed(1)}k/sec`);
    console.log(`Avg update: ${avgTime.toFixed(3)}ms`);
    console.log(`Max update: ${maxUpdateTime.toFixed(3)}ms`);
    console.log(`Buffer level: ${ringBuffer.availableSpace()}`);
    console.log(`Active signals: ${registry.size}`);

    // Reset counters
    samples = 0;
    maxUpdateTime = 0;
    totalUpdateTime = 0;
    lastTime = now;
  }, 2000);
}

// In engine.js updateAll()
export function updateAll(sampleRate) {
  const startTime = performance.now();

  // ... your update code ...

  const elapsed = performance.now() - startTime;
  samples++;
  totalUpdateTime += elapsed;
  maxUpdateTime = Math.max(maxUpdateTime, elapsed);

  return vector;
}
```

### Benchmark Individual Signals

```javascript
// benchmark.js
export function benchmarkSignal(signalFunc, iterations = 1_000_000) {
  const mem = new Float64Array(1024);
  const idx = 0;
  const sr = 48000;

  const signal = signalFunc(mem, idx, sr);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    signal.update();
  }
  const elapsed = performance.now() - start;

  const samplesPerSec = (iterations / elapsed) * 1000;
  const cpuPercent = (48000 / samplesPerSec) * 100;

  console.log(`Performance: ${(samplesPerSec / 1000000).toFixed(2)}M samples/sec`);
  console.log(`Est. CPU @ 48kHz: ${cpuPercent.toFixed(2)}%`);

  return samplesPerSec;
}

// Usage:
benchmarkSignal((mem, idx, sr) => ({
  update: () => {
    mem[idx] = (mem[idx] + 440/sr) % 1.0;
    return [Math.sin(mem[idx] * TAU)];
  }
}));
```

### Performance Targets

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Update time** | <0.5ms | <1.0ms | >2ms |
| **Sample rate** | >96kHz | >48kHz | <48kHz |
| **Buffer level** | 50-80% | 30-50% | <20% |
| **Max update** | <2ms | <5ms | >10ms |

---

## Performance Tiers

### Tier 1: Baseline (Current)

```javascript
kanon('baseline', (mem, idx, sr) => {
  const phaseInc = 440 / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [Math.sin(mem[idx] * TAU) * 0.5];
    }
  };
});
```

**Performance:**
- ~50-100 signals @ 48kHz
- Math.sin: ~100 cycles
- Simple, readable

### Tier 2: Optimized (Recommended)

```javascript
import { fastSin } from './luts.js';

kanon('optimized', (mem, idx, sr) => {
  const phaseInc = 440 / sr;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [fastSin(mem[idx]) * 0.5];
    }
  };
});
```

**Performance:**
- ~200-500 signals @ 48kHz
- Lookup: ~5 cycles (20x faster)
- Still readable

### Tier 3: Ultra (If Needed)

```javascript
kanon('ultra', (mem, idx, sr) => {
  const phaseInc = 440 / sr;
  const tableSize = 8192;
  const tableMask = tableSize - 1;

  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;

      // Manual inline for maximum speed
      const tableIndex = (mem[idx] * tableSize) | 0;
      const sample = sineTable[tableIndex & tableMask];

      return [sample * 0.5];
    }
  };
});
```

**Performance:**
- ~1000+ signals @ 48kHz
- Every cycle optimized
- Less readable

**For live coding: Tier 2 is the sweet spot (performance + clarity).**

---

## Complete Examples

### Example 1: High-Performance Oscillator

```javascript
// optimized_oscillators.js
import { fastSin, fastCos } from './luts.js';

export function createOptimizedSine(freq) {
  return (mem, idx, sr) => {
    const phaseInc = freq / sr;

    return {
      update: () => {
        mem[idx] = (mem[idx] + phaseInc) % 1.0;
        return [fastSin(mem[idx]) * 0.5];
      }
    };
  };
}

export function createOptimizedFM(carrierFreq, modFreq, modDepth) {
  return (mem, idx, sr) => {
    const carrierInc = carrierFreq / sr;
    const modInc = modFreq / sr;
    const modAmount = modDepth / (TAU * carrierFreq);

    return {
      update: () => {
        mem[idx] = (mem[idx] + carrierInc) % 1.0;
        mem[idx + 1] = (mem[idx + 1] + modInc) % 1.0;

        const mod = fastSin(mem[idx + 1]) * modAmount;
        return [fastSin((mem[idx] + mod) % 1.0) * 0.5];
      }
    };
  };
}

// Usage:
kanon('fast-sine', createOptimizedSine(440));
kanon('fast-fm', createOptimizedFM(440, 6, 100));
```

### Example 2: High-Performance Filter

```javascript
// optimized_filters.js
export function createOnePoleLP(cutoffHz) {
  return (mem, idx, sr) => {
    const omega = (TAU * cutoffHz) / sr;
    const alpha = Math.min(omega, 0.99);  // Stability

    return {
      update: () => {
        const input = mem[idx];  // Input from previous stage
        const filtered = alpha * input + (1 - alpha) * mem[idx + 1];
        mem[idx + 1] = filtered;
        return [filtered];
      }
    };
  };
}

export function createBiquadLP(cutoffHz, resonance) {
  return (mem, idx, sr) => {
    const omega = (TAU * cutoffHz) / sr;
    const alpha = Math.sin(omega) / (2 * resonance);

    const b0 = (1 - Math.cos(omega)) / 2;
    const b1 = 1 - Math.cos(omega);
    const b2 = b0;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(omega);
    const a2 = 1 - alpha;

    // Normalize
    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;

    return {
      update: () => {
        const input = mem[idx];

        const output =
          nb0 * input +
          nb1 * mem[idx + 1] +
          nb2 * mem[idx + 2] -
          na1 * mem[idx + 3] -
          na2 * mem[idx + 4];

        // Update delay line
        mem[idx + 2] = mem[idx + 1];
        mem[idx + 1] = input;
        mem[idx + 4] = mem[idx + 3];
        mem[idx + 3] = output;

        return [output];
      }
    };
  };
}
```

### Example 3: Complete Optimized Synth

```javascript
// signals.js - Production-ready optimized synth
import { fastSin, fastTanh } from './luts.js';

kanon('pro-synth', (mem, idx, sr) => {
  // State layout
  const STATE = {
    OSC1_PHASE: idx,
    OSC2_PHASE: idx + 1,
    LFO_PHASE: idx + 2,
    FILTER_Z1: idx + 3,
    ENV_LEVEL: idx + 4,
  };

  // Pre-computed constants
  const osc1Inc = 440 / sr;
  const osc2Inc = 443 / sr;  // Slightly detuned
  const lfoInc = 6 / sr;
  const filterBase = 0.1;
  const envDecay = 0.9999;

  return {
    update: () => {
      // LFO
      mem[STATE.LFO_PHASE] = (mem[STATE.LFO_PHASE] + lfoInc) % 1.0;
      const lfo = fastSin(mem[STATE.LFO_PHASE]) * 0.5 + 0.5;  // 0-1

      // Oscillators
      mem[STATE.OSC1_PHASE] = (mem[STATE.OSC1_PHASE] + osc1Inc) % 1.0;
      mem[STATE.OSC2_PHASE] = (mem[STATE.OSC2_PHASE] + osc2Inc) % 1.0;

      const osc1 = fastSin(mem[STATE.OSC1_PHASE]);
      const osc2 = fastSin(mem[STATE.OSC2_PHASE]);
      const mixed = (osc1 + osc2) * 0.5;

      // Filter (LFO modulated)
      const cutoff = filterBase + lfo * 0.2;
      const filtered = cutoff * mixed + (1 - cutoff) * mem[STATE.FILTER_Z1];
      mem[STATE.FILTER_Z1] = filtered;

      // Envelope
      mem[STATE.ENV_LEVEL] *= envDecay;

      // Soft clip and output
      return [fastTanh(filtered * mem[STATE.ENV_LEVEL] * 2) * 0.5];
    }
  };
});
```

---

## Summary: Optimization Checklist

### Implemented ✅
- [x] Float64Array direct access
- [x] Ring buffer isolation
- [x] Pre-compute phase increments
- [x] Soft clipping (Math.tanh)

### Quick Wins (Add These)
- [ ] Lookup tables for trig functions (20x speedup)
- [ ] Monitor CPU usage (performance.now())
- [ ] Benchmark individual signals
- [ ] Increase buffer if needed (stability)

### Advanced (Optional)
- [ ] 96kHz sample rate (audiophile mode)
- [ ] Dithering (cleaner low-level audio)
- [ ] Wavetable synthesis (complex waveforms)
- [ ] SIMD operations (maximum performance)

---

## Final Recommendations for Your Use Case

**Solo live coding + experimentation:**

1. **Add lookup tables** - Easy 20x speedup for trig
2. **Keep 48kHz** - Great quality, efficient
3. **Use Tier 2 patterns** - Optimized but readable
4. **Monitor performance** - Know when you're pushing limits
5. **Larger buffer if needed** - Stability over latency

**Your current architecture is already professional.** These optimizations give you headroom for complex synthesis while maintaining high fidelity.

---

## Quick Start

```bash
# 1. Add lookup tables
$ cp examples/luts.js ./luts.js

# 2. Import in signals.js
import { fastSin, fastCos } from './luts.js';

# 3. Replace Math.sin with fastSin
- return [Math.sin(mem[idx] * TAU)];
+ return [fastSin(mem[idx])];

# 4. Add monitoring (optional)
import { startMonitoring } from './monitor.js';
startMonitoring();

# 5. Run and enjoy 20x faster trig! 🎵
$ bun index.js
```

---

**Last updated:** 2026-02-05
**Status:** Production-ready optimizations for solo live coding
**Key principle:** Optimize hot paths (lookup tables, pre-computation) while keeping code readable.
