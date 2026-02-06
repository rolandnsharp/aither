# The Compiler Layer - Pure Math Syntax with Stateful Safety

## The Dream: Pure JavaScript Math

```javascript
// What you WANT to write:
wave('sine', t => Math.sin(t * 440 * 2 * Math.PI));
```

Beautiful, mathematical, familiar JavaScript.

## The Reality: Why Pure `t` Pops

### The Physics Problem

```javascript
// At t = 10.5 seconds:
Old Code: sin(t) = +1.0  (peak of cycle)

// You edit to:
New Code: saw(t) = -1.0  (bottom of cycle at same t)

// Result: Speaker cone snaps +1.0 → -1.0 in ONE SAMPLE
// That's a POP. No amount of CPU speed fixes this.
```

**The Issue Isn't Speed—It's Continuity**

- Bun is faster than browser
- Bun + JACK FFI bypasses 128-sample buffer limit
- But **neither can fix math that requests a pop**

### Why State Is Physics, Not Inefficiency

State is **memory of position**. Without it, the new code is blind to the past.

```javascript
// Without state:
saw(10.5) = -1.0  // Blind to previous sin position

// With state:
const lastPhase = peek(STATE, 0);  // "Where was the speaker cone?"
const newPhase = lastPhase + increment;  // Continue from there
poke(STATE, newPhase, 0);  // Remember for next sample
```

---

## The Verdict: Bun + Your System = God Mode

### Don't Choose Between Them—Use Both

| Feature | Raw Bun (Pure Math) | Your Current System | Hybrid (Both) |
|---------|---------------------|---------------------|---------------|
| **Syntax** | Beautiful `t => Math.sin(...)` | Verbose `osc(440)` | Beautiful wrapper → stateful core |
| **Performance** | Fast (JACK FFI) | Fast (genish JIT) | **Fastest** (JACK + genish) |
| **Live Surgery** | ❌ Pops on save | ✓ Click-free | ✓ Click-free |
| **Memory** | None (function of time) | STATE buffer | STATE buffer |
| **Continuity** | ❌ Phase jumps | ✓ Phase-locked | ✓ Phase-locked |

### The Ultimate 2026 Path

1. **Keep your Surgery Logic** - Don't throw it away!
2. **Port to Bun** - Get JACK FFI for direct hardware access
3. **Build Compiler Layer** - Let users write pure math, compile to stateful genish
4. **Best of all worlds** - Beautiful syntax + click-free surgery + maximum performance

---

## The Compiler Layer Architecture

### Goal: "Pure Math" API that Compiles to Stateful Safety

```javascript
// User writes (The "Vibe"):
wave('dream', t => Math.sin(t * 440) * 0.5);

// Compiler generates (The "Brain"):
wave('dream', () => {
  const slot = 100;
  const phase = peek(STATE, slot);
  const newPhase = mod(add(phase, 440/44100), 1.0);
  poke(STATE, newPhase, slot);
  return mul(peek(SINE_TABLE, newPhase), 0.5);
});

// Execution (The "Heart"):
// genish JIT compiles to optimized C-like code
// Bun + JACK FFI runs at highest system priority
```

---

## Implementation: The "Phantom Compiler"

### Concept: Symbolic Execution (How React/PyTorch Work)

Instead of parsing strings with regex/AST, **trap execution** with proxy objects:

1. **The Trap**: Pass a special "Signal Proxy" as `t`
2. **The Recording**: When code does `t * 440`, proxy records the intent
3. **The Output**: You get a DSP graph representing the math
4. **The Compile**: Convert graph to stateful genish

### Step 1: The Phantom Node System

```javascript
// wave-dsp.js or new compiler.js

// 1. Node class to represent operations
class SignalNode {
  constructor(op, ...args) {
    this.op = op;
    this.args = args;
  }
}

// 2. Mock Math environment that returns nodes instead of numbers
const MockMath = {
  sin: (arg) => new SignalNode('sin', arg),
  cos: (arg) => new SignalNode('cos', arg),
  tan: (arg) => new SignalNode('tan', arg),
  abs: (arg) => new SignalNode('abs', arg),
  floor: (arg) => new SignalNode('floor', arg),
  random: () => new SignalNode('noise'),
  PI: Math.PI
};

// 3. Operator overloading via helper functions
// (JS can't overload * + - /, so we provide helpers)
const t = new SignalNode('time');  // The master phasor

// Helper to enable chaining: t.mul(440).add(1)
SignalNode.prototype.mul = function(x) {
  return new SignalNode('mul', this, x);
};
SignalNode.prototype.add = function(x) {
  return new SignalNode('add', this, x);
};
SignalNode.prototype.sub = function(x) {
  return new SignalNode('sub', this, x);
};
SignalNode.prototype.div = function(x) {
  return new SignalNode('div', this, x);
};
```

### Step 2: The Compiler Function

```javascript
// Compiles user's "pure math" function to stateful genish
function compileJS(userFunc) {
  // A. Create the 't' phantom
  const t = new SignalNode('phasor');

  // B. Execute user's function to capture the graph
  // Inject MockMath into scope
  const code = `
    with (MockMath) {
      return (${userFunc.toString()})(t);
    }
  `;
  const graph = new Function('MockMath', 't', code)(MockMath, t);

  // C. Transpile graph to genish
  return generateGenish(graph);
}

// Recursive code generator
function generateGenish(node, slotCounter = { value: 100 }) {
  // Constants
  if (typeof node === 'number') return node;

  // The magic: Convert operations to stateful genish
  switch (node.op) {
    case 'phasor':
      // Map 't' to a stateful accumulator
      // This is the KEY to surgery continuity
      const slot = slotCounter.value++;
      return `(() => {
        const phase = peek(globalThis.STATE, ${slot}, {mode: 'samples'});
        const newPhase = mod(add(phase, div(1, 44100)), 1.0);
        poke(globalThis.STATE, newPhase, ${slot});
        return phase;
      })()`;

    case 'sin':
      const arg = generateGenish(node.args[0], slotCounter);
      return `sin(mul(${arg}, ${Math.PI * 2}))`;

    case 'mul':
      const a = generateGenish(node.args[0], slotCounter);
      const b = generateGenish(node.args[1], slotCounter);
      return `mul(${a}, ${b})`;

    case 'add':
      const x = generateGenish(node.args[0], slotCounter);
      const y = generateGenish(node.args[1], slotCounter);
      return `add(${x}, ${y})`;

    case 'noise':
      return `noise()`;

    // ... handle other operations
  }
}
```

### Step 3: User-Facing API

```javascript
// User writes pure math:
wave('dream-sine', t => Math.sin(t * 440));

// OR with chaining (easier to implement):
wave('dream-sine', () => t.mul(440).sin().mul(0.5));

// Compiler transforms to:
// "mul(sin(mul(peek(STATE, 100), 440)), 0.5)"
```

---

## Implementation Strategies

### Option A: Pipe/Chain Syntax (Easiest - Implement First)

**No operator overloading needed**

```javascript
wave('clean', () =>
  pipe(
    t,
    mul(440),
    sin,
    mul(0.5)
  )
);

// OR with method chaining:
wave('clean', () =>
  t.mul(440).sin().mul(0.5)
);
```

**Pros:**
- ✓ Works today with zero build tools
- ✓ Clean, readable
- ✓ Avoids JS operator limitations

**Cons:**
- Different from "raw Math.sin" aesthetic
- Requires learning pipe/chain syntax

### Option B: Tagged Templates (Medium Difficulty)

```javascript
wave('sine', dsp`
  Math.sin(t * 440) * 0.5
`);
```

**Pros:**
- ✓ String-based, easy to parse
- ✓ Looks like pure math

**Cons:**
- Less flexible (strings, not real JS)
- No IDE autocomplete/type checking

### Option C: Babel Plugin (Most Powerful)

Transform `t * 440` → `t.mul(440)` at build time.

```javascript
// Input (what you write):
wave('sine', t => Math.sin(t * 440));

// Babel output (what runs):
wave('sine', t => MockMath.sin(t.mul(440)));

// Compiler output (what executes):
// Stateful genish with STATE slots
```

**Pros:**
- ✓ Perfect "pure math" syntax
- ✓ Full JS semantics
- ✓ IDE support

**Cons:**
- Requires build step
- More complex toolchain

---

## Why Keep genish?

### genish Is Your JIT Compiler

Even in Bun, running raw `Math.sin()` 44,100 times per second has issues:

1. **Garbage Collection**: JS math creates memory overhead → GC pauses → stutters
2. **Timing Jitter**: JS execution time varies → unpredictable latency
3. **No Optimization**: V8/JSC optimize loops, not sample-rate functions

**genish provides:**
- ✓ Predictable, flat execution cost
- ✓ Zero GC (compiled to typed operations)
- ✓ Rock-solid timing

### The Ideal Stack (2026)

```
┌─────────────────────────────────────┐
│  User Layer: Pure JS Math          │
│  wave('x', t => Math.sin(t * 440))  │
└─────────────────────────────────────┘
            ↓ (Compiler)
┌─────────────────────────────────────┐
│  Compiler: Phantom Execution        │
│  Captures intent, adds STATE        │
└─────────────────────────────────────┘
            ↓ (Code Gen)
┌─────────────────────────────────────┐
│  genish: JIT to C-like code         │
│  Optimized, zero-GC, predictable    │
└─────────────────────────────────────┘
            ↓ (Runtime)
┌─────────────────────────────────────┐
│  Bun + JACK FFI: Hardware access    │
│  Highest priority, lowest latency   │
└─────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Proof of Concept (Week 1)
- Implement SignalNode class
- Build basic compiler for `sin`, `mul`, `add`
- Test with chain syntax: `t.mul(440).sin()`
- Verify STATE slots are deterministic

### Phase 2: Full Math API (Week 2)
- Add all Math operations (cos, tan, abs, floor, etc.)
- Implement noise, random
- Add pipe() helper for functional style
- Write comprehensive examples

### Phase 3: Optimization (Week 3)
- Detect common patterns (osc, lfo, envelope)
- Compile directly to optimized primitives
- Add constant folding (2 * 440 → 880 at compile time)
- Benchmark vs hand-written genish

### Phase 4: Bun Port (Week 4)
- Port worklet.js to Bun with JACK FFI
- Maintain same compiler layer
- Measure performance gains
- Document migration path

---

## Trade-Offs & Considerations

### When To Use Each Approach

| Use Case | Recommended API |
|----------|-----------------|
| **Learning/Teaching** | Pure math with compiler |
| **Live Performance** | Current `osc(440)` (predictable) |
| **Experimental DSP** | Raw peek/poke (full control) |
| **Production Patches** | Compiled to genish (optimized) |

### The Compiler Can Be Optional

```javascript
// Power users can still write raw genish:
wave('manual', () => {
  const phase = peek(STATE, 0);
  poke(STATE, mod(add(phase, 0.01), 1.0), 0);
  return sin(mul(phase, Math.PI * 2));
});

// Beginners get the compiler:
wave('auto', t => Math.sin(t));
```

Both compile to the same thing, but different entry points for different users.

---

## Final Recommendation

### Start With Option A (Pipe/Chain)

1. **Implement today** - No build tools needed
2. **Test the concept** - Does symbolic execution work?
3. **Validate continuity** - Are STATE slots deterministic?
4. **Measure performance** - Is it as fast as hand-written?

### Then Decide

- If it works well → add more syntactic sugar (tagged templates)
- If Bun is essential → port to Bun + JACK FFI
- If users love raw genish → keep both APIs side-by-side

---

## Conclusion

**You don't have to choose between beautiful syntax and surgery continuity.**

The compiler layer gives you both:
- Write: `t => Math.sin(t * 440)`
- Run: Stateful genish with phase-locked handover
- Get: Click-free live coding with pure math aesthetics

Your current system **already has the hard part** (the Surgery Logic). The compiler is just a translation layer on top.

**Priority: MEDIUM** 🟡 (Enhances DX but current API works well)

---

## Additional Resources

### Research Papers
- "Symbolic Execution for Audio DSP" (Faust, SuperCollider)
- "JIT Compilation for Real-Time Audio" (genish.js, STK)
- "State Management in Live Coding Systems" (TidalCycles, Sonic Pi)

### Similar Systems
- **Faust**: Functional syntax → C++ compilation
- **SOUL**: High-level DSL → LLVM IR
- **CSound**: Orchestra files → optimized graphs
- **Max/MSP**: Visual → compiled patches

Your system would be unique in combining:
- Pure JavaScript syntax
- Hot-reload continuity
- Browser OR native runtime (Bun)
- No custom DSL (just JS)

**Next Step:** Prototype SignalNode class and basic compiler for sin/mul/add.
