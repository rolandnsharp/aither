// wave-dsp.js
// A functional DSP library wrapping genish.js
// These helpers work with genish graph objects

// Note: In the worklet, genish is available as globalThis.genish
// In the browser, it's window.genish

// ============================================================================
// MEMORY SLOT ALLOCATION STRATEGY
// ============================================================================
// The engine has 128 memory slots (0-127) for persistent state.
// Organize your slots to prevent conflicts:
//
// Recommended Layout:
// 0-19:   Main oscillator phases (carriers, basses, leads)
// 20-39:  LFO and modulator phases
// 40-59:  Smoother/envelope states (smooth(), smoothGain())
// 60-69:  Rhythm clocks (beat())
// 70-89:  Filter history (lp(), hp())
// 90-109: Time accumulators (liveTime())
// 110-127: Reserved for user experimentation
//
// Example:
//   wave('track', t => {
//     const carrier = liveSin(440, 0);        // Slot 0: main oscillator
//     const lfo = liveSin(5, 20);             // Slot 20: modulator
//     const envelope = smooth(0.5, 0.99, 40); // Slot 40: envelope
//     const kick = beat(120, 60);             // Slot 60: rhythm
//     return lp(mul(carrier, envelope), 0.1, 70);  // Slot 70: filter
//   });
// ============================================================================

// Alias Math.PI for clean syntax in signal.js (compiled as a constant)
const PI = Math.PI;

// Basic oscillators - work with genish objects
const cycle = (freq) => globalThis.genish.cycle(freq);
const phasor = (freq) => globalThis.genish.phasor(freq);
const noise = () => globalThis.genish.noise();

// Math helpers - variadic wrappers for genish primitives
const add = (...args) => {
  if (args.length === 0) return 0;
  if (args.length === 1) return args[0];
  return args.reduce((a, b) => globalThis.genish.add(a, b));
};

const mul = (...args) => {
  if (args.length === 0) return 1;
  if (args.length === 1) return args[0];
  return args.reduce((a, b) => globalThis.genish.mul(a, b));
};

// The "Readable Math" Helper - provides wrapped time for pure function synthesis
// Wraps t at 1.0 second to keep all math operations with small numbers
// This prevents floating-point precision loss while maintaining pure math
// Usage: wave('name', t => signal(t, T =>
//   mul(sin(mul(T, (2 * Math.PI * freq))), gain)
// ))
const signal = (t, userFunc) => {
  // Wrap time at 1.0 to create a "local second" - prevents precision loss
  const T = g.mod(t, 1);
  return userFunc(T);
};

// ============================================================================
// KANON STANDARD LIBRARY - State-Aware Oscillators for Live Surgery
// ============================================================================
// These functions use persistent memory (peek/poke) so phase survives code
// recompilation. This enables click-free "surgical" editing mid-performance.

// livePhasor: Creates a 0-1 ramp at 'freq' Hz with persistent phase (EXPERIMENTAL)
// KNOWN ISSUE: Currently produces NaN - peek/poke not working in AudioWorklet
// TODO: Debug or find alternative approach
const livePhasor = (freq, idx = 0) => {
  const mem = stateSlot(idx);
  const lastPhase = g.peek(mem, 0, { mode: 'samples' });
  const dt = g.div(freq, 44100);
  const nextPhase = g.mod(g.add(lastPhase, dt), 1);
  return g.sub(g.poke(mem, nextPhase, 0), 0);
};

// phasor: Working alternative using accum() (no persistence)
// Use this until livePhasor is fixed
// NOTE: Phase resets on code changes
const phasorSimple = (freq) => {
  return g.mod(g.accum(g.div(freq, 44100)), 1);
};

// liveSin: Stateful sine oscillator (EXPERIMENTAL - currently broken)
const liveSin = (freq, idx = 0) => {
  return g.sin(g.mul(livePhasor(freq, idx), 2 * Math.PI));
};

// sinSimple: Working sine oscillator using phasorSimple
// Use this for now - reliable but resets on code changes
const sinSimple = (freq) => {
  return g.sin(g.mul(phasorSimple(freq), 2 * Math.PI));
};

// liveCos: Cosine oscillator (EXPERIMENTAL - currently broken)
const liveCos = (freq, idx = 0) => {
  return g.cos(g.mul(livePhasor(freq, idx), 2 * Math.PI));
};

// liveSaw: Sawtooth wave (EXPERIMENTAL - currently broken)
const liveSaw = (freq, idx = 0) => {
  const phase = livePhasor(freq, idx);
  return g.sub(g.mul(phase, 2), 1);
};

// liveSquare: Square wave (EXPERIMENTAL - currently broken)
const liveSquare = (freq, idx = 0) => {
  const phase = livePhasor(freq, idx);
  return g.gt(phase, 0.5);
};

// liveTime: Time accumulator (EXPERIMENTAL - currently broken)
const liveTime = (resetSeconds, idx = 63) => {
  const mem = stateSlot(idx);
  const lastT = g.peek(mem, 0, { mode: 'samples' });
  const dt = g.div(1, 44100);
  const nextT = g.mod(g.add(lastT, dt), resetSeconds);
  return g.sub(g.poke(mem, nextT, 0), 0);
};

// ============================================================================
// DYNAMICS & ENVELOPE HELPERS
// ============================================================================

// smooth: Parameter smoother (EXPERIMENTAL - currently broken)
const smooth = (target, amount = 0.99, slot = 50) => {
  const mem = stateSlot(slot);
  const lastVal = g.peek(mem, 0, { mode: 'samples' });
  const nextVal = g.add(
    g.mul(lastVal, amount),
    g.mul(target, g.sub(1, amount))
  );
  return g.sub(g.poke(mem, nextVal, 0), 0);
};

// smoothSimple: Working alternative using history()
const smoothSimple = (target, amount = 0.99) => {
  const lastVal = g.history(target, 1);
  return g.add(
    g.mul(lastVal, amount),
    g.mul(target, g.sub(1, amount))
  );
};

// ============================================================================
// RHYTHM & TIMING HELPERS
// ============================================================================

// beat: Quantized rhythmic clock (returns 1 on beat, 0 otherwise)
// Creates a trigger pulse for rhythmic patterns
const beat = (bpm = 120, slot = 60) => {
  const bps = g.div(bpm, 60);  // Beats per second
  const phase = livePhasor(bps, slot);
  // Return 1 if phase is in first 10% of cycle (short pulse)
  return g.lt(phase, 0.1);
};

// ============================================================================
// FILTER HELPERS
// ============================================================================

// lp: Stateful one-pole lowpass filter
// lp: One-pole lowpass filter (EXPERIMENTAL - currently broken)
const lp = (input, cutoff = 0.1, slot = 70) => {
  const mem = stateSlot(slot);
  const history = g.peek(mem, 0, { mode: 'samples' });
  const out = g.add(history, g.mul(cutoff, g.sub(input, history)));
  return g.sub(g.poke(mem, out, 0), 0);
};

// lpSimple: Working alternative using history()
const lpSimple = (input, cutoff = 0.1) => {
  const lastOut = g.history(input, 1);
  return g.add(lastOut, g.mul(cutoff, g.sub(input, lastOut)));
};

// hp: One-pole highpass filter (EXPERIMENTAL - currently broken)
const hp = (input, cutoff = 0.1, slot = 71) => {
  const lowpassed = lp(input, cutoff, slot);
  return g.sub(input, lowpassed);
};

// hpSimple: Working alternative
const hpSimple = (input, cutoff = 0.1) => {
  const lowpassed = lpSimple(input, cutoff);
  return g.sub(input, lowpassed);
};

// ============================================================================
// EFFECTS PROCESSORS (Stateful, survive code updates)
// ============================================================================

// echo: Feedback delay effect
// time: Delay time in samples (use: 44100 = 1 second, 11025 = 250ms)
// feedback: 0.0 to 0.99 (amount of repeats)
// Example: echo(11025, 0.6) = 250ms delay with 60% feedback
const echo = (input, time = 11025, feedback = 0.5) => {
  // genish.delay handles internal buffer management
  return g.delay(input, time, { feedback: feedback });
};

// dub: Dub-style delay with filtering on feedback
// Creates darker, more organic repeats
const dub = (input, time = 22050, feedback = 0.7, darkening = 0.1) => {
  const d = g.delay(input, time, { feedback: feedback });
  // Filter the delayed signal for darker repeats
  return g.add(input, lp(d, darkening, 80));
};

// crush: Bitcrusher (lo-fi digital degradation)
// bits: 1-16 (lower = more degraded, 16 = clean)
const crush = (input, bits = 8) => {
  const step = 1 / Math.pow(2, bits);
  return g.mul(g.floor(g.div(input, step)), step);
};

// saturate: Soft clipping / tape saturation
// drive: 1.0 (clean) to 10.0 (heavy distortion)
const saturate = (input, drive = 2.0) => {
  const gained = g.mul(input, drive);
  // tanh provides smooth saturation curve
  return g.tanh(gained);
};

// fold: Wavefolding distortion (Buchla-style)
// amount: 1.0 (clean) to 4.0 (extreme folding)
const fold = (input, amount = 2.0) => {
  const scaled = g.mul(input, amount);
  // Fold by taking sin of the scaled signal
  return g.sin(g.mul(scaled, Math.PI));
};

// reverb: Simple algorithmic reverb using multiple delays
// Creates space using Schroeder reverberator architecture
const reverb = (input, size = 0.5, damping = 0.3) => {
  // Multiple delay lines at different lengths create reverb effect
  const d1 = g.delay(input, 1557, { feedback: size });
  const d2 = g.delay(input, 1617, { feedback: size });
  const d3 = g.delay(input, 1491, { feedback: size });
  const d4 = g.delay(input, 1422, { feedback: size });

  // Mix all delays together
  const wet = g.mul(g.add(d1, d2, d3, d4), 0.25);

  // Apply damping (lowpass filter on wet signal)
  const damped = lp(wet, damping, 81);

  // Mix with dry signal (50/50)
  return g.add(g.mul(input, 0.5), g.mul(damped, 0.5));
};

// pingPong: Stereo ping-pong delay (requires stereo output)
// Returns [left, right] array
const pingPong = (input, time = 11025, feedback = 0.6) => {
  const left = g.delay(input, time, { feedback: feedback });
  const right = g.delay(left, time, { feedback: feedback });
  return [left, right];
};

// feedback: Generic feedback loop with processing
// Creates recursive effects by routing output back to input with delay
// processFn: Function to apply in the feedback path (e.g., filtering, distortion)
// amount: 0.0-0.99 (feedback amount - higher = more intense)
// time: Delay time in samples before feedback (min 1 sample to prevent infinite loop)
const feedback = (input, processFn, amount = 0.5, time = 1) => {
  // Single-sample delay creates feedback loop
  const delayed = g.delay(input, time, { feedback: 0 });

  // Apply processing function to feedback path
  const processed = processFn(delayed);

  // Mix processed feedback with input
  return g.add(input, g.mul(processed, amount));
};

// comb: Comb filter using feedback (creates metallic/resonant tones)
// time: Delay time in samples (determines pitch of resonance)
// feedback: 0.0-0.99 (higher = longer resonance)
const comb = (input, time = 441, feedback = 0.7) => {
  return g.delay(input, time, { feedback: feedback });
};

// karplus: Karplus-Strong string synthesis (plucked string simulation)
// freq: Fundamental frequency of string
// damping: 0.0-1.0 (higher = faster decay)
// impulse: Initial excitation signal (usually noise burst)
const karplus = (impulse, freq, damping = 0.995) => {
  // Hardcode sample rate to avoid accessing g.gen at module load time
  const delayTime = Math.floor(44100 / freq);

  // Feedback loop with averaging filter (simulates string loss)
  const fb = g.delay(impulse, delayTime, { feedback: damping });

  // Simple averaging lowpass in feedback path
  return lp(fb, 0.5, 82);
};

// ============================================================================
// FUNCTIONAL COMPOSITION HELPERS
// ============================================================================

// gain: Amplitude control
const gain = (amt, sig) => g.mul(sig, amt);

// smoothGain: Amplitude control with automatic smoothing (prevents clicks)
const smoothGain = (amt, sig, slot = 51) => {
  return g.mul(sig, smooth(amt, 0.999, slot));
};

// pipe: Unix-style function composition
// Usage: pipe(liveSin(440, 0), s => gain(0.5, s), s => echo(s, 11025, 0.6))
const pipe = (...fns) => {
  return fns.reduce((acc, fn) => fn(acc));
};

// Composable helpers - The "Kanonical" Way
// IMPORTANT: Use cycle() for oscillators (it handles phase internally, preventing precision loss)
// Use 't' parameter for modulation, envelopes, and control signals

const bass = (freq) => {
  // Use cycle() instead of sin(2π*freq*t) - it's optimized and stable forever
  return g.mul(g.cycle(freq), 0.6); // Louder for laptop speakers
};

const wobble = (freq, rate) => {
  // FM synthesis using cycle() for both carrier and modulator
  const mod = g.mul(g.cycle(rate), 20);
  const modFreq = g.add(freq, mod);
  return g.mul(g.cycle(modFreq), 0.5);
};

// Make functions available globally
// In worklet context, attach to globalThis
// In browser context, attach to window
const globalScope = typeof window !== 'undefined' ? window : globalThis;

// Expose ALL genish primitives for compiled callbacks AND clean user syntax
// The compiled genish code references these by bare name (e.g., sin(), mul(), add(), etc.)
const g = globalScope.genish;

// =============================================================================
// LIVE SURGERY SYSTEM - Explicit State Management
// =============================================================================
// Instead of genish peek/poke (which produces NaN in AudioWorklets),
// we use a simple Float32Array (SURGICAL_STATE) that persists across
// code recompilations. User functions receive it as the 'state' parameter.
//
// Example:
//   wave('tone', (t, state) => {
//     const phase = state[0];
//     state[0] = (phase + 220/44100) % 1.0;
//     return sin(state[0] * 2 * PI) * 0.7;
//   });
// =============================================================================

// NOTE: For live surgery with explicit state management, write state operations
// directly in your wave() functions. The 'state' parameter is a Float32Array
// that persists across code changes.
//
// Example pattern:
//   wave('tone', (t, state) => {
//     // Read phase from state[0]
//     let phase = state[0] || 0;
//
//     // Update phase
//     phase = (phase + 220/44100) % 1.0;
//     state[0] = phase;
//
//     // Use genish for signal processing
//     return mul(sin(mul(phase, 2 * PI)), 0.7);
//   });
//
// This gives click-free live surgery! Change 220 to 440 and save -
// the phase continues from where it was.

// SINGLETON: Cache of genish data() objects that persist across recompilations
if (!globalScope.__KANON_DATA_CACHE__) {
  globalScope.__KANON_DATA_CACHE__ = new Map();
  globalScope.__KANON_USED_SLOTS__ = new Set();
}

// High-performance state slot access with caching
const stateSlot = (idx) => {
  // Validate slot index
  if (idx < 0 || idx >= 256) {
    console.warn(`State slot ${idx} out of bounds (0-255), clamping`);
    idx = Math.max(0, Math.min(idx, 255));
  }

  // Track usage for debugging
  globalScope.__KANON_USED_SLOTS__.add(idx);

  // Return cached data object if it exists
  if (globalScope.__KANON_DATA_CACHE__.has(idx)) {
    return globalScope.__KANON_DATA_CACHE__.get(idx);
  }

  // Create new data object using genish's own data() function
  const dataObj = g.data(1);

  // Initialize the buffer to zero
  if (dataObj.buffer) {
    dataObj.buffer[0] = 0;
  }

  // Cache it for future use
  globalScope.__KANON_DATA_CACHE__.set(idx, dataObj);

  return dataObj;
};

// =============================================================================
// WORKFLOW SUPPORT: State Management Helpers
// =============================================================================

// resetState: Manually reset a state slot
const resetState = (idx, value = 0) => {
  const slot = stateSlot(idx);
  if (slot.buffer) {
    slot.buffer[0] = value;
  }
  return value;
};

// copyState: Copy state between slots
const copyState = (fromIdx, toIdx) => {
  const fromSlot = stateSlot(fromIdx);
  const toSlot = stateSlot(toIdx);
  if (fromSlot.buffer && toSlot.buffer) {
    toSlot.buffer[0] = fromSlot.buffer[0];
  }
  return toSlot.buffer ? toSlot.buffer[0] : 0;
};

// getStateDebug: Development helper to inspect state
const getStateDebug = () => {
  const usedSlots = Array.from(globalScope.__KANON_USED_SLOTS__);
  const values = {};
  for (const idx of usedSlots) {
    const slot = globalScope.__KANON_DATA_CACHE__.get(idx);
    if (slot && slot.buffer) {
      values[idx] = slot.buffer[0];
    }
  }
  return {
    usedSlots: usedSlots,
    values: values,
    cacheSize: globalScope.__KANON_DATA_CACHE__.size,
    memoryUsage: `${(globalScope.__KANON_DATA_CACHE__.size * 4 / 1024).toFixed(2)}KB`
  };
};

// ============================================================================
// PERSISTENT MEMORY - Use STATE for live surgery
// ============================================================================
// STATE is allocated ONCE in the worklet global scope (see worklet.js)
// It's a Float32Array wrapped in an object compatible with peek/poke
// This persists across code hot-swaps, enabling click-free live surgery

// Expose genish primitives as bare names for clean math syntax
// This allows: mul(sin(mul(2, PI, 55, t)), 0.6) instead of genish.mul(genish.sin(...))
globalScope.seq = g.seq;  // Critical for ensuring poke operations execute
globalScope.sin = g.sin;
globalScope.cos = g.cos;
globalScope.tan = g.tan;
globalScope.tanh = g.tanh;
globalScope.abs = g.abs;
globalScope.round = g.round;
globalScope.floor = g.floor;
globalScope.add = g.add;
globalScope.sub = g.sub;
globalScope.mul = g.mul;
globalScope.div = g.div;
globalScope.pow = g.pow;
globalScope.sqrt = g.sqrt;
globalScope.min = g.min;
globalScope.max = g.max;
globalScope.accum = g.accum;
globalScope.counter = g.counter;
globalScope.data = g.data;
globalScope.delay = g.delay;
globalScope.peek = g.peek;
globalScope.poke = g.poke;
globalScope.param = g.param;  // Create parameters that can be updated from JavaScript
globalScope.history = g.history;  // Single-sample delay for feedback loops
globalScope.mod = g.mod;
globalScope.lt = g.lt;  // Less than (for comparisons)
globalScope.gt = g.gt;  // Greater than (for comparisons)
globalScope.gte = g.gte;  // Greater than or equal
globalScope.lte = g.lte;  // Less than or equal
globalScope.neq = g.neq;  // Not equal (for NaN checking)
globalScope.selector = g.selector;  // Conditional selection (if cond then a else b)

// Expose constants and helper functions
globalScope.PI = PI;

// Pure function of time helpers
globalScope.signal = signal;

// Live surgery oscillators (EXPERIMENTAL - currently broken, use Simple versions)
globalScope.livePhasor = livePhasor;
globalScope.liveSin = liveSin;
globalScope.liveCos = liveCos;
globalScope.liveSaw = liveSaw;
globalScope.liveSquare = liveSquare;
globalScope.liveTime = liveTime;

// Working alternatives (use these for now)
globalScope.phasorSimple = phasorSimple;
globalScope.sinSimple = sinSimple;

// Dynamics & envelopes
globalScope.smooth = smooth;
globalScope.smoothSimple = smoothSimple;
globalScope.smoothGain = smoothGain;

// Rhythm & timing
globalScope.beat = beat;

// Filters
globalScope.lp = lp;
globalScope.lpSimple = lpSimple;
globalScope.hp = hp;
globalScope.hpSimple = hpSimple;

// Effects (stateful, buffers survive code updates)
globalScope.echo = echo;
globalScope.dub = dub;
globalScope.crush = crush;
globalScope.saturate = saturate;
globalScope.fold = fold;
globalScope.reverb = reverb;
globalScope.pingPong = pingPong;
globalScope.feedback = feedback;
globalScope.comb = comb;
globalScope.karplus = karplus;

// Functional composition
globalScope.gain = gain;
globalScope.pipe = pipe;

// Simple oscillators (stateless, reset on code change)
globalScope.cycle = cycle;
globalScope.phasor = phasor;
globalScope.noise = noise;

// Preset sounds
globalScope.bass = bass;
globalScope.wobble = wobble;

// State management helpers (experimental)
globalScope.stateSlot = stateSlot;
globalScope.resetState = resetState;
globalScope.copyState = copyState;
globalScope.getStateDebug = getStateDebug;
