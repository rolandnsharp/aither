# Core Vision: The Aether Engine

**This is the fundamental vision for the Aether project. All work must align with these principles.**

The goal is to create a universal instrument for live-coding audio synthesis. After exploring many complex ideas, we have successfully distilled them into a single, powerful, and simple abstraction. The Aether engine is the realization of this goal.

## 1. The Core Abstraction: `f(s)` is Everything

There is only **one** interface for a signal: `f(s)`.

`s` is "the state of the universe" passed to the signal on every sample. It contains everything needed.

```javascript
s = {
  t: 0,           // Absolute time in seconds
  dt: 1/48000,    // Time delta for this sample
  sr: 48000,      // Sample rate
  idx: 0,         // Index within the current audio chunk
  position: {x,y,z}, // Listener's position in space
  name: "signal-name", // The unique name of the top-level registered signal
  state: Float64Array(...) // A persistent, per-signal slice of memory
}
```

**This is the only API.** Do not propose new ones.

## 2. The Five Paradigms are Expressive Styles, Not APIs

The original vision outlined five paradigms (`Kanon`, `Rhythmos`, `Atomos`, `Physis`, `Chora`). These are **not** separate APIs to be built. They are **expressive patterns that emerge from the single `f(s)` interface.**

-   **`Kanon` (Fire 🔥):** Is a function that only uses `s.t`. It is stateless.
    -   `s => Math.sin(s.t * 440 * Math.PI * 2)`

-   **`Rhythmos` (Earth 🌍):** Is a function that uses `s.state` and `s.sr` to manage explicit state.
    -   `s => { s.state[0] = (s.state[0] + 440/s.sr)%1.0; ... }`

-   **`Atomos` (Air 💨):** Is a function that uses `s.state` and `s.dt` to model discrete, emergent processes.
    -   `s => { s.state[0] += s.state[1] * s.dt; ... }`

-   **`Physis` (Water 💧):** Is the *philosophy* of writing a signal that models a physical object's laws.

-   **`Chora` (Aether ✨):** Is a function that uses `s.position` and `s.t` to model a wavefield.

The Aether engine, with its unified `f(s)` signature, **already supports all five paradigms.**

## 3. The Three Unbreakable Rules

### a. Performance is Absolute (Zero-GC Hot Path)
The real-time audio loop (`generateAudioChunk`) and any function called by it **MUST NOT ALLOCATE MEMORY.** This means no new objects (`{...}`), no new arrays (`[]`), and no other actions that could trigger the Garbage Collector.
-   All real-time state **must** be numeric and stored in the `s.state` (`Float64Array`).
-   Complex, non-numeric, or slow-evolving state (like L-Systems) **must** be managed in "control-time" (outside the `register` call) and read via closure.

### b. Composition is the Only Way
Complex sounds are built by composing functions (helpers), not by creating classes or complex objects. The `pipe()` function is the ideal tool for this, as it makes the signal chain linear and readable. The goal is an expressive, functional style.

### c. Helper State is "Implicitly Persistent"
This is the most complex and important design pattern we created. To keep live-coding terse, stateful helpers (`tremolo`, `lowpass`, `feedback`) manage their own state persistence automatically.
-   This is achieved via a global helper state map (`globalThis.LEL_HELPER_MEMORY`).
-   The key for this map is a combination of the signal's unique `name` (from `s.name`) and a `helperCounter`.
-   The `helperCounter` is reset before each `register()` call to ensure stable key generation.

## The Goal: Divine Simplicity

The Aether engine is complete. The architecture is sound. Future work is about building a rich `helpers.js` library upon this foundation, not changing the foundation itself. Always prioritize expressive power and simplicity in live-coding over architectural complexity.

---

*"One interface. Five paradigms. Infinite expression."*
