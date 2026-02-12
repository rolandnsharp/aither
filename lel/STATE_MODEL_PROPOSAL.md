# State Management Proposal: Fixing the Fatal Flaw

This document addresses a fatal memory leak discovered in our "Implicitly Persistent" helper model and proposes a new, more robust architecture. This is a significant change, and it requires careful consideration of its trade-offs, particularly regarding the expressive purity of our `live-session.js` API.

## The Problem: A Fatal Memory Leak

Our current "Implicitly Persistent" helper model, while beautifully terse on the surface, contains a fatal flaw: **it leaks memory on every hot-reload.**

The model relies on a single, global counter (`globalThis.LEL_HELPER_STATE.nextSlot`) that allocates state slots from the master `STATE` array. This counter **never resets**.

-   On the first run, `tremolo(osc)` might claim slot `0`.
-   On hot-reload, the code re-runs, and a new `tremolo(osc)` instance is created. It claims the *next* available slot, `1`.
-   Slot `0` is now an orphan. It is never used again, but it is never freed.
-   This continues on every save, with each helper in the `live-session.js` file consuming new state slots, until the entire master `STATE` array is exhausted, leading to the `[FATAL] Out of state memory` error.

The design is fundamentally broken. My apologies.

## The Root Cause: Breaking the Sandbox

The original `aether/lol` architecture was safe because it gave each signal a fixed-size sandbox of memory (`SLOTS_PER_SIGNAL`). A signal could only ever use its own slice of the state array and could never affect the memory of another signal or exhaust the global pool.

My "Implicitly Persistent" model threw this safety away. It created a single, shared memory space where any signal's helpers could claim memory from the global pool indefinitely.

## The Solution: Return to the Sandbox, with Explicit State

To fix this, we must return to the sandboxed model. The `s.state` object passed to a signal function **must** be the pre-allocated, fixed-size slice for that signal only.

This gives us memory safety, but it creates a new challenge: how do composable helpers get their state?

If they can't claim from a global pool, they must use memory from *within the signal's own slice*. This means the state management must be explicit.

### The "Explicit Slot" Proposal

This is the only design that satisfies all our constraints: Zero-GC performance, memory safety, and full composability.

1.  **Helpers Require an Index:** Every stateful helper must take an extra argument: the index (or starting index) of the state slot(s) it should use *within the signal's slice*.

2.  **`live-session.js` Becomes Explicit:** The user becomes responsible for budgeting the state *within their signal's slice*.

**Proposed `helpers.js`:**
```javascript
// helpers.js

// The helper is simple. It receives the slot it should use.
export const tremolo = (signal, rate, depth, phaseSlot) => {
  return s => {
    s.state[phaseSlot] = (s.state[phaseSlot] + rate / s.sr) % 1.0;
    const lfo = (Math.sin(s.state[phaseSlot] * 2 * Math.PI) + 1) * 0.5;
    return signal(s) * (1 - depth + lfo * depth);
  };
};

// Base oscillators also become helpers that need a slot.
export const osc = (freq, phaseSlot) => {
    return s => {
        s.state[phaseSlot] = (s.state[phaseSlot] + freq / s.sr) % 1.0;
        return Math.sin(s.state[phaseSlot] * 2 * Math.PI);
    };
};
```

**Proposed `live-session.js`:**
```javascript
// live-session.js
import { register, clear } from './index.js';
import { tremolo, osc, pipe } from './helpers.js';

clear();

// The user must now explicitly map their composition to the state slice.
register('composed-signal',
  pipe(
    // The base oscillator will use slot 1 for its phase.
    osc(110, 1),

    // The tremolo helper will use slot 0 for its LFO phase.
    signal => tremolo(signal, 5, 0.8, 0)

    // A second tremolo would need a different slot, e.g., 2.
    // signal => tremolo(signal, 0.5, 0.9, 2)
  )
);
```

## The Uncomfortable Trade-Off

This is where we must be honest. This proposal directly impacts your goal of "mathematical beauty" and a terse, expressive API.

**Pros of this Proposal:**

-   **Rock-Solid Stable:** It is guaranteed to be memory-safe and will never leak.
-   **Fully Composable:** You can compose any number of helpers, including multiple instances of the same helper (e.g., `tremolo(tremolo(osc, ...), ...)`), as long as you give each a unique state slot.
-   **Still Zero-GC:** Performance remains maximal.

**Cons of this Proposal:**

-   **Verbose:** The `live-session.js` file is no longer a clean, mathematical expression. It is now littered with explicit state indices (`0`, `1`, `2`...).
-   **Increased Cognitive Load:** The live coder must now act as a memory manager for every signal, manually budgeting their limited `SLOTS_PER_SIGNAL`.
-   **Less "Beautiful":** It makes the implementation detail (the state array) a primary part of the creative process, which feels less like composing music and more like low-level programming.

### Conclusion for Review

I have failed to find a "magic" solution that provides a terse API, memory safety, and full composability. My attempt to do so is what led to the fatal memory leak.

This "Explicit Slot" model is the most honest and robust solution I can now offer. It prioritizes stability and performance over API elegance. The key question for you to review is whether this trade-off is acceptable, or if we need to rethink the problem from an even higher level. For example, limiting each chain to one of each helper type (your very first, terse proposal) might be preferable if the verbosity of this model is too high a price to pay.

I sincerely apologize for leading the project to this difficult crossroad.
