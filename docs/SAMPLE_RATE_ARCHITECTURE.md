# Sample Rate Architecture

> **Status:** Current implementation works fine. This document outlines potential improvements for future consideration.

## Current State (2026-02-05)

### How It Works Now

```javascript
// signals.js
kanon('sine', (mem, idx) => ({
  update: (sr) => {
    //      ^^-- Sample rate passed 48,000 times/second
    mem[idx] = (mem[idx] + 440/sr) % 1.0;  // Division every sample
    return [Math.sin(mem[idx] * TAU)];
  }
}));
```

**Characteristics:**
- ✅ Works correctly
- ✅ Simple to understand
- ⚠️ Passes `sr` 48,000 times/second (constant value)
- ⚠️ Division computed 48,000 times/second

---

## Proposed Improvement

### Factory Pattern with Pre-Computed Phase Increment

```javascript
// signals.js
kanon('sine', (mem, idx, sr) => {
  //                       ^^-- Sample rate passed ONCE to factory
  const phaseInc = 440 / sr;  // Division computed ONCE

  return {
    update: () => {
      //      No sr parameter!
      mem[idx] = (mem[idx] + phaseInc) % 1.0;  // Just addition
      return [Math.sin(mem[idx] * TAU)];
    }
  };
});
```

**Benefits:**
1. **Performance:** Division once vs. 48k times/sec
2. **Cleaner separation:** Setup (factory) vs. execution (update)
3. **Simpler hot path:** Update function has fewer operations
4. **JACK ready:** Sample rate comes from backend, not hardcoded

---

## Performance Analysis

### Single Signal

**Current (division in update):**
```
48,000 samples/sec × 10-40 cycles/division = 480k - 1.9M cycles/sec
On 3GHz CPU: 0.016% - 0.064% of one core
```

**Proposed (pre-computed):**
```
1 division at startup + 48,000 additions/sec
On 3GHz CPU: ~0.016% of one core (addition is ~1 cycle)
```

**Verdict for 1 signal:** Negligible difference

### Many Signals (e.g., 50 signals)

**Current:**
```
50 signals × 48k samples/sec × 10-40 cycles = 24M - 96M cycles/sec
On 3GHz CPU: 0.8% - 3.2% of one core
```

**Proposed:**
```
50 divisions at startup + 50 × 48k additions/sec
On 3GHz CPU: ~0.8% of one core
```

**Verdict for 50 signals:** Noticeable improvement (2-4x faster hot path)

### When It Matters

| Scenario | Current | Proposed | Recommendation |
|----------|---------|----------|----------------|
| 1-10 signals | Fine | Slightly better | Either works |
| 10-50 signals | Fine | Noticeably better | Consider migrating |
| 50+ signals | Might struggle | Much better | Migrate |
| Complex DSP per signal | Every cycle counts | Cleaner hot path | Migrate |

---

## Backend Abstraction

### Problem: Leaky Abstraction

**Bad (what we want to avoid):**
```javascript
// User has to know about JACK
const jackSR = jack.getSampleRate();
kanon('sine', (mem, idx, sr) => { ... }, jackSR);  // Ugly!
```

### Solution: Backend Sets Sample Rate Automatically

```javascript
// transport.js - Backend determines SR
export const SAMPLE_RATE = (() => {
  const backend = process.env.AUDIO_BACKEND || 'speaker';

  switch (backend) {
    case 'speaker':
      return 48000;

    case 'jack':
      const jack = require('jack-connector');
      return jack.getSampleRate();  // Query ONCE at startup

    default:
      return 48000;
  }
})();
```

```javascript
// flux.js - Automatically uses backend's SR
import { SAMPLE_RATE } from './transport.js';

export function kanon(id, factory) {
  const idx = hash(id);
  const signal = factory(globalThis.KANON_STATE, idx, SAMPLE_RATE);
  //                                                  ^^^^^^^^^^^^
  registry.set(id, signal);
}
```

```javascript
// signals.js - User code never changes!
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;  // sr automatically set by backend
  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [Math.sin(mem[idx] * TAU)];
    }
  };
});
```

**To switch backends:**
```bash
# speaker.js (default)
$ bun index.js

# JACK
$ AUDIO_BACKEND=jack bun index.js

# signals.js stays the same!
```

---

## Key Insights

### Sample Rate is Constant

Sample rate **never changes during performance:**
- Set once when audio backend starts
- Constant for entire session
- To change: Stop backend, reconfigure, restart

**Why query it?** Different users configure different rates:
- 44100 Hz (CD quality)
- 48000 Hz (professional standard)
- 96000 Hz (high-resolution)
- 192000 Hz (audiophile)

**JACK allows user choice.** Your code queries once and respects it.

### It's a Constant, Not a Variable

Think of sample rate like screen resolution:
```javascript
// Query ONCE at startup
const SCREEN_WIDTH = window.innerWidth;

// Use throughout app (never changes)
function draw() {
  ctx.fillRect(0, 0, SCREEN_WIDTH, 100);
}
```

Same with sample rate:
```javascript
// Query ONCE at startup
const SAMPLE_RATE = detectSampleRate();

// Use throughout performance (never changes)
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;  // Computed once
  return { update: () => { /* ... */ } };
});
```

---

## Migration Path

### Phase 1: Current State (Working)
```javascript
kanon('sine', (mem, idx) => ({
  update: (sr) => {
    mem[idx] = (mem[idx] + 440/sr) % 1.0;
    return [Math.sin(mem[idx] * TAU)];
  }
}));
```

**Status:** ✅ Works fine for now

### Phase 2: Pre-Compute Phase Increment (Better)
```javascript
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;
  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [Math.sin(mem[idx] * TAU)];
    }
  };
});
```

**When to do:** When adding JACK support or when >20 signals

### Phase 3: Backend Abstraction (JACK Ready)
```javascript
// transport.js
export const SAMPLE_RATE = detectBackendSampleRate();

// flux.js
export function kanon(id, factory) {
  const signal = factory(mem, idx, SAMPLE_RATE);
  registry.set(id, signal);
}

// signals.js (unchanged)
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;
  return { update: () => { /* ... */ } };
});
```

**When to do:** Before adding JACK backend

---

## Code Examples

### Current Pattern
```javascript
kanon('fm-synth', (mem, idx) => ({
  update: (sr) => {
    // All setup happens 48k times/sec
    const carrierFreq = 440;
    const modFreq = 6;

    // Division every sample
    mem[idx] = (mem[idx] + carrierFreq/sr) % 1.0;
    mem[idx+1] = (mem[idx+1] + modFreq/sr) % 1.0;

    const mod = Math.sin(mem[idx+1] * TAU) * 100;
    return [Math.sin((mem[idx] * TAU) + mod) * 0.5];
  }
}));
```

### Proposed Pattern
```javascript
kanon('fm-synth', (mem, idx, sr) => {
  // Setup ONCE
  const carrierFreq = 440;
  const modFreq = 6;
  const carrierInc = carrierFreq / sr;  // Division once
  const modInc = modFreq / sr;          // Division once

  return {
    update: () => {
      // Hot path: just addition
      mem[idx] = (mem[idx] + carrierInc) % 1.0;
      mem[idx+1] = (mem[idx+1] + modInc) % 1.0;

      const mod = Math.sin(mem[idx+1] * TAU) * 100;
      return [Math.sin((mem[idx] * TAU) + mod) * 0.5];
    }
  };
});
```

**Difference:** 2 divisions once vs. 96,000 divisions/sec

---

## Decision Matrix

### Keep Current If:
- ✅ You have < 20 signals
- ✅ Performance is fine
- ✅ Not adding JACK yet
- ✅ Simplicity > optimization

### Migrate If:
- ✅ Adding JACK support
- ✅ Have 50+ signals
- ✅ Want cleaner architecture
- ✅ Experiencing CPU issues
- ✅ Want explicit backend abstraction

---

## Future Considerations

### When Adding JACK

1. **Create backend abstraction:**
   - `transport.js` exports `SAMPLE_RATE`
   - Detects backend at startup
   - Queries JACK's sample rate

2. **Update flux.js:**
   - Import `SAMPLE_RATE` from transport
   - Pass to factory, not update

3. **signals.js unchanged:**
   - User code stays the same
   - Works with any backend

### When Optimizing

1. **Profile first:**
   - Measure actual CPU usage
   - Identify real bottlenecks
   - Don't optimize prematurely

2. **Consider pre-computation:**
   - Phase increments
   - Filter coefficients
   - Wavetables
   - Envelope shapes

3. **Keep it simple:**
   - Optimization should clarify, not complicate
   - Profile before and after
   - Document why you optimized

---

## Summary

**Current state:** Works fine, simple, understandable

**Proposed improvement:** Pre-compute in factory, pass SR once

**When to change:** Adding JACK or scaling to many signals

**Key principle:** Backend should be invisible to user code

**Performance impact:**
- Small for few signals
- Noticeable for many signals
- But also cleaner architecture regardless

---

## References

- Division latency on modern CPUs: 10-40 cycles (with pipelining)
- Addition latency: ~1 cycle
- JACK sample rate configuration: Set at server startup, constant during session
- Factory pattern benefits: Setup once, execute many times

---

**Last updated:** 2026-02-05
**Status:** Current implementation sufficient, migration optional
