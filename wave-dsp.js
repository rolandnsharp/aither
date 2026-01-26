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

// livePhasor: Creates a 0-1 ramp at 'freq' Hz, stored at memory[idx]
// Phase survives hot-swaps → no clicks when you change code mid-performance
const livePhasor = (freq, idx = 0) => {
  const lastPhase = g.peek(g.gen.memory, idx);  // Read last phase from memory
  const dt = g.div(freq, g.gen.samplerate);  // Phase increment (supports 44.1k/48k)
  const nextPhase = g.mod(g.add(lastPhase, dt), 1);  // Wrap 0-1
  // Use sub(..., 0) to force poke into the graph without changing the value
  return g.sub(g.poke(g.gen.memory, nextPhase, idx), 0);
};

// liveSin: Stateful sine oscillator - the workhorse of live surgery
// Usage: liveSin(440, 0) - 440Hz sine stored at memory index 0
const liveSin = (freq, idx = 0) => {
  // Pre-calculate 2*PI as constant for binary mul compatibility
  return g.sin(g.mul(livePhasor(freq, idx), (2 * Math.PI)));
};

// liveCos: Stateful cosine oscillator (90° phase offset from sine)
const liveCos = (freq, idx = 0) => {
  return g.cos(g.mul(livePhasor(freq, idx), (2 * Math.PI)));
};

// liveSaw: Stateful sawtooth (raw 0-1 ramp scaled to -1 to 1)
const liveSaw = (freq, idx = 0) => {
  const phase = livePhasor(freq, idx);
  return g.sub(g.mul(phase, 2), 1);  // Scale 0-1 to -1 to 1
};

// liveSquare: Stateful square wave (perfect for rhythmic gates)
const liveSquare = (freq, idx = 0) => {
  const phase = livePhasor(freq, idx);
  return g.gt(phase, 0.5);  // 1 when phase > 0.5, else 0
};

// liveTime: Persistent time accumulator that resets every N seconds
// Perfect for long-form generative pieces with deterministic evolution
// Usage: liveTime(10, 50) - 10-second loop stored at slot 50
const liveTime = (resetSeconds, idx = 63) => {
  const lastT = g.peek(g.gen.memory, idx);
  const nextT = g.mod(g.add(lastT, g.div(1, g.gen.samplerate)), resetSeconds);
  return g.sub(g.poke(g.gen.memory, nextT, idx), 0);
};

// ============================================================================
// DYNAMICS & ENVELOPE HELPERS
// ============================================================================

// smooth: Stateful parameter smoother (prevents pops when values change)
// Exponentially approaches target value over time
// amount: 0.0 (instant) to 0.999 (very slow) - higher = smoother
const smooth = (target, amount = 0.99, slot = 50) => {
  const lastVal = g.peek(g.gen.memory, slot);
  // Formula: current = (last * amount) + (target * (1 - amount))
  const nextVal = g.add(
    g.mul(lastVal, amount),
    g.mul(target, g.sub(1, amount))
  );
  return g.sub(g.poke(g.gen.memory, nextVal, slot), 0);
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
// Smooths high frequencies while preserving state across code updates
// cutoff: 0.0 (no filtering) to 1.0 (maximum filtering)
const lp = (input, cutoff = 0.1, slot = 70) => {
  const history = g.peek(g.gen.memory, slot);
  // One-pole formula: y[n] = y[n-1] + cutoff * (x[n] - y[n-1])
  const out = g.add(history, g.mul(cutoff, g.sub(input, history)));
  return g.sub(g.poke(g.gen.memory, out, slot), 0);
};

// hp: Stateful one-pole highpass filter
// Removes low frequencies (opposite of lowpass)
const hp = (input, cutoff = 0.1, slot = 71) => {
  const lowpassed = lp(input, cutoff, slot);
  return g.sub(input, lowpassed);  // highpass = input - lowpass
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
// Usage: pipe(liveSin(440, 0), s => gain(0.5, s), s => someFilter(s))
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

// Expose genish primitives as bare names for clean math syntax
// This allows: mul(sin(mul(2, PI, 55, t)), 0.6) instead of genish.mul(genish.sin(...))
globalScope.sin = g.sin;
globalScope.cos = g.cos;
globalScope.tan = g.tan;
globalScope.tanh = g.tanh;
globalScope.abs = g.abs;
globalScope.round = g.round;
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
globalScope.peek = g.peek;
globalScope.poke = g.poke;
globalScope.mod = g.mod;
globalScope.lt = g.lt;  // Less than (for comparisons)
globalScope.gt = g.gt;  // Greater than (for comparisons)
globalScope.gte = g.gte;  // Greater than or equal
globalScope.lte = g.lte;  // Less than or equal

// Expose constants and helper functions
globalScope.PI = PI;

// Pure function of time helpers
globalScope.signal = signal;

// Live surgery oscillators (state-aware, click-free hot-swapping)
globalScope.livePhasor = livePhasor;
globalScope.liveSin = liveSin;
globalScope.liveCos = liveCos;
globalScope.liveSaw = liveSaw;
globalScope.liveSquare = liveSquare;
globalScope.liveTime = liveTime;

// Dynamics & envelopes
globalScope.smooth = smooth;
globalScope.smoothGain = smoothGain;

// Rhythm & timing
globalScope.beat = beat;

// Filters (stateful, survive code updates)
globalScope.lp = lp;
globalScope.hp = hp;

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
