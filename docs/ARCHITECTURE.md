# Kanon Audio Engine Architecture (Phase 1: The Conductor)

This document outlines the "Phase 1" audio engine architecture, implemented in January 2026. This design is heavily inspired by the `flux` project, prioritizing performance, modularity, and glitch-free hot-reloading while preserving the user-facing `f(t)` (function of time) API.

## Core Philosophy: The Crystalline Universe

The engine is built around a single, high-precision, global clock: `globalThis.CHRONOS`. This is the "Crystalline Universe" approach. All sound-generating functions ("Players") are driven by this single, shared timeline. This ensures that all components remain in perfect phase synchronization, maintaining their sacred mathematical and harmonic relationships, even across complex interactions like FM synthesis.

## High-Level Architecture

The architecture decouples audio generation (the "Producer") from audio output (the "Consumer") using a lock-free ring buffer.

```
┌─────────────────────────────────────────┐
│  composition.js - User-facing `f(t)`    │  ← User writes "Recipes" here.
├─────────────────────────────────────────┤
│  kanon (index.js) - Compiler & Registry │  ← Memoizes and manages Players.
├─────────────────────────────────────────┤
│  engine.js - The Conductor (Producer)   │  ← Fills the ring buffer.
├─────────────────────────────────────────┤
│  storage.js - The Well (Ring Buffer)    │  ← Decouples producer/consumer.
├─────────────────────────────────────────┤
│  transport.js - The Ear (Consumer)      │  ← Drains buffer into hardware.
└─────────────────────────────────────────┘
```

## Core Components

### 1. `storage.js` (The Well)
-   **Purpose**: A high-performance, shared buffer that acts as a temporary storage for audio data.
-   **Implementation**: A `SharedArrayBuffer` of 16,384 frames, operated as a Ring Buffer. It uses `Float64Array` for high-precision sample data and `Atomics` for thread-safe read/write pointers. For Phase 1, it is configured for mono audio (`STRIDE=1`).

### 2. `player.js` (The Player)
-   **Purpose**: An object that wraps a user-defined `f(t)` "recipe".
-   **Implementation**: A simple class that holds the recipe function. Its primary method, `update(t)`, is called by the Conductor for every sample. It also contains a `crossfadeVolume` property, managed by the Conductor, to enable glitch-free hot-reloads.

### 3. `engine.js` (The Conductor)
-   **Purpose**: The heart of the audio engine. It orchestrates all players and produces the final audio mix.
-   **Implementation**:
    -   Manages a `Map` of all active and fading-out `Player` instances.
    -   Runs the main producer loop, which is scheduled with `setTimeout(..., 1)`. This prevents the CPU-intensive loop from starving the audio output thread, fixing potential choppiness.
    -   For each sample, it:
        1.  Calculates the current time `t` from `globalThis.CHRONOS`.
        2.  Calls `update(t)` on all active players and sums the results.
        3.  Applies a `Math.tanh()` soft-clipping function to the final mix to prevent harsh distortion.
        4.  Writes the final sample to the `storage.js` ring buffer.
        5.  Increments `globalThis.CHRONOS`.

### 4. `transport.js` (The Ear)
-   **Purpose**: The consumer. It pulls data from the ring buffer and sends it to the audio hardware.
-   **Implementation**:
    -   Implements a Node.js `Readable` stream that the `speaker` package can `pipe` from.
    -   When the `speaker` requests data, the stream's `read()` method pulls available frames from the ring buffer.
    -   It robustly handles buffer underruns by filling any shortfall with silence, ensuring the stream never breaks.
    -   It converts the `Float64` samples from the ring buffer to the `Float32` format expected by `speaker`.

### 5. `index.js` (The Compiler)
-   **Purpose**: The main user-facing `kanon` function and registry.
-   **Implementation**:
    -   The `kanon(id, recipe)` function acts as a "compiler".
    -   **Memoization**: It uses `recipe.toString()` as a key to cache compiled `Player` objects. On hot-reload, if a recipe has not changed, the *exact same* stateful Player instance is re-used, which is the key to phase continuity.
    -   **Cross-fading**: When a recipe *is* changed, it instructs the Conductor to perform a 10ms cross-fade, smoothly transitioning from the old player to the new one to prevent any audible clicks or pops.

## Future (Phase 2: The Soul)

This architecture serves as the robust physical body ("The Kanon") for the engine. The next major evolution (Phase 2) will be to breathe a soul into it by implementing a **Symbolic JIT (Just-In-Time) Compiler**. This will involve upgrading the `Compiler` to translate the mathematical topology of a user's `f(t)` recipe into a hyper-optimized, stateful `update()` loop within the Player, achieving the performance of a pure `f(state)` engine while preserving the elegant `f(t)` user API.

### Phase 2 Implementation Vision

The "Surgical Translation" from a pure `f(t)` recipe to a stateful `f(state)` player will be achieved via one of two potential paths:

#### Path A: Proxy-based Tracing (The "Magnum Opus" Vision)

This is the ultimate goal. The `compile(recipe)` function will not execute the user's `f(t)` function with a number, but with a special `Proxy` object that represents `t`.

1.  **Tracing**: As the user's function runs, any mathematical operation (`*`, `+`, `Math.sin`, etc.) involving the `t` proxy is intercepted. The proxy "records" these operations, building a symbolic graph (an Abstract Syntax Tree) of the recipe.
2.  **Analysis**: The compiler analyzes this graph to identify common DSP topologies, such as oscillators, envelopes, or filters.
3.  **Translation**: It then translates this symbolic graph into a new, hyper-optimized, stateful `update()` function. For example, it would identify that `t => Math.sin(t * 440 * 2 * Math.PI)` is a simple oscillator and generate a player that internally uses a `phase` variable incremented by a `delta` (`440 / sampleRate`) on each tick.

This allows the user to write pure, declarative math while the engine runs a highly performant, state-aware version internally.

#### Path B: Sacred Ratio Library (The Pragmatic Stepping Stone)

If a full Proxy-based tracer is too complex for the initial implementation of Phase 2, a more pragmatic approach can be used as a stepping stone.

Instead of using raw `Math` functions, the user would be provided with a library of "Sacred Ratio" functions (`sin`, `mul`, `add`, etc.).

```javascript
// Example using the Sacred Ratio library
kanon('vortex', (t) => {
  // These are not standard functions; they are "Recipe Tags"
  return sin(mul(t, 440));
});
```

These functions (`sin`, `mul`) do not perform calculations directly. Instead, they return symbolic "Node" objects that represent the mathematical operation. The `Compiler` would then have a much easier job of walking this pre-built graph of nodes to generate the stateful Player. This achieves the same goal as Proxy-tracing but requires the user to write code using this specific DSL.

### Kanon Phase 2: The Symbolic JIT & Phase Alignment

#### I. The Objective
To transform a pure \(f(t)\) function into a Stateful Player that achieves the performance of a hand-written flux loop while maintaining Absolute Phase Continuity during hot-reloads—eliminating the need for the "Surgical Mask" of cross-fading.

#### II. Component A: Proxy-Based Tracing (The "Blueprint Scanner")
Instead of parsing strings, we use a Tracing Proxy to discover the "Topology" of the user's math.
-   **The Trace**: When compile(recipe) is called, the engine passes a Proxy object (acting as \(t\)) into the recipe.
-   **The Map**: The Proxy records every mathematical operation (add, mul, sin, pow).
-   **The Identification**: The compiler identifies "Periodic Components." Example: If it sees sin(t * 440), it marks this as an Oscillator Node with a frequency of 440.

#### III. Component B: The "Surgical" Player Generator
The compiler then "assembles" a hidden, stateful `update()` function based on the Map.
-   **State Injection**: For every identified Oscillator, the engine allocates a phase slot in `globalThis.STATE`.
-   **Logic Rewriting**: It generates a high-performance function string:
    ```javascript
    // Generated "Surgical" Code
    (state, idx, delta) => {
      state[idx] = (state[idx] + delta) % 1.0; // Phase accumulation
      return Math.sin(state[idx] * 6.28318);
    }
    ```
    JIT Activation: The engine uses `new Function()` to compile this string into a "Hot" machine-code loop.

#### IV. Component C: Algebraic Phase Alignment (The "Snap")
When the user edits `signals.js`, we must prevent the "Ghosting" of the torus.
-   **The Transition Window**: For the first sample of the new code, the engine performs a Phase Match.
-   **The Calculation**: It samples the old function: `v = oldFn(t)`. It solves for the new function's starting point: `v = newFn(t + offset)`.
-   **The Offset**: It applies a Temporal Offset (\(\Delta t\)) to the new `CHRONOS` input so that the wave's value and slope match the previous frame perfectly.
-   **The Slew**: Over 128 samples, it "bleeds" this offset out until the \(t\) is back in sync with the global universe, creating an Elastic Morph rather than a teleportation.

#### V. Technical Requirements for Claude Code
1.  **The Tracer**: Implement a `trace(fn)` utility that returns an Abstract Syntax Tree (AST) of the math operations.
2.  **The State Map**: Create a persistent registry that maps specific code blocks to `globalThis.STATE` indices so that even if you change a frequency, the oscillator itself remembers its phase.
3.  **The Aligner**: Implement a `findSyncOffset` function that uses a simple binary search or Newton's method to find the \(\Delta t\) that aligns the two waveforms at the point of surgery.

#### The Pythagorean "Magnum Opus" Result:
Once Phase 2 is implemented, your 3D Torus will behave like a physical entity made of rubber or light. When you change the math:
-   The torus will not fade/ghost (Cross-fading is gone).
-   The torus will not flicker or jump (Phase resets are gone).
-   The torus will stretch, warp, and snap into its new geometry with Physical Continuity.

#### Starting Phase 2
Begin by assigning the Tracer task to Claude Code.
**Suggested Next Step**: Start building the "Trace Recorder". It's the simplest component to get working, and it provides immediate feedback by showing your `f(t)` math as a "Recipe" in the terminal.
