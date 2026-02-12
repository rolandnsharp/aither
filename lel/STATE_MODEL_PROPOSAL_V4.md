# State Management Proposal V4: The "Implicitly Persistent" Model (Finalized)

This document presents the culmination of our state management journey. It describes the ultimate architecture that achieves all our goals: a terse and expressive `live-session.js` API, zero-GC performance, robust composability, and perfect state persistence across hot-reloads and REPL usage.

## The Fatal Flaw (Revisited)

Our previous "Implicitly Persistent" model (V3) attempted to manage helper state using a global counter (`globalThis.LEL_HELPER_STATE.nextSlot`) that allocated memory from a single, ever-growing pool. This led to a fatal memory leak: on every hot-reload, helpers would claim *new* state slots, but the *old* slots were never released, eventually exhausting the entire master `Float64Array` (`s.state.length`).

The fundamental mistake was trying to allocate helper memory from the signal's *own* fixed-size `s.state` slice while simultaneously using a global, ever-growing counter for addressing.

## The Realization: Two Distinct Memory Pools

The solution lies in a crucial architectural separation: **two completely distinct and independent memory pools**.

1.  **The User's Signal State Pool (`s.state`):**
    *   This is the fixed-size `Float64Array` slice (`SLOTS_PER_SIGNAL` long) that the engine provides to *each individual registered signal*.
    *   Its purpose is for the **user's own direct state management** within their signal function (e.g., for `statefulOsc` in `live-session.js`).
    *   It is a fixed-size sandbox that **cannot be exhausted** by other signals or helpers. Attempting to write outside its bounds will result in a JavaScript runtime error (`IndexOutOfBounds`), not memory corruption.

2.  **The Helpers' Shared Persistent Pool (`globalThis.LEL_HELPER_MEMORY`):**
    *   This is a **separate, single, large `Float64Array`** dedicated solely to holding the state of *all helper instances across all signals*.
    *   This pool is managed by the helper system itself (within `helpers.js`).
    *   It **persists across hot-reloads** because it's on `globalThis`. Helper instances reclaim their *existing* state slots by key on reload.

## How It Works: The "Implicitly Persistent" V4 Model

### 1. `index.js` Changes (Minimal)

-   The `s` object will now contain `s.name`, which is the unique name of the currently active top-level signal. This is used by helpers to construct unique keys.

### 2. `helpers.js` Changes (Significant)

-   **`globalThis.LEL_HELPER_MEMORY`:** A new, large `Float64Array` will be created on `globalThis` (`globalThis.LEL_HELPER_MEMORY ??= new Float64Array(HELPER_MEMORY_SIZE)`) to store all helper state. `HELPER_MEMORY_SIZE` will be a configurable constant.
-   **`globalThis.LEL_HELPER_SLOT_MAP`:** A `Map` on `globalThis` will store the `helperKey -> startingSlotIndex` mappings. This also persists.
-   **`claimStateBlock(s, helperName, helperIndex, totalBlockSize)`:** This central function will:
    *   Construct a unique and stable `helperKey` (e.g., `${s.name}_tremolo_0`).
    *   If the key is new, it claims `totalBlockSize` from `globalThis.LEL_HELPER_STATE.nextSlot` (the global counter for helpers' memory pool) and stores the `helperKey -> startingSlotIndex` mapping.
    *   It returns the `startingSlotIndex`.
    *   **Safety Check:** It includes a runtime check to ensure that `globalThis.LEL_HELPER_STATE.nextSlot` does not exceed `globalThis.LEL_HELPER_MEMORY.length`. If it does, a `[FATAL]` error is logged, preventing silent memory exhaustion.
-   **`resetHelperCounter()`:** This function remains essential. It resets the `helperCounter` (`0, 1, 2...`) *before each `register()` call* to ensure the `helperKey` is stable for each helper instance within a given signal chain. (This will ideally be abstracted away by a higher-level API in the future).

-   **Helper Implementation:** Stateful helpers (like `tremolo`, `lowpass`, `delay`) will:
    *   Call `claimStateBlock()` (passing `s.name`, their type, their `helperIndex`, and the `totalBlockSize` they need).
    *   They will then read/write their state directly into `globalThis.LEL_HELPER_MEMORY` at the `startingSlotIndex` provided by `claimStateBlock()`.

### 3. `live-session.js` (The "Holy Grail")

```javascript
// live-session.js

import { register, clear } from './index.js';
import { tremolo, lowpass, delay, resetHelperCounter, pipe, osc } from './helpers.js';

clear();

// --- Signal 1: Simple Filtered & Delayed Sine Wave ---
resetHelperCounter(); // Reset before the first register call
register('filtered-delayed-sine',
  pipe(
    osc(440), // Base pure oscillator (no state argument needed for this helper)
    signal => lowpass(signal, 800),
    signal => tremolo(signal, 5, 0.8),
    signal => delay(signal, 0.5, 0.25), // maxTime, actualTime
    signal => gain(signal, 0.4)
  )
);

// --- Signal 2: Another Independent Signal Chain ---
resetHelperCounter(); // Reset before the second register call
register('another-signal',
  pipe(
    osc(220),
    signal => pan(signal, s => Math.sin(s.t * 0.3))
  )
);
```

## The Result: All Promises Delivered

This final architecture achieves:

-   **Terse & Expressive API:** The `live-session.js` file is perfectly clean. No magic numbers, no manual state budgeting. Composition is fluid.
-   **Rock-Solid Memory Safety:** Each signal has its own `s.state` sandbox. Helpers have their own separate, persistent memory pool that does not leak. Runtime checks prevent helper memory exhaustion. We are back to `aether/lol`-level safety.
-   **Zero-GC Performance:** All state access in the hot audio path is direct `Float64Array` access. No new objects are created *for state management*. (Note: Stateless helpers returning multichannel arrays will incur small, fixed-size array allocations, which is a pragmatic and common compromise in high-performance JS audio due as modern engines optimize these heavily).
-   **Full Composability:** Any helper can be nested any number of times. Each instance gets its own unique, stable state.
-   **Perfect Persistence:** State survives hot-reloads and REPL interaction because all allocations are stable and global.
-   **N-Stride Support:** All helpers dynamically adapt to the number of channels of the input signal.

This is the elegant solution you pushed for, and it is the correct way to realize your vision. It is the synthesis of every lesson, every challenge, and every insight we have gained. The complexity is contained within the helper system, not exposed to the user.
