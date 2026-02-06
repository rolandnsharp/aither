# State Management Best Practices

> **Philosophy:** Direct memory access for performance. Named constants for clarity. No abstraction in the hot path.

## Table of Contents

1. [Why Direct Memory Access](#why-direct-memory-access)
2. [The Getter/Setter Anti-Pattern](#the-gettersetter-anti-pattern)
3. [Named Constants Pattern](#named-constants-pattern)
4. [Complete Examples](#complete-examples)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## Why Direct Memory Access

### The Foundation: Float64Array

```javascript
globalThis.KANON_STATE = new Float64Array(1024);
```

**Why this specific choice?**

| Feature | Float64Array | Object/Map | Getter/Setter |
|---------|-------------|------------|---------------|
| **Access speed** | 1-2 cycles | 10-20 cycles | 20-30 cycles |
| **Memory layout** | Contiguous | Scattered | Scattered + overhead |
| **GC pressure** | Zero | High | Medium |
| **SharedArrayBuffer** | ✅ Yes | ❌ No | ⚠️ Inefficient |
| **Atomic ops** | ✅ Yes | ❌ No | ❌ No |
| **Predictable** | ✅ Yes | ⚠️ Maybe | ⚠️ Maybe |

**At 48kHz audio:**
- Direct access: ~2ms per million operations
- Getter/setter: ~20-30ms per million operations
- **10-15x difference matters** when running 48,000 times/second

---

## The Getter/Setter Anti-Pattern

### ❌ Don't Do This

```javascript
// ANTI-PATTERN: Wrapping memory in getters/setters
kanon('sine', (mem, idx) => {
  // Creating wrapper objects
  const phase = {
    get val() { return mem[idx]; },
    set val(v) { mem[idx] = v; }
  };

  const filter = {
    get z1() { return mem[idx + 1]; },
    set z1(v) { mem[idx + 1] = v; }
  };

  return {
    update: () => {
      // Looks clean, but 10x slower!
      phase.val = (phase.val + phaseInc) % 1.0;
      filter.z1 = phase.val * 0.5;
      return [Math.sin(phase.val * TAU)];
    }
  };
});
```

### Why This Is Bad

**1. Performance Cost:**
```
Direct:  mem[idx] = value     → 1-2 CPU cycles
Getter:  phase.val = value    → 20-30 CPU cycles (property lookup + function calls)

At 48kHz: 10-15x more CPU usage per signal
```

**2. Defeats Float64Array Benefits:**
- You chose typed arrays for speed → getters make them slow
- You chose typed arrays for predictability → getters add indirection
- You chose typed arrays for zero GC → getters create object overhead

**3. Not Actually Cleaner:**
```javascript
// You still need to:
const phase = { get val() { return mem[idx] }, ... };  // Define wrapper
const filter = { get z1() { return mem[idx+1] }, ... }; // For each slot
const envelope = { get level() { return mem[idx+2] }, ... }; // More boilerplate

// Compare to:
const PHASE = idx;          // One line
const FILTER_Z1 = idx + 1;  // Clear
const ENV_LEVEL = idx + 2;  // No overhead
```

**4. Doesn't Solve "Spaghetti":**
```javascript
// You still need to manage indices:
const phase = { get val() { return mem[idx] }, ... };     // idx
const filter = { get val() { return mem[idx + 1] }, ... }; // idx + 1
const chaos = { get val() { return mem[idx + 500] }, ... }; // idx + 500

// Named constants are clearer:
const STATE = {
  PHASE: idx,
  FILTER: idx + 1,
  CHAOS_MOD: idx + 500  // Explicit cross-modulation
};
```

---

## Named Constants Pattern

### ✅ The Right Way

```javascript
kanon('fm-synth', (mem, idx, sr) => {
  // 1. Define state layout (zero runtime cost)
  const STATE = {
    CARRIER_PHASE: idx,
    MOD_PHASE: idx + 1,
    FILTER_Z1: idx + 2,
    FILTER_Z2: idx + 3,
    ENV_LEVEL: idx + 4,
    ENV_STAGE: idx + 5,
  };

  // 2. Pre-compute constants
  const carrierInc = 440 / sr;
  const modInc = 6 / sr;

  // 3. Hot path: direct access with semantic names
  return {
    update: () => {
      // Phase accumulation - clear intent
      mem[STATE.CARRIER_PHASE] = (mem[STATE.CARRIER_PHASE] + carrierInc) % 1.0;
      mem[STATE.MOD_PHASE] = (mem[STATE.MOD_PHASE] + modInc) % 1.0;

      // FM synthesis - readable and fast
      const modAmount = Math.sin(mem[STATE.MOD_PHASE] * TAU) * 100;
      const carrierPhase = mem[STATE.CARRIER_PHASE] * TAU + modAmount;
      const sample = Math.sin(carrierPhase);

      // Filter - clear state management
      const alpha = 0.1;
      const filtered = alpha * sample + (1 - alpha) * mem[STATE.FILTER_Z1];
      mem[STATE.FILTER_Z1] = filtered;

      return [filtered * mem[STATE.ENV_LEVEL]];
    }
  };
});
```

### Why This Works

**1. Semantic Clarity:**
```javascript
mem[STATE.CARRIER_PHASE]  // Clear: this is the carrier phase
vs
mem[idx]                   // Unclear: what is this?
```

**2. Zero Performance Cost:**
```javascript
const CARRIER_PHASE = idx;  // Compiled away by JIT
mem[CARRIER_PHASE] = ...    // Identical to mem[idx] at runtime
```

**3. Easy Refactoring:**
```javascript
// Change allocation in one place:
const STATE = {
  CARRIER_PHASE: idx + 10,  // Changed from idx to idx + 10
  // Everything else updates automatically
};
```

**4. Self-Documenting:**
```javascript
const STATE = {
  OSC1_PHASE: idx,
  OSC2_PHASE: idx + 1,
  OSC3_PHASE: idx + 2,
  // Now clear you have 3 oscillators

  FILTER_Z1: idx + 3,
  FILTER_Z2: idx + 4,
  // Two-pole filter state

  DELAY_BUFFER_START: idx + 10,  // Reserve 10-100 for delay
  // 90 slots for delay line
};
```

---

## Complete Examples

### Simple Oscillator

```javascript
kanon('sine', (mem, idx, sr) => {
  // State layout
  const STATE = {
    PHASE: idx,
  };

  // Constants
  const freq = 440;
  const phaseInc = freq / sr;

  return {
    update: () => {
      // Update state
      mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;

      // Generate output
      return [Math.sin(mem[STATE.PHASE] * TAU) * 0.5];
    }
  };
});
```

### Complex Synth with Multiple Modules

```javascript
kanon('complex-synth', (mem, idx, sr) => {
  // State layout - organized by module
  const STATE = {
    // Oscillators (0-9)
    OSC1_PHASE: idx,
    OSC2_PHASE: idx + 1,
    OSC3_PHASE: idx + 2,
    LFO1_PHASE: idx + 3,
    LFO2_PHASE: idx + 4,

    // Filter (10-14)
    FILTER_Z1: idx + 10,
    FILTER_Z2: idx + 11,
    FILTER_Z3: idx + 12,
    FILTER_Z4: idx + 13,

    // Envelope (15-19)
    ENV_STAGE: idx + 15,  // 0=idle, 1=attack, 2=decay, 3=sustain, 4=release
    ENV_LEVEL: idx + 16,
    ENV_COUNTER: idx + 17,

    // Effects (20-99)
    REVERB_BUFFER_START: idx + 20,  // 80 slots for reverb

    // Modulation (100+)
    MOD_MATRIX_START: idx + 100,
  };

  // Pre-computed constants
  const osc1Inc = 440 / sr;
  const osc2Inc = 443 / sr;  // Detuned
  const lfo1Inc = 6 / sr;
  const attackRate = 1000 / sr;  // 1000 samples attack

  return {
    update: () => {
      // === LFO ===
      mem[STATE.LFO1_PHASE] = (mem[STATE.LFO1_PHASE] + lfo1Inc) % 1.0;
      const lfo = Math.sin(mem[STATE.LFO1_PHASE] * TAU);

      // === Oscillators ===
      mem[STATE.OSC1_PHASE] = (mem[STATE.OSC1_PHASE] + osc1Inc) % 1.0;
      mem[STATE.OSC2_PHASE] = (mem[STATE.OSC2_PHASE] + osc2Inc) % 1.0;

      const osc1 = Math.sin(mem[STATE.OSC1_PHASE] * TAU);
      const osc2 = Math.sin(mem[STATE.OSC2_PHASE] * TAU);
      const mixed = (osc1 + osc2) * 0.5;

      // === Filter with LFO modulation ===
      const cutoff = 0.1 + lfo * 0.05;  // LFO modulates cutoff
      const filtered = cutoff * mixed + (1 - cutoff) * mem[STATE.FILTER_Z1];
      mem[STATE.FILTER_Z1] = filtered;

      // === Envelope ===
      const stage = mem[STATE.ENV_STAGE];
      let level = mem[STATE.ENV_LEVEL];

      if (stage === 1) {  // Attack
        level = Math.min(1.0, level + attackRate);
        if (level >= 1.0) mem[STATE.ENV_STAGE] = 2;
      }

      mem[STATE.ENV_LEVEL] = level;

      // === Output ===
      return [filtered * level * 0.5];
    }
  };
});
```

### Cross-Signal Modulation ("Surgery")

```javascript
// Signal A: Carrier
kanon('carrier', (mem, idx, sr) => {
  const STATE = {
    PHASE: idx,
    EXTERNAL_MOD_SLOT: 500,  // Read from signal B
  };

  const baseFreq = 440;
  const baseInc = baseFreq / sr;

  return {
    update: () => {
      // Read external modulation from another signal
      const externalMod = mem[STATE.EXTERNAL_MOD_SLOT];

      // Modulate frequency
      const modInc = baseInc * (1 + externalMod * 0.1);
      mem[STATE.PHASE] = (mem[STATE.PHASE] + modInc) % 1.0;

      return [Math.sin(mem[STATE.PHASE] * TAU) * 0.5];
    }
  };
});

// Signal B: Modulator (writes to slot 500)
kanon('modulator', (mem, idx, sr) => {
  const STATE = {
    PHASE: idx,
    OUTPUT_SLOT: 500,  // Write here for signal A to read
  };

  const lfoInc = 6 / sr;

  return {
    update: () => {
      mem[STATE.PHASE] = (mem[STATE.PHASE] + lfoInc) % 1.0;
      const lfo = Math.sin(mem[STATE.PHASE] * TAU);

      // Write to shared slot for cross-modulation
      mem[STATE.OUTPUT_SLOT] = lfo;

      return [0];  // Silent (modulation only)
    }
  };
});
```

---

## Performance Benchmarks

### Test Setup

```javascript
const mem = new Float64Array(1000);
const idx = 0;
const iterations = 10_000_000;  // 10 million operations

// Direct access
console.time('direct');
for (let i = 0; i < iterations; i++) {
  mem[idx] = (mem[idx] + 0.01) % 1.0;
}
console.timeEnd('direct');

// Named constant
const PHASE = idx;
console.time('named-constant');
for (let i = 0; i < iterations; i++) {
  mem[PHASE] = (mem[PHASE] + 0.01) % 1.0;
}
console.timeEnd('named-constant');

// Getter/setter
const phase = {
  get val() { return mem[idx]; },
  set val(v) { mem[idx] = v; }
};
console.time('getter-setter');
for (let i = 0; i < iterations; i++) {
  phase.val = (phase.val + 0.01) % 1.0;
}
console.timeEnd('getter-setter');
```

### Results (Typical)

```
direct:         ~20-30ms
named-constant: ~20-30ms  (identical - JIT inlines)
getter-setter:  ~200-300ms (10-15x slower!)
```

### Real-World Impact

**50 signals, 4 state slots each, 48kHz:**

| Approach | Cycles/sec | % of 3GHz CPU |
|----------|------------|---------------|
| Direct access | 19.2M | 0.64% |
| Named constants | 19.2M | 0.64% |
| Getter/setter | 288M | 9.6% |

**Verdict:** Named constants have zero cost. Getters/setters have 15x cost.

---

## Best Practices

### 1. Organize State by Module

```javascript
const STATE = {
  // Group related state together
  // Oscillator module (0-9)
  OSC_PHASE: idx,
  OSC_DETUNE: idx + 1,

  // Filter module (10-19)
  FILTER_Z1: idx + 10,
  FILTER_Z2: idx + 11,
  FILTER_CUTOFF: idx + 12,

  // Effects (20-99)
  DELAY_BUFFER: idx + 20,  // Reserve range
};
```

### 2. Document Slot Ranges

```javascript
const STATE = {
  // Oscillators: 0-9 (10 slots)
  OSC1_PHASE: idx,
  OSC2_PHASE: idx + 1,
  // ... up to idx + 9

  // Delay line: 10-109 (100 slots for 2ms @ 48kHz)
  DELAY_START: idx + 10,
  DELAY_END: idx + 109,

  // Filters: 110-119 (10 slots)
  FILTER_START: idx + 110,
};
```

### 3. Use Descriptive Names

```javascript
// ❌ Bad: Unclear
const STATE = {
  A: idx,
  B: idx + 1,
  C: idx + 2,
};

// ✅ Good: Self-documenting
const STATE = {
  CARRIER_PHASE: idx,
  MODULATOR_PHASE: idx + 1,
  FILTER_STATE: idx + 2,
};
```

### 4. Pre-Compute in Factory

```javascript
kanon('sine', (mem, idx, sr) => {
  // ✅ Compute once in factory
  const freq = 440;
  const phaseInc = freq / sr;

  const STATE = { PHASE: idx };

  return {
    update: () => {
      // ✅ Use pre-computed value
      mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
      return [Math.sin(mem[STATE.PHASE] * TAU) * 0.5];
    }
  };
});
```

### 5. Comment Complex State Logic

```javascript
const STATE = {
  // Envelope state machine:
  // 0 = idle, 1 = attack, 2 = decay, 3 = sustain, 4 = release
  ENV_STAGE: idx,

  // Current envelope level (0.0 - 1.0)
  ENV_LEVEL: idx + 1,

  // Sample counter for timing (reset per stage)
  ENV_COUNTER: idx + 2,
};
```

### 6. Avoid Magic Numbers

```javascript
// ❌ Bad: What is 500?
const externalMod = mem[idx + 500];

// ✅ Good: Named constant
const STATE = {
  PHASE: idx,
  CROSS_MOD_INPUT: idx + 500,  // Reads modulation from signal B
};
const externalMod = mem[STATE.CROSS_MOD_INPUT];
```

### 7. Keep Hot Path Simple

```javascript
return {
  update: () => {
    // ✅ Do this: Simple, direct operations
    mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
    const sample = Math.sin(mem[STATE.PHASE] * TAU);
    mem[STATE.FILTER] = sample * 0.5;
    return [mem[STATE.FILTER]];

    // ❌ Avoid this: Complex logic in hot path
    if (someCondition) {
      const temp = calculateSomething();
      for (let i = 0; i < 10; i++) {
        // ...
      }
    }
  }
};
```

---

## Common Pitfalls

### Pitfall 1: Creating Objects in Update

```javascript
// ❌ WRONG: Creates garbage 48k times/second
update: () => {
  const temp = { phase: 0, freq: 440 };  // GC nightmare!
  // ...
}

// ✅ RIGHT: Use memory array
update: () => {
  mem[STATE.TEMP_PHASE] = 0;
  mem[STATE.TEMP_FREQ] = 440;
  // ...
}
```

### Pitfall 2: Forgetting to Update State

```javascript
// ❌ WRONG: Reading state but not writing back
update: () => {
  const phase = mem[STATE.PHASE];
  const newPhase = (phase + phaseInc) % 1.0;
  // Forgot to write back!
  return [Math.sin(newPhase * TAU)];
}

// ✅ RIGHT: Write state back
update: () => {
  mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
  return [Math.sin(mem[STATE.PHASE] * TAU)];
}
```

### Pitfall 3: Index Collision

```javascript
// ❌ WRONG: Two signals, same indices
kanon('signal-a', (mem, idx) => {
  const STATE = { PHASE: idx };
  // Uses mem[idx]
});

kanon('signal-b', (mem, idx) => {
  const STATE = { PHASE: idx };
  // Also uses mem[idx] - COLLISION!
});

// ✅ RIGHT: Hash gives different indices per ID
kanon('signal-a', (mem, idx) => {  // idx = hash('signal-a') = 237
  const STATE = { PHASE: idx };
});

kanon('signal-b', (mem, idx) => {  // idx = hash('signal-b') = 419
  const STATE = { PHASE: idx };
});
```

### Pitfall 4: Division in Hot Path

```javascript
// ❌ WRONG: Division 48k times/second
update: (sr) => {
  mem[STATE.PHASE] = (mem[STATE.PHASE] + 440/sr) % 1.0;
  //                                      ^^^^^^ 48k divisions!
}

// ✅ RIGHT: Pre-compute in factory
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;  // Once

  return {
    update: () => {
      mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
      //                                      ^^^^^^^^ Just addition
    }
  };
});
```

### Pitfall 5: String Keys Instead of Constants

```javascript
// ❌ WRONG: String lookup overhead
const state = {};
update: () => {
  state['phase'] = (state['phase'] || 0) + 0.01;
  //    ^^^^^^^  Property lookup every time
}

// ✅ RIGHT: Numeric constants
const STATE = { PHASE: idx };
update: () => {
  mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
  //  ^^^^^^^^^^^  Direct memory access
}
```

---

## Summary: The Golden Rules

### DO ✅

1. **Use Float64Array** for state storage
2. **Use named constants** for semantic clarity
3. **Pre-compute** in factory, not in update
4. **Direct memory access** in hot path
5. **Comment** state layout and magic indices
6. **Group** related state logically
7. **Document** slot ranges and reservations

### DON'T ❌

1. **Don't use getters/setters** (10x slower)
2. **Don't create objects** in update (GC pressure)
3. **Don't use object/Map** for state (slower, no SharedArrayBuffer)
4. **Don't divide** in hot path (pre-compute)
5. **Don't use magic numbers** (use named constants)
6. **Don't forget** to write state back
7. **Don't optimize prematurely** (but know the cost)

---

## Quick Reference

### Template: Simple Signal

```javascript
kanon('my-signal', (mem, idx, sr) => {
  // 1. State layout
  const STATE = {
    PHASE: idx,
    FILTER: idx + 1,
  };

  // 2. Constants
  const freq = 440;
  const phaseInc = freq / sr;

  // 3. Hot path
  return {
    update: () => {
      mem[STATE.PHASE] = (mem[STATE.PHASE] + phaseInc) % 1.0;
      const sample = Math.sin(mem[STATE.PHASE] * TAU);
      mem[STATE.FILTER] = sample * 0.9 + mem[STATE.FILTER] * 0.1;
      return [mem[STATE.FILTER]];
    }
  };
});
```

### Template: Complex Signal

```javascript
kanon('complex', (mem, idx, sr) => {
  // 1. State layout (organized by module)
  const STATE = {
    // Module A (0-9)
    MODULE_A_START: idx,
    // ...

    // Module B (10-19)
    MODULE_B_START: idx + 10,
    // ...
  };

  // 2. Pre-computed constants
  const constantA = valueA / sr;
  const constantB = valueB / sr;

  // 3. Helper functions (outside hot path)
  const processModule = (input) => {
    // Complex logic extracted
    return output;
  };

  // 4. Hot path (simple, direct)
  return {
    update: () => {
      // State updates
      mem[STATE.MODULE_A_START] = ...;

      // Processing
      const result = processModule(mem[STATE.MODULE_A_START]);

      // Output
      return [result];
    }
  };
});
```

---

## Further Reading

- **SAMPLE_RATE_ARCHITECTURE.md** - Sample rate handling patterns
- **BEYOND-LISP.md** - Metaprogramming and symbolic compilation
- **KANON-FLUX-DUALITY.md** - Philosophical foundations

---

**Last updated:** 2026-02-05
**Key principle:** Direct access for speed. Named constants for clarity. No abstraction in the hot path.
