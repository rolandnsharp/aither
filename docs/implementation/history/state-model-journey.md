# State Management Journey: From Memory Leaks to Implicit Persistence

This document chronicles the architectural evolution of the state management system in Aether, documenting both failures and breakthroughs. It provides crucial context for understanding why the current "Two Pool" + "Implicitly Persistent" model exists.

---

## Part 1: The Fatal Flaw (Early Attempt)

### The Problem: A Fatal Memory Leak

The initial "Implicitly Persistent" helper model, while beautifully terse on the surface, contained a fatal flaw: **it leaked memory on every hot-reload.**

The model relied on a single, global counter (`globalThis.LEL_HELPER_STATE.nextSlot`) that allocated state slots from the master `STATE` array. This counter **never reset**.

-   On the first run, `tremolo(osc)` might claim slot `0`.
-   On hot-reload, the code re-runs, and a new `tremolo(osc)` instance is created. It claims the *next* available slot, `1`.
-   Slot `0` is now an orphan. It is never used again, but it is never freed.
-   This continues on every save, with each helper in the live-coding session consuming new state slots, until the entire master `STATE` array is exhausted, leading to the `[FATAL] Out of state memory` error.

### The Root Cause: Breaking the Sandbox

The original architecture was safe because it gave each signal a fixed-size sandbox of memory (`SLOTS_PER_SIGNAL`). A signal could only ever use its own slice of the state array and could never affect the memory of another signal or exhaust the global pool.

The broken "Implicitly Persistent" model threw this safety away. It created a single, shared memory space where any signal's helpers could claim memory from the global pool indefinitely.

### The Uncomfortable Solution: Explicit Slots

To fix this, we initially returned to the sandboxed model with **explicit state slot management**:

```javascript
// The user had to manually allocate state slots
register('composed-signal',
  pipe(
    osc(110, 1),  // Uses slot 1 for phase
    signal => tremolo(signal, 5, 0.8, 0)  // Uses slot 0 for LFO
  )
);
```

**Pros:**
-   Rock-solid stable - guaranteed memory safety
-   Fully composable
-   Still Zero-GC

**Cons:**
-   Verbose - littered with state indices
-   Increased cognitive load - manual memory management
-   Less "beautiful" - implementation details leak into creative process

This approach prioritized stability over elegance, but the verbosity was unacceptable for a live-coding instrument.

---

## Part 2: The Breakthrough - Two Distinct Pools

### The Realization

The solution lies in a crucial architectural separation: **two completely distinct and independent memory pools**.

1.  **The User's Signal State Pool (`s.state`):**
    *   Fixed-size `Float64Array` slice (`SLOTS_PER_SIGNAL` long) for each registered signal
    *   Purpose: User's own direct state management within their signal function
    *   Fixed-size sandbox that **cannot be exhausted** by helpers

2.  **The Helpers' Shared Persistent Pool (`globalThis.LEL_HELPER_MEMORY`):**
    *   Separate, single, large `Float64Array` dedicated to helper state
    *   Managed by the helper system itself (`helpers.js`)
    *   **Persists across hot-reloads** via `globalThis`
    *   Helper instances reclaim existing state slots by stable key

### How It Works: The Final Model

#### Key Components

**`globalThis.LEL_HELPER_MEMORY`:** Large `Float64Array` storing all helper state

**`globalThis.LEL_HELPER_SLOT_MAP`:** `Map` storing `helperKey -> startingSlotIndex` mappings

**`claimStateBlock(s, helperName, helperIndex, totalBlockSize)`:** Central function that:
*   Constructs unique stable key (e.g., `${s.name}_tremolo_0`)
*   If key is new: claims `totalBlockSize` from global counter, stores mapping
*   Returns `startingSlotIndex`
*   Includes safety check to prevent memory exhaustion

**`resetHelperCounter()`:** Resets per-signal counter before each `register()` to ensure stable keys

#### The Result: Terse Live-Coding Syntax

```javascript
// Clean, mathematical expression - no manual state management!
register('filtered-delayed-sine',
  pipe(
    osc(440),
    signal => lowpass(signal, 800),
    signal => tremolo(signal, 5, 0.8),
    signal => delay(signal, 0.5, 0.25),
    signal => gain(signal, 0.4)
  )
);
```

### All Goals Achieved

-   ✅ **Terse & Expressive API:** No magic numbers, no manual state budgeting
-   ✅ **Rock-Solid Memory Safety:** Separate pools prevent leaks
-   ✅ **Zero-GC Performance:** Direct `Float64Array` access in hot path
-   ✅ **Full Composability:** Any helper can be nested any number of times
-   ✅ **Perfect Persistence:** State survives hot-reloads via stable keys
-   ✅ **N-Stride Support:** Helpers dynamically adapt to channel count

---

## Key Lessons

1. **Separation of Concerns:** User state and helper state must be completely independent
2. **Stable Keys:** Using `s.name + helperType + counter` creates persistent identity
3. **Trade-offs Matter:** Elegance without correctness is worthless, but correctness without elegance limits creativity
4. **Persistence ≠ Immortality:** Memory must be reclaimable via explicit `unregister()`

---

## See Also

- [../ARCHITECTURE.md](../ARCHITECTURE.md) - Current implementation
- [../../CORE_VISION.md](../../CORE_VISION.md) - Fundamental principles
- [../../HELPERS.md](../../HELPERS.md) - Helper function guide
