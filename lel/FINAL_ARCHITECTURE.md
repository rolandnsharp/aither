# The `lel` Engine: Final Architecture (REPL-Driven)

## 1. Core Philosophy: An Imperative, Live Instrument

This document outlines the final, definitive architecture for the `lel` engine. After exploring complex, file-based hot-reloading models, we have embraced a simpler, more powerful, and more robust paradigm: **a REPL-driven, imperative live-coding environment.**

The core principles are:
-   The engine is a stable, long-running process.
-   The user has direct, explicit control over the audio graph by sending `register()` and `unregister()` commands.
-   The `live-session.js` file acts as a simple "startup script" to define an initial state, not as the primary interface for live performance.
-   Complexity is minimized. "Magical" systems are replaced with clear, explicit actions.

## 2. The `f(s)` Interface: The Universal Constant

The `f(s)` interface remains the heart of the engine. It is the universal signature for all signals and successfully unifies the five expressive paradigms (`Kanon`, `Rhythmos`, etc.) as intended.

```javascript
s = {
  t: 0,           // Absolute time in seconds
  sr: 48000,      // Sample rate
  // ... other context ...
  name: "signal-name", // The unique name of the top-level registered signal
  state: Float64Array(...) // The signal's own private, sandboxed state slice
}
```

## 3. State Management: The Two Pools (Finalized)

The robust "Two Pool" model is the key to memory safety and performance.

1.  **User Signal State (`s.state`):** A fixed-size `Float64Array` slice (`SLOTS_PER_SIGNAL`) allocated to each signal upon registration. This is the user's private sandbox. It cannot leak or be exhausted by helpers.

2.  **Helpers' Shared State (`globalThis.LEL_HELPER_MEMORY`):** A separate, large `Float64Array` for all stateful helpers. Helpers claim slots from this pool using a stable, name-based key (`${s.name}_tremolo_0`). This allows for full composability and persistence of helper state *for the lifetime of the signal*.

## 4. The `register()` and `unregister()` Lifecycle: Explicit Control

This is the most significant architectural shift. Memory management is now tied directly to explicit user commands.

### `register(name, signalFn)`
1.  A user sends the `register` command via the REPL.
2.  The engine allocates a sandboxed `s.state` slice for the signal `name`.
3.  The `signalFn` (e.g., `tremolo(osc)`) is executed.
4.  Stateful helpers within the function generate their unique keys (e.g., `"my-signal_tremolo_0"`).
5.  Each helper claims its persistent state slot(s) from the `LEL_HELPER_MEMORY` pool.
6.  The final audio-rate function is added to the `REGISTRY`.

### `unregister(name)`: Explicit Garbage Collection
1.  A user sends the `unregister` command via the REPL.
2.  The engine removes the signal's audio function from the `REGISTRY`.
3.  **Crucially, the engine now performs garbage collection:** It iterates through the `globalThis.LEL_HELPER_SLOT_MAP` and **deletes every key that starts with `${name}_`**.
4.  This instantly frees the memory used by that signal's helpers. (Future optimization: a "free list" could be implemented to allow the `nextSlot` counter to reclaim this memory, but for now, simply deleting the keys prevents state conflicts and is robust).

## 5. The `helpers.js` File: Simplified and Robust

The helper library design is now stable:
-   It uses the "Implicitly Persistent" model with name-based keys.
-   The complex `resetHelperCounter()` is **no longer needed** and will be removed. The `helperCounter` can be reset to `0` at the beginning of every `register` call.
-   The `expand()` abstraction for multichannel support remains a powerful and correct pattern.

## The Result: A Professional, Time-Tested Architecture

This REPL-driven model is the standard for professional live-coding environments like SuperCollider and TidalCycles for a reason. It is:
-   **Robust:** The system state is only ever changed by explicit user commands, eliminating entire classes of bugs related to automatic file watching.
-   **Predictable:** The lifecycle of a sound and its memory is clear and unambiguous.
-   **Performant:** It retains all our hard-won Zero-GC and performance characteristics.
-   **Expressive:** The `live-session.js` file can be kept clean, while the REPL provides the power for dynamic, imperative performance.

This is the final, correct architecture for `lel`. It fulfills your vision in the most robust and professional way possible.
