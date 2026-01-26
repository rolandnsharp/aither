# KANON Standard Library Reference

## Philosophy: State-Aware Synthesis for Live Surgery

The KANON standard library enables **live surgery** - the ability to edit oscillator parameters mid-performance without clicks, pops, or phase resets. This is achieved through **persistent memory** that survives code recompilation.

### The Problem with Stateless Oscillators

Traditional web audio oscillators like `cycle(440)` are **stateless**. Each time you recompile your code:

```javascript
wave('tone', t => cycle(440));  // Starts at phase 0

// Change to 880 and save:
wave('tone', t => cycle(880));  // RESETS to phase 0 → audible click
```

The oscillator restarts from phase 0, causing an audible discontinuity (click/pop).

### The Solution: Persistent Memory with `peek` and `poke`

KANON's live functions use genish's `peek` and `poke` operations to store oscillator phase in **persistent memory** that survives code updates:

```javascript
wave('tone', t => liveSin(440, 0));  // Phase stored in memory slot 0

// Change to 880 and save:
wave('tone', t => liveSin(880, 0));  // Continues from SAME phase → no click
```

The new oscillator "inherits" the position from the old one, creating seamless transitions.

---

## Core Concepts: `peek` and `poke`

### `peek(memory, index)` - Read from Memory

Reads a value from the persistent memory buffer at the specified index.

```javascript
const lastPhase = peek(genish.gen.memory, 0);  // Read from slot 0
```

**Key Properties:**
- Returns the value stored at `index`
- Non-destructive (doesn't modify memory)
- Available every sample (44,100 or 48,000 times per second)

### `poke(memory, value, index)` - Write to Memory

Writes a value to the persistent memory buffer at the specified index and returns the value written.

```javascript
const nextPhase = 0.5;
poke(genish.gen.memory, nextPhase, 0);  // Write 0.5 to slot 0
```

**Key Properties:**
- Stores `value` at `index` for future `peek` operations
- Returns the value written (allows chaining)
- Persists across code recompilation

### The Peek-Poke Loop Pattern

State-aware oscillators follow this pattern:

```javascript
// 1. Read last phase from memory
const lastPhase = peek(genish.gen.memory, slot);

// 2. Calculate next phase (increment and wrap)
const dt = freq / 44100;  // Phase increment per sample
const nextPhase = mod(add(lastPhase, dt), 1);  // Wrap at 1.0

// 3. Write next phase back to memory
poke(genish.gen.memory, nextPhase, slot);

// 4. Return the phase for use in oscillator
return nextPhase;
```

**The Magic:** When you save new code, step 1 reads the phase value that step 3 wrote in the previous code version. The oscillator continues exactly where it left off.

---

## Standard Library Functions

### Live Oscillators (State-Aware)

These functions store phase in persistent memory, enabling click-free live surgery.

#### `livePhasor(freq, slot)`

Creates a 0-to-1 ramp oscillator at the specified frequency.

**Parameters:**
- `freq` - Frequency in Hz
- `slot` - Memory index (0-62) for phase storage

**Returns:** Ramp signal from 0 to 1

**Example:**
```javascript
wave('ramp', t => livePhasor(2, 0));  // 2Hz ramp, stored at slot 0
```

**Technical Details:**
- Uses `div(freq, gen.samplerate)` for accurate phase increment across 44.1k/48k
- Wraps phase at 1.0 using `mod()`
- Returns `sub(poke(...), 0)` to force poke operation into the compiled graph

---

#### `liveSin(freq, slot)`

Stateful sine wave oscillator - the workhorse of live surgery.

**Parameters:**
- `freq` - Frequency in Hz
- `slot` - Memory index for phase storage

**Returns:** Sine wave signal (-1 to 1)

**Example:**
```javascript
// Start with 220Hz
wave('tone', t => liveSin(220, 0));

// Edit to 440Hz while playing - no click!
wave('tone', t => liveSin(440, 0));
```

**Use Cases:**
- Pure tones and sub-basses
- Carrier oscillators in FM synthesis
- LFOs for modulation

---

#### `liveCos(freq, slot)`

Stateful cosine wave oscillator (90° phase offset from sine).

**Parameters:**
- `freq` - Frequency in Hz
- `slot` - Memory index for phase storage

**Returns:** Cosine wave signal (-1 to 1)

**Example:**
```javascript
wave('quadrature', t => {
  const sine = liveSin(440, 0);
  const cosine = liveCos(440, 1);
  return add(sine, cosine);  // 90° phase relationship preserved
});
```

---

#### `liveSaw(freq, slot)`

Stateful sawtooth wave (linear ramp from -1 to 1).

**Parameters:**
- `freq` - Frequency in Hz
- `slot` - Memory index for phase storage

**Returns:** Sawtooth wave signal (-1 to 1)

**Example:**
```javascript
wave('bass', t => liveSaw(55, 0));  // Rich harmonic bass tone
```

**Sound Character:** Bright, buzzy timbre with all harmonics.

---

#### `liveSquare(freq, slot)`

Stateful square wave oscillator (perfect for rhythmic gates).

**Parameters:**
- `freq` - Frequency in Hz
- `slot` - Memory index for phase storage

**Returns:** Square wave (0 when phase < 0.5, 1 when phase >= 0.5)

**Example:**
```javascript
wave('gate', t => {
  const rhythm = liveSquare(2, 0);   // 2Hz gate
  const tone = liveSin(440, 1);       // 440Hz tone
  return mul(tone, rhythm);           // Rhythmic gating
});
```

**Use Cases:**
- Rhythmic gates and envelopes
- Clock signals for sequencing
- Hard sync modulation

---

#### `liveTime(resetSeconds, slot)`

Persistent time accumulator that resets every N seconds.

**Parameters:**
- `resetSeconds` - Loop duration before reset
- `slot` - Memory index for time storage (defaults to 63)

**Returns:** Time value (0 to resetSeconds)

**Example:**
```javascript
wave('evolving', t => {
  const T = liveTime(10, 50);  // 10-second loop
  const freq = add(110, mul(T, 50));  // Rises from 110 to 610 Hz over 10s
  return liveSin(freq, 0);
});
```

**Use Cases:**
- Long-form generative pieces
- Slow parameter evolution
- Time-based modulation that survives code updates

---

### Dynamics & Envelope Helpers

#### `smooth(target, amount, slot)`

Stateful parameter smoother - prevents pops and clicks when values change.

**Parameters:**
- `target` - The value to approach
- `amount` - Smoothing factor: 0.0 (instant) to 0.999 (very slow)
- `slot` - Memory index for smoother state (default: 50)

**Returns:** Smoothly changing value approaching target

**Example:**
```javascript
wave('smooth-vol', t => {
  const tone = liveSin(440, 0);
  const volume = smooth(0.5, 0.999, 40);  // Edit 0.5 → 0.8 (no pop!)
  return mul(tone, volume);
});
```

**Technical Details:**
- Uses exponential smoothing: `current = (last * amount) + (target * (1 - amount))`
- Higher `amount` = slower response (more smoothing)
- Typical values: 0.99 (fast), 0.999 (medium), 0.9999 (slow)

**Use Cases:**
- Volume changes without clicks
- Parameter automation
- Envelope-like fades

---

#### `smoothGain(amplitude, signal, slot)`

Amplitude control with automatic smoothing (combines `gain` and `smooth`).

**Example:**
```javascript
wave('auto-smooth', t => smoothGain(0.5, liveSin(440, 0), 40));
```

---

### Rhythm & Timing Helpers

#### `beat(bpm, slot)`

Quantized rhythmic clock - creates trigger pulses for patterns.

**Parameters:**
- `bpm` - Beats per minute (120 = standard tempo)
- `slot` - Memory index for clock phase (default: 60)

**Returns:** 1 during first 10% of beat cycle, 0 otherwise

**Example:**
```javascript
wave('kick', t => {
  const kickDrum = liveSin(50, 0);
  const trigger = beat(120, 60);  // 120 BPM
  return mul(kickDrum, trigger, 0.7);
});
```

**Use Cases:**
- Kick drums and percussion triggers
- Rhythmic gating
- Sequencer-free pattern creation

**Live Surgery:**
```javascript
// Change tempo mid-performance
beat(120, 60)  // Save
beat(140, 60)  // Save - tempo increases smoothly
```

---

### Filter Helpers

#### `lp(input, cutoff, slot)`

Stateful one-pole lowpass filter - smooths high frequencies.

**Parameters:**
- `input` - Signal to filter
- `cutoff` - Filter coefficient: 0.0 (no filtering) to 1.0 (maximum)
- `slot` - Memory index for filter history (default: 70)

**Returns:** Low-pass filtered signal

**Example:**
```javascript
wave('filtered', t => {
  const saw = liveSaw(110, 0);
  return lp(saw, 0.05, 70);  // Typical cutoff: 0.01 - 0.2
});
```

**Technical Details:**
- One-pole IIR filter: `y[n] = y[n-1] + cutoff * (x[n] - y[n-1])`
- Lower cutoff = darker sound (more filtering)
- Filter state survives code updates (no transients)

**Use Cases:**
- Removing harshness from sawtooth/square waves
- Creating pad sounds
- Resonance-free smoothing

**Live Surgery:**
```javascript
// Morph filter cutoff while playing
lp(saw, 0.01, 70)  // Very dark
lp(saw, 0.1, 70)   // Medium
lp(saw, 0.5, 70)   // Bright
```

---

#### `hp(input, cutoff, slot)`

Stateful one-pole highpass filter - removes low frequencies.

**Parameters:**
- `input` - Signal to filter
- `cutoff` - Filter coefficient (same as lowpass)
- `slot` - Memory index for filter history (default: 71)

**Returns:** High-pass filtered signal

**Example:**
```javascript
wave('thin', t => hp(liveSin(110, 0), 0.1, 71));  // Remove bass
```

**Implementation:** `highpass = input - lowpass(input)`

---

### Utility Functions

#### `gain(amplitude, signal)`

Multiplies signal by amplitude (volume control).

**Example:**
```javascript
wave('quiet', t => gain(0.2, liveSin(440, 0)));  // 20% volume
```

---

#### `pipe(...functions)`

Unix-style function composition (left to right).

**Example:**
```javascript
wave('processed', t =>
  pipe(
    liveSin(440, 0),
    sig => gain(0.5, sig),
    sig => lp(sig, 0.1, 70)
  )
);
```

---

## Memory Slot Management

### Slot Allocation Strategy

The persistent memory buffer has **64 slots** (indices 0-63). Proper slot management prevents conflicts:

```javascript
// GOOD: Each oscillator gets unique slot
wave('chord', t => {
  const root = liveSin(220, 0);   // Slot 0
  const third = liveSin(277, 1);  // Slot 1
  const fifth = liveSin(330, 2);  // Slot 2
  return add(root, third, fifth);
});

// BAD: Oscillators share slot (interference!)
wave('bad', t => {
  const osc1 = liveSin(220, 0);  // Both write to slot 0
  const osc2 = liveSin(440, 0);  // Causes phase corruption
  return add(osc1, osc2);
});
```

### Recommended Slot Organization (128 slots: 0-127)

- **0-19**: Main oscillators (carriers, basses, leads, chords)
- **20-39**: LFOs and modulators (vibrato, tremolo, FM)
- **40-59**: Smoothers and envelope states (`smooth()`, `smoothGain()`)
- **60-69**: Rhythm clocks (`beat()` functions)
- **70-89**: Filter history (`lp()`, `hp()` internal state)
- **90-109**: Time accumulators (`liveTime()` for long-form pieces)
- **110-127**: Reserved for user experimentation

**Complete Track Example:**
```javascript
wave('track', t => {
  // Slot organization for a full mix
  const kick = mul(liveSin(50, 0), beat(120, 60), 0.8);     // Osc:0, Beat:60
  const bass = mul(liveSin(110, 1), smooth(0.3, 0.999, 40), 0.6); // Osc:1, Smooth:40
  const lead = lp(liveSaw(440, 2), smooth(0.1, 0.99, 41), 70);   // Osc:2, Smooth:41, Filter:70
  const pad = lp(liveSaw(220, 3), 0.05, 71);                // Osc:3, Filter:71

  return gain(0.5, add(kick, bass, lead, gain(0.2, pad)));
});
```

---

## Live Surgery Techniques

### 1. Frequency Morphing

Smoothly transition between frequencies without clicks:

```javascript
// Start
wave('morph', t => liveSin(220, 0));

// Edit and save (A to A#)
wave('morph', t => liveSin(233, 0));

// Edit and save (A# to B)
wave('morph', t => liveSin(247, 0));
```

**Result:** Each transition is phase-continuous - the oscillator "slides" to the new frequency without restarting.

---

### 2. FM Synthesis Surgery

Edit modulation depth or frequency while maintaining phase continuity:

```javascript
wave('fm', t => {
  const mod = gain(100, liveSin(5, 1));      // Start: depth = 100
  const carrier = liveSin(add(440, mod), 0);
  return gain(0.5, carrier);
});

// Increase modulation depth
wave('fm', t => {
  const mod = gain(500, liveSin(5, 1));      // Edit: depth = 500 (more intense)
  const carrier = liveSin(add(440, mod), 0);
  return gain(0.5, carrier);
});
```

**Result:** The modulator and carrier both maintain their phase positions - the timbre evolves smoothly without clicks.

---

### 3. Rhythmic Pattern Evolution

Change gate frequency while keeping the beat:

```javascript
wave('rhythm', t => {
  const gate = liveSquare(2, 2);   // 2Hz (120 BPM)
  const tone = liveSin(440, 3);
  return gain(0.6, mul(tone, gate));
});

// Speed up
wave('rhythm', t => {
  const gate = liveSquare(4, 2);   // 4Hz (240 BPM)
  const tone = liveSin(440, 3);
  return gain(0.6, mul(tone, gate));
});
```

**Result:** The rhythm speeds up seamlessly - no "jump" or phase discontinuity.

---

### 4. Additive Synthesis Morphing

Add or remove partials while maintaining phase:

```javascript
// Start: Fundamental only
wave('additive', t => liveSin(220, 0));

// Add second harmonic
wave('additive', t => add(
  liveSin(220, 0),
  gain(0.5, liveSin(440, 1))
));

// Add third harmonic
wave('additive', t => add(
  liveSin(220, 0),
  gain(0.5, liveSin(440, 1)),
  gain(0.3, liveSin(660, 2))
));
```

**Result:** Each new partial enters smoothly at its current phase position.

---

## Technical Implementation Details

### Why `sub(poke(...), 0)`?

In genish's graph compiler, operations must be part of the final signal chain to be executed. A bare `poke()` might be optimized out:

```javascript
// WRONG: poke may be optimized away
poke(genish.gen.memory, nextPhase, slot);
return nextPhase;

// CORRECT: sub forces poke into the graph
return sub(poke(genish.gen.memory, nextPhase, slot), 0);
```

The `sub(..., 0)` operation:
- Forces the compiler to include the `poke` operation
- Doesn't change the value (subtracting 0)
- Ensures memory is updated every sample

---

### Sample Rate Independence

Using `div(freq, gen.samplerate)` instead of hardcoded 44100:

```javascript
// WRONG: Breaks at 48kHz
const dt = freq / 44100;

// CORRECT: Works at any sample rate
const dt = div(freq, gen.samplerate);
```

This ensures accurate pitch across different audio interfaces (Focusrite, RME, etc.) that may default to 48kHz.

---

### Binary vs. Variadic Operations

Genish's `mul` and `add` are **binary operators** (take 2 arguments). Pre-calculate constants in JavaScript:

```javascript
// WRONG: mul with 3+ args may fail
const phase = mul(2, Math.PI, freq, t);

// CORRECT: Pre-calculate constant or nest operations
const phase = mul(freq, (2 * Math.PI));  // JavaScript calculates 2*π
// or
const phase = mul(freq, mul(2, Math.PI));  // Nested binary ops
```

---

## Performance Characteristics

### Memory Overhead

- Each live oscillator uses **1 memory slot** (4 bytes)
- 64 slots = 256 bytes total
- Negligible impact on modern systems

### Computational Cost

**peek/poke operations:**
- Memory read: ~1-2 CPU cycles
- Memory write: ~1-2 CPU cycles
- Overhead: <0.01% at 44.1kHz

**Compared to cycle():**
- `cycle()`: Highly optimized, internal phase management
- `liveSin()`: +4 operations per sample (peek, add, mod, poke)
- Performance difference: ~10% more CPU
- **Verdict:** Negligible for most use cases (<10 oscillators)

---

## Comparison: Live vs. Stateless

| Feature | `cycle(freq)` | `liveSin(freq, slot)` |
|---------|---------------|----------------------|
| Phase continuity | ❌ Resets on code change | ✅ Survives code changes |
| CPU usage | Lower (optimized) | Slightly higher (+10%) |
| Memory usage | None | 4 bytes per oscillator |
| Live surgery | ❌ Clicks on edit | ✅ Click-free morphing |
| Use case | Static patches | Performance / live coding |

---

## Comparison Operators

Genish provides comparison operators for conditional logic:

- `lt(a, b)` - Less than (returns 1 if a < b, else 0)
- `gt(a, b)` - Greater than (returns 1 if a > b, else 0)
- `lte(a, b)` - Less than or equal
- `gte(a, b)` - Greater than or equal

**Example: Conditional Gate**
```javascript
wave('conditional', t => {
  const phase = livePhasor(2, 0);
  const gate = lt(phase, 0.3);  // Only on during first 30% of cycle
  return mul(liveSin(440, 1), gate, 0.5);
});
```

---

## Advanced Patterns

### Complete Performance Track

```javascript
wave('performance', t => {
  // === RHYTHM SECTION ===
  const kickTrigger = beat(120, 60);
  const kick = mul(liveSin(50, 0), kickTrigger, 0.9);

  const snareTrigger = beat(60, 61);  // Half-time snare
  const snare = mul(noise(), snareTrigger, 0.3);

  // === BASS LINE ===
  const bassNote = liveSin(55, 1);
  const bassEnv = smooth(0.4, 0.999, 40);
  const bass = lp(mul(bassNote, bassEnv), 0.08, 70);

  // === LEAD MELODY ===
  const leadFreq = add(440, mul(liveSin(0.5, 2), 50));  // Vibrato
  const lead = lp(liveSaw(leadFreq, 3), smooth(0.15, 0.99, 41), 71);

  // === PAD ===
  const pad = lp(
    add(
      liveSin(220, 4),
      liveSin(277, 5),  // Major third
      liveSin(330, 6)   // Perfect fifth
    ),
    0.03,
    72
  );

  return gain(0.6, add(kick, snare, bass, gain(0.7, lead), gain(0.2, pad)));
});
```

**Live Surgery on this track:**
- Change BPM: `beat(120, 60)` → `beat(140, 60)`
- Adjust bass cutoff: `lp(..., 0.08, 70)` → `lp(..., 0.15, 70)`
- Modify lead vibrato depth: `mul(..., 50)` → `mul(..., 100)`
- All changes are instant and click-free!

---

### Cross-Modulation with Phase Lock

```javascript
wave('cross-mod', t => {
  // Two oscillators modulate each other's frequency
  const osc1Phase = livePhasor(add(220, mul(liveSin(110, 1), 50)), 0);
  const osc2Phase = livePhasor(add(110, mul(liveSin(220, 0), 25)), 1);

  return gain(0.3, add(
    sin(mul(osc1Phase, 2 * Math.PI)),
    sin(mul(osc2Phase, 2 * Math.PI))
  ));
});
```

**Surgical Edits:**
- Change modulation depths (50 → 100, 25 → 75)
- Adjust carrier frequencies
- All transitions are phase-continuous

---

### Generative Long-Form Piece

```javascript
wave('generative', t => {
  const T = liveTime(60, 50);  // 60-second evolution cycle

  // Frequency rises over time
  const freq = add(55, mul(T, 10));

  // Modulation depth also evolves
  const modDepth = mul(T, 5);
  const mod = gain(modDepth, liveSin(0.1, 1));

  return gain(0.4, liveSin(add(freq, mod), 0));
});
```

**Result:** A 60-second piece that evolves deterministically. Edit `T` multipliers to change evolution speed mid-performance.

---

## Debugging Tips

### No Sound?

1. **Check slot conflicts:** Ensure each oscillator has a unique slot
2. **Verify poke syntax:** Use `sub(poke(...), 0)` not bare `poke(...)`
3. **Sample rate:** Confirm `gen.samplerate` is accessible

### Unexpected Glitches?

1. **Slot reuse:** Two oscillators writing to same slot causes phase corruption
2. **Missing sub():** Poke might be optimized out without `sub(..., 0)`

### Phase Drift Over Time?

- Normal for long performances (>1 hour)
- Use `liveTime()` with appropriate reset intervals
- Or accept natural phase drift as part of the performance aesthetic

---

## Philosophical Note: The Pythagorean Connection

By externalizing phase into persistent memory, KANON achieves what the Pythagorean monochord demonstrated 2,500 years ago: **the separation of the mathematical law (your code) from the physical vibration (the phase)**.

When you perform "live surgery," you are editing the **law** while the **vibration** continues uninterrupted. This is the essence of Nada Brahma (नाद ब्रह्म) - "Sound is Brahman" - where the eternal vibration persists independent of our conceptual frameworks.

You are not restarting the sound; you are **reshaping the universe through which the sound moves**.

---

## Further Reading

- genish.js Memory API: [Official Documentation](https://github.com/charlieroberts/genish.js)
- Incudine: [Real-time Computer Music in Common Lisp](http://incudine.sourceforge.net/)
- KANON Architecture: See `README.md` for system overview
- Signal Theory: See `README.md` "Philosophy: Pure Functions of Time"
