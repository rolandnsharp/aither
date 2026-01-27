// wave-dsp.js
// Functional DSP library wrapping genish.js for KANON

// ============================================================================
// MODERN 2026 KANON API - State-driven, not time-driven
// ============================================================================
//
// 1. COMPOSITIONAL API (Recommended) - Auto-slotted stateful oscillators:
//    kanon('drone', () => withLfo(mixGain(voices(440, 2, 4), 0.4), 0.3, 0.25))
//
//    Pros: Extremely concise (40+ lines → 1 line), phase persists across
//          hot-reload, automatic slot management, surgery-ready
//    Note: The () => arrow function is REQUIRED for lazy evaluation and
//          deterministic slot allocation
//
// 2. LEGACY PATTERN - Manual peek/poke (for advanced DSP):
//    kanon('drone', () => {
//      const phase = peek(globalThis.STATE, 0);
//      const newPhase = mod(add(phase, 440/44100), 1.0);
//      poke(globalThis.STATE, newPhase, 0);
//      return peek(globalThis.SINE_TABLE, newPhase);
//    })
//
//    Pros: Full control for feedback loops, physical models, custom DSP
//    Cons: More verbose, manual slot management
//
// 3. HYBRID - Mix high-level sugar with manual state (slots 0-99 reserved):
//    kanon('drift', () => {
//      const carrier = osc(440);  // Auto-slotted (100+)
//      const drift = peek(globalThis.STATE, 0);  // Manual (0-99)
//      poke(globalThis.STATE, drift + 0.01, 0);
//      return mul(carrier, 0.5);
//    })
//
// Choose based on your needs:
// - Quick patches → Compositional API
// - Experimental DSP → Legacy manual peek/poke
// - Complex control → Hybrid approach
// ============================================================================

const PI = Math.PI;
const g = globalThis.genish;

// ============================================================================
// BASIC OSCILLATORS
// ============================================================================

const cycle = (freq) => g.cycle(freq);
const phasor = (freq) => g.phasor(freq);
const noise = () => g.noise();
const sin = (phase) => g.sin(phase);
const cos = (phase) => g.cos(phase);

// ============================================================================
// MATH HELPERS
// ============================================================================

const add = (...args) => {
  if (args.length === 0) return 0;
  if (args.length === 1) return args[0];
  return args.reduce((a, b) => g.add(a, b));
};

const mul = (...args) => {
  if (args.length === 0) return 1;
  if (args.length === 1) return args[0];
  return args.reduce((a, b) => g.mul(a, b));
};

const sub = (a, b) => g.sub(a, b);
const div = (a, b) => g.div(a, b);
const mod = (a, b) => g.mod(a, b);
const pow = (a, b) => g.pow(a, b);
const abs = (x) => g.abs(x);
const min = (a, b) => g.min(a, b);
const max = (a, b) => g.max(a, b);

// ============================================================================
// FILTERS & SMOOTHING
// ============================================================================

// Simple one-pole lowpass: y[n] = y[n-1] + cutoff * (x[n] - y[n-1])
// cutoff: 0.0 (closed) to 1.0 (open). Try 0.1 for bass, 0.5 for brightness
const lp = (input, cutoff = 0.1) => {
  const y = g.history(1);
  return y.set(g.add(y, g.mul(cutoff, g.sub(input, y))));
};

// Simple one-pole highpass
const hp = (input, cutoff = 0.1) => {
  const y = g.history(1);
  const lpOut = g.add(y, g.mul(cutoff, g.sub(input, y)));
  y.set(lpOut);
  return g.sub(input, lpOut);
};

// Exponential smoother for parameter changes
// amount: 0.9 (fast) to 0.999 (slow). Use for envelope following, volume smoothing
const smooth = (target, amount = 0.99) => {
  const state = g.history(target);
  return state.set(g.add(g.mul(state, amount), g.mul(target, g.sub(1, amount))));
};

// ============================================================================
// EFFECTS
// ============================================================================

// Simple delay/echo: time in samples (11025 = 250ms @ 44.1kHz), feedback 0-1
const echo = (input, time = 11025, feedback = 0.5) => {
  const delayed = g.delay(input, time);
  const mixed = g.add(input, g.mul(delayed, feedback));
  return mixed;
};

// Dub-style delay with lowpass in feedback loop
const dub = (input, time = 22050, feedback = 0.7, darkening = 0.1) => {
  const delayed = g.delay(input, time);
  const filtered = lp(delayed, darkening);
  const mixed = g.add(input, g.mul(filtered, feedback));
  return mixed;
};

// Bitcrusher: reduce bit depth (4-16 bits typical)
const crush = (input, bits = 8) => {
  const scale = g.pow(2, bits);
  return g.div(g.round(g.mul(input, scale)), scale);
};

// Soft saturation/distortion: drive 1.0 (clean) to 10.0 (heavy)
const saturate = (input, drive = 2.0) => {
  const scaled = g.mul(input, drive);
  return g.div(scaled, g.add(1, g.abs(scaled)));
};

// Wavefolding (Buchla-style): amount 1.0 (clean) to 4.0 (complex)
const fold = (input, amount = 2.0) => {
  const scaled = g.mul(input, amount);
  return g.sin(g.mul(scaled, Math.PI));
};

// Simple reverb using parallel comb filters
const reverb = (input, size = 0.5, damping = 0.3) => {
  const times = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(t => Math.floor(t * size));
  let sum = input;
  for (let i = 0; i < times.length; i++) {
    const delayed = g.delay(input, times[i]);
    const damped = lp(delayed, damping);
    sum = g.add(sum, g.mul(damped, 0.5));
  }
  return g.mul(sum, 0.15);
};

// Ping-pong stereo delay (returns [left, right])
const pingPong = (input, time = 11025, feedback = 0.6) => {
  const delayL = g.delay(input, time);
  const delayR = g.delay(delayL, time);
  const mixL = g.add(input, g.mul(delayR, feedback));
  const mixR = g.add(input, g.mul(delayL, feedback));
  return [mixL, mixR];
};

// Feedback processor: apply processFn to delayed signal
// Example: feedback(input, sig => saturate(sig, 2.0), 0.3, 100)
const feedback = (input, processFn, amount = 0.5, time = 1) => {
  const fb = g.history(0);
  const delayed = g.delay(fb, time);
  const processed = processFn(delayed);
  const output = g.add(input, g.mul(processed, amount));
  fb.set(output);
  return output;
};

// Comb filter: metallic resonance. time = samples for pitch (441 = 100Hz)
const comb = (input, time = 441, feedback = 0.7) => {
  const delayed = g.delay(input, time);
  return g.add(input, g.mul(delayed, feedback));
};

// Karplus-Strong plucked string
// Send impulse (noise burst) to excite, freq sets pitch, damping affects decay
const karplus = (impulse, freq, damping = 0.995) => {
  const delayTime = Math.floor(44100 / freq);
  const fb = g.history(0);
  const delayed = g.delay(fb, delayTime);
  const averaged = g.mul(g.add(delayed, g.history(delayed)), 0.5);
  const output = g.add(impulse, g.mul(averaged, damping));
  fb.set(output);
  return output;
};

// ============================================================================
// UTILITY
// ============================================================================

const gain = (amt, sig) => g.mul(sig, amt);

// ============================================================================
// AUTO-SLOT STATEFUL OSCILLATORS (2026 Best Practice)
// ============================================================================
// Philosophy: State management is an ENGINE responsibility, not user responsibility
// Slots 0-99: Reserved for manual peek/poke (Tier 2-3 users)
// Slots 100+: Auto-allocated by sugar functions (Tier 1 users)

// Internal slot counter (starts at 100, resets per wave callback)
let _slotPointer = 100;
const internalResetSlots = () => { _slotPointer = 100; };

// Expose reset function for engine use (NOT for user code)
globalThis._internalResetSlots = internalResetSlots;

// ============================================================================
// PRIMITIVES (Auto-slotted oscillators)
// ============================================================================

// Stateful sine oscillator with auto-slot allocation
// Returns genish graph that reads/writes phase from STATE buffer
const osc = (freq) => {
  const slot = _slotPointer++;
  const phase = g.peek(globalThis.STATE, slot, { mode: 'samples' });
  const increment = g.div(freq, 44100);
  const newPhase = g.mod(g.add(phase, increment), 1.0);
  g.poke(globalThis.STATE, newPhase, slot);
  return g.peek(globalThis.SINE_TABLE, newPhase);
};

// Low-frequency oscillator (unipolar: 0..1)
// Just a wrapper around osc with bipolar->unipolar conversion
const lfo = (rate) => {
  const signal = osc(rate);
  return g.mul(g.add(signal, 1.0), 0.5);  // Convert -1..1 to 0..1
};

// ============================================================================
// HELPERS (Composition and mixing)
// ============================================================================

// Multi-voice detuned oscillators
// Returns array of genish graphs
const voices = (baseFreq, detune, count = 4) => {
  const offsets = [0, detune, -detune * 1.5, detune * 2.2];
  return offsets.slice(0, count).map(o => osc(baseFreq + o));
};

// Equal-power mix of multiple signals
const mix = (...signals) => {
  if (signals.length === 0) return 0;
  if (signals.length === 1) return signals[0];
  const sum = signals.reduce((a, b) => g.add(a, b));
  return g.mul(sum, 1 / signals.length);
};

// Mix with overall gain control
const mixGain = (signals, amt) => g.mul(mix(...signals), amt);

// Apply unipolar LFO modulation to signal amplitude
// depth: 0.0 (no modulation) to 1.0 (full amplitude swing)
// LFO range becomes (1-depth)..1.0 for smooth pulsing without silence
const withLfo = (signal, lfoRate, depth = 0.25) => {
  const lfoSig = lfo(lfoRate);
  const modAmount = g.mul(lfoSig, depth);
  const amplitude = g.add(modAmount, 1 - depth);
  return g.mul(signal, amplitude);
};

// ============================================================================
// OPTIONAL: Chaining wrapper (fluent interface)
// ============================================================================

// Wrap signal for method chaining
// CRITICAL: Must return raw genish nodes, not JS objects
const $ = (signal) => ({
  _sig: signal,
  mul(v) { return $(g.mul(this._sig, v)); },
  add(s) { return $(g.add(this._sig, s)); },
  lp(c) { return $(lp(this._sig, c)); },
  hp(c) { return $(hp(this._sig, c)); },
  mod(modulator, depth) { return $(withLfo(this._sig, modulator, depth)); },
  unwrap() { return this._sig; }
});

// Smooth gain changes to avoid pops
const smoothGain = (amt, sig) => {
  return g.mul(sig, smooth(amt, 0.999));
};

// Function composition pipe
const pipe = (...fns) => {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
};

// Quick bass tone (sine + sub-octave)
const bass = (freq) => {
  return g.mul(g.add(g.cycle(freq), g.mul(g.cycle(g.div(freq, 2)), 0.5)), 0.66);
};

// Wobble bass (LFO-modulated lowpass)
const wobble = (freq, rate) => {
  const osc = g.cycle(freq);
  const lfo = g.cycle(rate);
  const cutoff = g.add(0.1, g.mul(lfo, 0.4));
  return lp(osc, cutoff);
};

// ============================================================================
// EXPOSE TO GLOBAL SCOPE
// ============================================================================
// Make all functions available in signal.js without imports

const globalScope = typeof window !== 'undefined' ? window : globalThis;

// Oscillators
globalScope.cycle = cycle;
globalScope.phasor = phasor;
globalScope.noise = noise;
globalScope.sin = sin;
globalScope.cos = cos;

// Math
globalScope.add = add;
globalScope.mul = mul;
globalScope.sub = sub;
globalScope.div = div;
globalScope.mod = mod;
globalScope.pow = pow;
globalScope.abs = abs;
globalScope.min = min;
globalScope.max = max;
globalScope.PI = PI;

// Filters
globalScope.lp = lp;
globalScope.hp = hp;
globalScope.smooth = smooth;

// Effects
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

// Utility
globalScope.gain = gain;
globalScope.smoothGain = smoothGain;
globalScope.pipe = pipe;
globalScope.bass = bass;
globalScope.wobble = wobble;

// Auto-slot oscillators (Tier 1: The Musician)
globalScope.osc = osc;
globalScope.lfo = lfo;

// Composition helpers
globalScope.voices = voices;
globalScope.mix = mix;
globalScope.mixGain = mixGain;
globalScope.withLfo = withLfo;

// Optional chaining wrapper
globalScope.$ = $;

// Expose raw genish primitives for advanced use
globalScope.g = g;

// Expose peek/poke for stateful genish patterns (Tier 2-3: Designer/Researcher)
globalScope.peek = g.peek;
globalScope.poke = g.poke;
globalScope.data = g.data;

// Expose gen for accessing globals like the cycle wavetable
globalScope.gen = g.gen;

// Note: STATE is exposed globally by worklet.js after creation
