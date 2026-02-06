# Modern 2026 KANON API - State-Driven Live Coding

## The Modern Signature

```javascript
wave('minimal-drone', () =>
  withLfo(mixGain(voices(333, 2, 4), 0.4), 0.3, 0.25)
);
```

## Why No `t` Parameter?

**State-Driven, Not Time-Driven**

The old API passed a `t` (time) parameter:
```javascript
wave('old', (t) => mul(cycle(t * 440), 0.5))  // ❌ Time-driven
```

The modern API uses **stateful oscillators** that manage their own phase via the `STATE` buffer:
```javascript
wave('new', () => mul(osc(440), 0.5))  // ✓ State-driven
```

### Benefits of State-Driven Design

1. **Surgery Continuity**: No phase discontinuities during hot-reload
2. **Simpler Mental Model**: Oscillators "remember" where they are
3. **Cleaner API**: Declarative signal graphs, not imperative loops

### When You Need Time

If you need time-based sequencing (4-bar phrases, clock sync), implement a **stateful counter**:

```javascript
wave('sequencer', () => {
  // Stateful beat counter (slot 0)
  const beat = peek(globalThis.STATE, 0);
  const nextBeat = mod(add(beat, 1), 16);  // 16-step sequence
  poke(globalThis.STATE, nextBeat, 0);

  // Use beat to drive pattern
  const freq = beat < 8 ? 440 : 550;
  return mul(osc(freq), 0.5);
});
```

This keeps "time" subject to the same surgery rules as audio, allowing you to pause, rewind, or jump time live without pops or clicks.

---

## Why Keep the `() =>` Arrow Function?

### The Short Answer

**Lazy evaluation** - the engine must rebuild the graph multiple times for hot-reload crossfading.

### The Long Answer

#### Without Arrow Function (Broken):
```javascript
wave('test', withLfo(osc(440), 0.3, 0.25))  // ❌ BROKEN
```

Problems:
1. **Immediate execution**: `withLfo()` runs at script load time
2. **No slot reset**: Engine can't call `internalResetSlots()` first
3. **Non-deterministic**: `osc(440)` gets different slots on each reload
4. **No surgery**: Engine can't rebuild graph for crossfading

#### With Arrow Function (Correct):
```javascript
wave('test', () => withLfo(osc(440), 0.3, 0.25))  // ✓ WORKS
```

Benefits:
1. **Lazy evaluation**: Graph builds when engine calls the function
2. **Deterministic slots**: Engine resets counter before each call
3. **Hot-reload works**: Engine can build both old + new graphs
4. **Phase continuity**: Same code always uses same STATE slots

### How It Works Internally

```javascript
// Engine code (worklet.js)
compileWave(label, graphFn) {
  // Reset slot counter to 100 BEFORE calling user function
  internalResetSlots();

  // Now call the user function (the arrow function you provided)
  const graph = graphFn();  // This is your () => withLfo(...)

  // Compile the graph
  const compiled = genish.gen.createCallback(graph);

  // For hot-reload, repeat to build both old and new:
  internalResetSlots();  // Reset again
  const oldGraph = oldGraphFn();  // Same slots as before!

  internalResetSlots();  // Reset again
  const newGraph = newGraphFn();  // Same slots as old!

  // Crossfade between them for 50ms
}
```

### The Closure Benefit

The arrow function creates a **closure**, allowing the graph to reference variables from the outer scope:

```javascript
const baseFreq = 440;

wave('drone', () => osc(baseFreq));  // Captures baseFreq

// Later, if you change baseFreq and reload:
const baseFreq = 550;
wave('drone', () => osc(baseFreq));  // Uses new value!
```

---

## The 3-Character Trade-off

```javascript
// Only 3 extra characters:
() =>
```

But those 3 characters are the difference between:
- ❌ A static sound that pops on every code change
- ✓ A **living, hot-swappable instrument** that morphs smoothly

---

## Comparison Table

| Feature | Direct Pass | Arrow Function |
|---------|-------------|----------------|
| Code Length | `wave('x', expr)` | `wave('x', () => expr)` |
| Evaluation | Immediate | Lazy |
| Hot-Reload | ❌ Broken | ✓ Works |
| Slot Determinism | ❌ Random | ✓ Consistent |
| Phase Continuity | ❌ Clicks/Pops | ✓ Smooth |
| Live Surgery | ❌ Impossible | ✓ 50ms crossfade |

---

## Final API Examples

### Ultra-Compact (Tier 1)
```javascript
wave('drone', () => withLfo(mixGain(voices(440, 2, 4), 0.4), 0.3, 0.25));
```

### Explicit (Tier 1)
```javascript
wave('drone', () => {
  const v = voices(440, 2, 4);
  const mixed = mix(...v);
  const modulated = withLfo(mixed, 0.3, 0.25);
  return mul(modulated, 0.4);
});
```

### Hybrid (Tier 2)
```javascript
wave('drift', () => {
  const carrier = osc(440);  // Auto-slotted (100+)

  const drift = peek(globalThis.STATE, 0);  // Manual (0-99)
  poke(globalThis.STATE, drift + 0.01, 0);

  return mul(carrier, 0.5);
});
```

### Full Manual (Tier 3)
```javascript
wave('chaos', () => {
  const last = peek(globalThis.STATE, 0);
  const next = sin(add(last, mul(last, 0.5)));  // Feedback loop
  poke(globalThis.STATE, next, 0);
  return mul(next, 0.3);
});
```

---

## Summary

- **No `t` parameter**: State-driven oscillators manage their own phase
- **Keep `() =>`**: Required for lazy evaluation and hot-reload surgery
- **3-tier API**: From ultra-compact (1 line) to full manual control
- **Surgery-ready**: 50ms phase-locked crossfades during live coding

The result: An instrument you can **rewire while it's screaming**, with zero pops or clicks.
