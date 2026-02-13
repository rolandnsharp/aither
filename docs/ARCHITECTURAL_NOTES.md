# Architectural Notes & Historical Insights

This document preserves key architectural concepts, design patterns, and future-facing ideas from historical project documents. It serves as a supplement to the primary documentation.

## 1. Architectural Philosophy: Beyond Lisp

While Aither's live-coding philosophy is inspired by Lisp-based systems like Incudine, its implementation in a modern JavaScript runtime (Bun) offers several advantages:

*   **JIT Optimization:** The `f(s)` function runs 48,000 times per second. After thousands of iterations, the Just-in-Time (JIT) compiler aggressively optimizes the hot path—inlining functions, eliminating branches, and using CPU-specific instructions. This adaptive, runtime-specific optimization can outperform the static, ahead-of-time compilation of many traditional systems.
*   **Unified Memory:** Using `SharedArrayBuffer` allows the audio engine, main thread UI, and any visualizers to access the exact same memory space (`globalThis.LEL_STATE` or a future shared buffer) with zero latency and no need for message passing (like OSC). The sample your ear hears and the pixel your eye sees can be pulled from the same physical bit in RAM simultaneously.
*   **The "Well" Architecture:** The engine uses a producer-consumer model. The JS-based "Producer" runs in a tight loop, filling a buffer. The native "Consumer" (the audio driver) pulls from this buffer. This decouples audio generation from the audio callback, meaning JS garbage collection pauses are absorbed by the buffer and do not cause audio glitches. This provides the stability of a real-time kernel without requiring one.

## 2. The Need for State: Why a Stateless `f(t)` is Insufficient

A pure, stateless function of time, `f(t)`, is mathematically beautiful but fails in a live-coding context due to phase discontinuities.

*   **The Problem:** When you edit a function live, the audio output can jump instantaneously from one value to another in a single sample, causing an audible "pop" or "click."
    *   At `t = 10.5`, the old code `sin(t)` might be at its peak (`+1.0`).
    *   You edit the code to `saw(t)`, which at `t = 10.5` might be at its trough (`-1.0`).
    *   The speaker cone is asked to snap from `+1.0` to `-1.0` in ~20 microseconds, creating a pop.
*   **The Solution:** State is **memory**. The `s.state` array allows the new code to know the exact phase/position of the old code and continue smoothly from that point, ensuring phase continuity.

## 3. Performance & State Management Patterns

### Performance: Pre-computation and Lookup Tables

To keep the real-time audio loop ("hot path") as fast as possible:

*   **Pre-compute Constants:** Any value that doesn't change on a per-sample basis should be calculated once when the signal is registered. A prime example is the phase increment for an oscillator (`const phaseInc = frequency / s.sr`). This avoids a costly division on every single sample.
*   **Use Lookup Tables:** Trigonometric functions (`Math.sin`, `Math.cos`) are computationally expensive. For high-performance needs, replacing them with pre-computed lookup tables can yield a >10x speedup.

### State: The "Named Constants" Pattern

To manage state within the `s.state` `Float64Array` without sacrificing clarity or performance:

*   **The Problem:** Using "magic numbers" (`s.state[0]`, `s.state[1]`) is confusing and error-prone.
*   **The Anti-Pattern:** Creating getter/setter objects for state adds significant overhead and defeats the purpose of using a raw `Float64Array`.
*   **The Best Practice:** Use a plain object of constants to define the memory layout for your signal. This provides semantic clarity at zero runtime cost.

```javascript
// Define the memory layout for this signal at the top.
const DRONE_STATE = {
  OSC1_PHASE: 0,
  OSC2_PHASE: 1,
  FILTER_Z1: 2,
  ENV_LEVEL: 3,
};

register('drone', s => {
  // Now the code is self-documenting and fast.
  s.state[DRONE_STATE.OSC1_PHASE] = (s.state[DRONE_STATE.OSC1_PHASE] + 440 / s.sr) % 1.0;
  // ...
});
```

## 4. Live Coding "Surgery" Workflow

*   **Group Surgical Parameters:** Place all the variables you intend to tweak live at the top of your signal definition for easy access.
*   **Document Ranges:** Use comments to remind yourself of safe or interesting ranges for your parameters (e.g., `// 0.1 (gentle) to 50.0 (chaos)`).
*   **Comment Out Alternatives:** Keep alternative values commented out for quick A/B testing of different sounds.

## 5. Future Paradigms: Flow and Field

The `f(s)` interface can be extended to model more abstract physical phenomena.

*   **`flow(state)` - Physics Simulation (Discrete Objects):** Instead of manually calculating the next state, we can describe the **physical forces** acting on a system (the derivatives of its Ordinary Differential Equations), and let a solver handle the integration (the "flow" of time). This allows for modeling virtual objects like a mass on a spring. Live coding becomes about manipulating physical properties (`tension`, `friction`), not algorithms.
*   **`field(state)` - Field Simulation (Continuous Medium):** The ultimate abstraction, where the state memory becomes the **physical medium itself**. The state of any point depends on its **neighbors**, as described by Partial Differential Equations (PDEs). This unlocks the simulation of true physical wave propagation, allowing you to model a 1D string, a 2D drum membrane, or a 3D volume of air, excite it, and listen to how the energy propagates.

## 6. Future Features Roadmap

*   **Stateful Clock:** A master clock/sequencer that persists across hot-reloads to enable musical time (bars, beats, steps).
*   **Bi-Directional UI Bridge:** Use `SharedArrayBuffer` to share state between the audio engine and the main UI thread for zero-latency control sliders and real-time oscilloscopes.
*   **Parameter Macro System:** A helper to map UI controls or MIDI CC messages to specific state slots for performance.
*   **Sample Support:** An engine for loading and playing back audio files, enabling granular synthesis and live sampling.
