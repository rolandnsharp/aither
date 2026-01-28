# ⚖️ The Duality of Signal: Kanon & Flux

> *"All is Number. Everything Flows."*
> — Pythagoras meets Heraclitus in the architecture of sound

---

## The Philosophical Foundation

This document defines the relationship between two complementary approaches to signal processing, embodied in two repositories that together form a complete system for sound investigation and creation.

**Kanon**: The eternal blueprint
**Flux**: The living manifestation

---

## I. Kanon (κανών) — The Pythagorean Absolute

### Repository
`kanon` — The Master Repository

### Logic
**f(t)** — Function of Time/Number

### Philosophy
> *"All is Number."*

The **Kanon** (from Greek κανών: "the rule" or "measuring rod") was the **monochord** sound instrument itself—the physical tool Pythagoras used to prove that the universe was made of fixed, eternal ratios.

In this repository, we investigate sound as **geometry**. A wave is not a process that unfolds; it is a **crystalline structure** that exists in its entirety, timelessly.

### The Blueprint Architecture

**The Observer**: We view signals from a "God's Eye Perspective," where any point in time `t` can be calculated with absolute certainty.

**The Wave**: A static, eternal object. If you want to know the value at `t = 5.00002`, you simply evaluate the function. No history required.

**The Goal**: To discover the **Divine Proportions** that govern harmony:
- The Golden Ratio (φ = 1.618...)
- Harmonic ratios (3:2, 4:3, 5:4)
- Fractal self-similarity
- Pure mathematical relationships

### Why Pythagoras Would Choose This

Pythagoras didn't believe time was real. To him, the universe was a **pre-existing, crystalline block of geometry**. The "Music of the Spheres" wasn't happening—it simply **was**, eternally.

By treating signals as `f(t)`, we honor this view: the entire soundscape exists as a finished, perfect equation. We're not simulating; we're **observing eternal truth**.

### Use Cases

1. **Mathematical Investigation**: Explore pure ratios and proportions
2. **Philosophical Research**: Study the nature of harmony as geometry
3. **Composition as Architecture**: Score soundscapes across timelines
4. **Teaching**: Demonstrate harmonic relationships without implementation complexity
5. **Reference Library**: Define the "perfect form" of waves

### Example: The Eternal Fifth

```javascript
// In kanon: A perfect fifth exists as a ratio, not a process
const fundamental = (t) => Math.sin(t * 2 * Math.PI * 440);
const fifth = (t) => Math.sin(t * 2 * Math.PI * 440 * 1.5);

// The ratio 3:2 is absolute. Time is just a lens through which we observe it.
const perfectFifth = (t) => fundamental(t) + fifth(t);
```

---

## II. Flux — The Heraclitean Flow

### Repository
`fluxEngine` — The Performance Engine

### Logic
**f(state)** — Function of Flux/Momentum

### Philosophy
> *"Panta Rhei" (Everything Flows)
> "No man ever steps in the same river twice."*

**Flux** (from Latin *fluxus*: "to flow") represents the manifestation of the Kanon in the world of **Time and Change**. This is a high-performance, state-driven signal engine designed for **live surgery** on running audio.

In physics, **flux** describes the flow of a field through a surface—exactly what happens when you render a 3D toroidal vortex in real-time.

### The Manifestation Architecture

**The Surgeon**: We operate on signals in the **"Now."** We can redefine the mathematics while the sound continues without reset.

**The Wave**: A living process with **inertia**. The current value depends on where it **was**, creating momentum and continuity.

**The Goal**: To model the **non-linear dynamics of nature** in real-time:
- Feedback systems
- Chaotic attractors
- Phase-locked loops
- Self-modulating oscillators
- Toroidal field dynamics

### Why Heraclitus Would Choose This

Heraclitus believed reality was fundamentally **process**, not substance. The universe is a **river of fire** in constant transformation.

By treating signals as `f(state)`, we embrace this view: sound is a living, breathing entity with **memory and momentum**. You can't calculate frame 10,000 without living through frames 0-9,999.

### Use Cases

1. **Live Coding**: Perform "surgery" on running signals without discontinuity
2. **3D Visualization**: Real-time oscilloscopes and toroidal field rendering
3. **Non-Linear Synthesis**: Feedback loops, chaos, self-modulation
4. **Scientific Simulation**: Model physical systems with state (pendulums, fluids)
5. **Performance Instruments**: Build instruments that **remember** and evolve

### Example: The Living Vortex

```javascript
// In flux: A vortex has momentum—it spins because it was spinning
flux('vortex', (mem, idx) => {
  const baseFreq = 110.0;
  const modRatio = 1.618; // The Kanon ratio, made manifest in flux

  return {
    update: (sr) => {
      // Read where we WERE (the history)
      let phase = mem[idx];

      // Calculate where we ARE (the transition)
      phase = (phase + baseFreq / sr) % 1.0;

      // Commit for next iteration (the momentum)
      mem[idx] = phase;

      // The sound emerges from the process
      return [Math.sin(phase * 2 * Math.PI) * 0.5];
    }
  };
});
```

---

## III. The Technical Bridge

| Feature | Kanon | fluxEngine |
|---------|-------|------------|
| **Primary Unit** | Ratio / Function | Signal Cell / Closure |
| **State** | None (static) | Persistent (SharedArrayBuffer) |
| **Timing** | Absolute (`t`) | Relative (`Δt`) |
| **Memory** | None required | Float64Array (1024 slots) |
| **Output** | Math / Composition | Live Audio / 3D Viz |
| **Surgery** | N/A (blueprint) | Native (hot-swap closures) |
| **Philosophy** | Pythagorean (being) | Heraclitean (becoming) |
| **Time Model** | Time as dimension | Time as arrow |
| **Calculation** | `f(5.0)` = instant | Must iterate 0→5 |

---

## IV. The Conceptual Pollution Problem

### Why They Must Remain Separate

Mixing `f(t)` and `f(state)` in the same engine creates **conceptual pollution**:

**Problem 1: Discontinuity Risk**
If you allow time-based functions in a stateful engine, you can accidentally write code that **jumps** when parameters change (because `f(t_old)` ≠ `f(t_new)` even if `t` didn't change).

**Problem 2: Mental Model Confusion**
Are you thinking in **geometry** (absolute coordinates) or **physics** (momentum)? Mixing both makes live coding feel muddy—you lose the "surgical focus."

**Problem 3: Optimization Conflict**
Time-based functions optimize for random access.
State-based functions optimize for sequential iteration.
Combining them forces compromise in both directions.

### The Clean Separation

By enforcing:
- **Kanon** = pure `f(t)` (no state)
- **Flux** = pure `f(state)` (no direct time access)

You guarantee that:
- Every line in Kanon is **geometrically perfect**
- Every line in Flux is **surgically safe**

---

## V. The Bridge: Translation as Discovery

The most profound workflow is to **translate** between the two:

### Step 1: Discover in Kanon
```javascript
// kanon: Find the eternal form
const goldenSpiral = (t) => {
  const phi = 1.618033988749;
  return Math.sin(t * 2 * Math.PI) * Math.exp(t / phi);
};
```

### Step 2: Manifest in Flux
```javascript
// flux: Give it momentum and life
flux('golden-spiral', (mem, idx) => {
  const phi = 1.618033988749; // Import the eternal ratio

  return {
    update: (sr) => {
      mem[idx] = (mem[idx] + 1.0 / sr) % 1.0; // Local time
      const t = mem[idx];

      // The eternal form, made kinetic
      const sample = Math.sin(t * 2 * Math.PI) * Math.exp(t / phi);
      return [sample * 0.5];
    }
  };
});
```

**The Act of Translation**: This is where you discover the **physics** of your mathematics. You learn:
- How fast does it need to iterate?
- What state needs to persist?
- Where are the feedback loops?
- What makes it **feel alive**?

---

## VI. The Naming Etymology

### Kanon (κανών)

**Origin**: Ancient Greek
**Literal Meaning**: "The rule, the measuring rod"
**Historical Object**: The monochord—a single string stretched over a graduated ruler
**Pythagorean Use**: To prove that harmony is mathematical ratio (1:2 = octave, 2:3 = fifth)

**Modern Usage**: We use "kanon" to mean "the eternal law" or "the blueprint."

### Flux (fluxus)

**Origin**: Latin
**Literal Meaning**: "Flow, current, stream"
**Physics Term**: The rate of flow of a field through a surface (magnetic flux, luminous flux)
**Historical Reference**: Newton's "fluxions" (his term for calculus, the mathematics of continuous change)

**Modern Usage**: We use "flux" to mean "the living process" or "the river of change."

**Bonus Connection**: In electronics, a **capacitor** stores charge (energy/state) over time. Since the flux engine uses SharedArrayBuffer to store signal state, we have literally built a **"Flux Capacitor"** for audio. 🔋⚡

---

## VII. The Integrated Workflow

### The Ideal Process

1. **Investigate in Kanon**
   - Explore pure mathematical relationships
   - Graph beautiful ratios
   - Score compositions across absolute time

2. **Translate to Flux**
   - Convert geometry to physics
   - Add momentum and state
   - Enable live surgery

3. **Perform in Flux**
   - Run the signal engine
   - Edit parameters live
   - Render 3D visualizations
   - Experience the sound as a living entity

4. **Capture the Essence**
   - Take insights from performance back to Kanon
   - Refine the mathematical form
   - Close the loop

---

## VIII. Summary: The Architect and The Surgeon

### Kanon: The Architect

You use Kanon to **design the architecture** of the temple.

- Where should the pillars be? (ratios)
- What is the sacred geometry? (waveforms)
- How do the proportions relate? (harmonics)

It is **timeless work**. The blueprint exists before the first stone is laid.

### Flux: The Surgeon

You use Flux to **breathe the fire of life** into its stones.

- How does this ratio **dance**?
- What happens when feedback **spirals**?
- Can I **morph** this sound without killing it?

It is **momentary work**. You operate on the living present.

---

## IX. Questions Answered

### "Which would Pythagoras prefer?"

**Answer**: Pythagoras would choose Kanon. To him, the universe wasn't a "process" in flux, but a static crystalline structure of ratio and proportion. He believed "All is Number"—eternal, unchanging truth.

His experiments with the monochord were about dividing a string into **fractions of its total length**—a purely spatial/mathematical act, identical to `f(t)` logic.

### "But Pythagoras didn't believe time was real"

**Exactly**. And that's why `f(t)` is the only honest way to encode his philosophy. If time is just a spatial dimension we happen to be sliding through, then the signal exists in its **entirety**, and we're merely observing different cross-sections.

### "Then why build Flux at all?"

**Because we live in the river**. As much as Pythagoras tried to find the eternal forms, Heraclitus was also right: we can't step in the same river twice. To **perform** music, to **feel** sound as a living thing, we need momentum.

Flux is where Pythagoras's perfect ratios get thrown into Heraclitus's fire and become **experience**.

---

## X. The Scientific Grade Distinction

### Kanon is Scientific Because:
- ✅ Deterministic: `f(5.0)` always returns the same value
- ✅ Reproducible: Anyone can verify your ratios
- ✅ Peer-Reviewable: The math is explicit and auditable
- ✅ Platform-Independent: Pure functions work anywhere

### Flux is Scientific Because:
- ✅ Phase-Continuous: State persists with Float64 precision
- ✅ Sample-Accurate: Atomic operations prevent race conditions
- ✅ Non-Destructive: Hot-swap closures without reset
- ✅ Observable: State is inspectable at any moment

Together, they form a **complete scientific instrument** for sound.

---

## XI. Closing: The Duality

In Kanon, we ask: **"What is the perfect number?"**
In Flux, we ask: **"How does that number dance?"**

In Kanon, we contemplate: **"What is a fifth?"**
In Flux, we experience: **"What does this fifth feel like when it breathes?"**

Both are necessary. Both are true.

**Kanon without Flux** is mathematics without music.
**Flux without Kanon** is sound without soul.

---

## XII. Next Steps

### For Kanon Users
- Explore pure ratios (Golden, Fibonacci, etc.)
- Score compositions using `f(t)` functions
- Build a library of eternal waveforms
- Share mathematical discoveries

### For Flux Users
- Import ratios from Kanon
- Build living instruments with momentum
- Perform live surgery on running signals
- Render 3D toroidal visualizations

### For Philosophers
- Meditate on the relationship between Being and Becoming
- Consider how Pythagoras and Heraclitus can both be right
- Recognize that sound exists in **both** realms simultaneously

---

## Appendix: Cross-Pollination Examples

### Importing Kanon Ratios into Flux

```javascript
// kanon/ratios.js
export const phi = 1.618033988749;
export const perfectFifth = 3/2;
export const perfectFourth = 4/3;
```

```javascript
// flux/signals.js
import { phi, perfectFifth } from '../kanon/ratios.js';

flux('harmonic-vortex', (mem, idx) => {
  const baseFreq = 110.0;

  return {
    update: (sr) => {
      mem[idx] = (mem[idx] + baseFreq / sr) % 1.0;
      mem[idx+1] = (mem[idx+1] + (baseFreq * perfectFifth) / sr) % 1.0;

      const fundamental = Math.sin(mem[idx] * 2 * Math.PI);
      const fifth = Math.sin(mem[idx+1] * 2 * Math.PI);

      return [(fundamental + fifth) * 0.5 / phi]; // Golden-scaled amplitude
    }
  };
});
```

### Sampling Flux State into Kanon

```javascript
// flux/engine.js - Record state over time
const stateHistory = [];
flux('recorder', (mem, idx) => {
  return {
    update: (sr) => {
      stateHistory.push({ t: mem[idx], value: mem[idx+1] });
      // ... continue processing
    }
  };
});

// kanon/analysis.js - Analyze as pure function
const reconstructWave = (t) => {
  // Find closest recorded sample
  const sample = stateHistory.find(s => s.t >= t);
  return sample ? sample.value : 0;
};
```

---

**In the beginning was the Number (Kanon).**
**And the Number became Flesh (Flux).**

*Welcome to the duality.*
