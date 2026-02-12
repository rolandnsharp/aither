// live-session.js - `aither` Startup Script / Example Showcase
// This file is loaded once when the `aither` engine starts.
// Use the REPL to interact with the engine live (e.g., `register(...)`, `unregister(...)`).

// All functions exported by helpers.js are globally available here (e.g., `gain`, `tremolo`).
// The engine's core API (`register`, `unregister`, `clear`, `setPosition`) are also global.

// Clear any existing signals from a previous hot-reload (if running in `--hot` mode during dev).
clear(true); // Full reset for a clean start

// --- Helper Oscillator for Examples ---
// This is a simple, stateful oscillator. Note how it uses its own s.state[0]
// as the helpers now manage their memory from a separate pool.
const userOsc = (freq, phaseSlot = 0) => s => {
    s.state[phaseSlot] = (s.state[phaseSlot] + freq / s.sr) % 1.0;
    return Math.sin(s.state[phaseSlot] * 2 * Math.PI);
};


// --- Example 1: Simple Filtered & Delayed Sine Wave ---
// This showcases composition with stateful and stateless helpers.
// The helpers manage their state automatically.
register('filtered-delayed-sine',
  pipe(
    userOsc(440), // Base oscillator at 440Hz
    signal => lowpass(signal, 800), // Lowpass filter at 800Hz
    signal => tremolo(signal, 5, 0.8), // Tremolo: 5Hz rate, 80% depth
    signal => delay(signal, 0.5, 0.25), // Delay: max 0.5s, actual 0.25s
    signal => gain(signal, 0.4) // Overall gain
  )
);


// --- Example 2: Another Independent Signal Chain ---
register('panning-osc',
  pipe(
    userOsc(220), // Base oscillator at 220Hz
    signal => gain(signal, 0.5), // Gain
    signal => pan(signal, s => Math.sin(s.t * 0.1)) // Pan LFO
  )
);


// --- Example 3: Drum Beat Using Low-Frequency Square Wave ---
// A low-freq square wave creates rhythmic pulses

// Helper: Square wave function
const square = (freq, phaseSlot = 0) => s => {
  s.state[phaseSlot] = (s.state[phaseSlot] + freq / s.sr) % 1.0;
  return s.state[phaseSlot] < 0.5 ? 1 : -1;
};

// Simple pulse beat (2 Hz = 120 BPM)
register('pulse-beat',
  pipe(
    square(2, 0),  // 2 Hz square wave
    signal => gain(signal, 0.2)
  )
);

// Kick drum: Square wave gates a low sine with envelope
register('kick',
  s => {
    // Square wave trigger (2 Hz = 120 BPM)
    const TRIGGER_PHASE = 0;
    const ENV_PHASE = 1;
    const KICK_FREQ_PHASE = 2;

    s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + 2 / s.sr;
    s.state[TRIGGER_PHASE] %= 1.0;

    const trigger = s.state[TRIGGER_PHASE] < 0.5 ? 1 : 0;

    // Envelope (decay on each trigger)
    const prevTrigger = s.state[3] || 0;
    if (trigger > prevTrigger) {
      // Trigger detected - reset envelope
      s.state[ENV_PHASE] = 1.0;
    }
    s.state[3] = trigger;

    // Exponential decay
    const decayRate = 8; // Fast decay
    s.state[ENV_PHASE] = (s.state[ENV_PHASE] || 0) * Math.exp(-decayRate * s.dt);
    const env = s.state[ENV_PHASE];

    // Kick sound: Low sine with pitch envelope
    const baseFreq = 50; // Low frequency for kick
    const pitchEnv = 1 + env * 3; // Pitch drops as envelope decays
    const kickFreq = baseFreq * pitchEnv;

    s.state[KICK_FREQ_PHASE] = (s.state[KICK_FREQ_PHASE] || 0) + kickFreq / s.sr;
    s.state[KICK_FREQ_PHASE] %= 1.0;

    const kick = Math.sin(s.state[KICK_FREQ_PHASE] * 2 * Math.PI);

    return kick * env * 1.5;
  }
);

// Hi-hat: Square wave gates noise at double speed (4 Hz = 240 BPM)
register('hihat',
  s => {
    const TRIGGER_PHASE = 0;
    const ENV_PHASE = 1;

    s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + 4 / s.sr; // 4 Hz
    s.state[TRIGGER_PHASE] %= 1.0;

    const trigger = s.state[TRIGGER_PHASE] < 0.5 ? 1 : 0;

    // Detect trigger
    const prevTrigger = s.state[2] || 0;
    if (trigger > prevTrigger) {
      s.state[ENV_PHASE] = 1.0;
    }
    s.state[2] = trigger;

    // Fast decay for hi-hat
    const decayRate = 20;
    s.state[ENV_PHASE] = (s.state[ENV_PHASE] || 0) * Math.exp(-decayRate * s.dt);
    const env = s.state[ENV_PHASE];

    // Hi-hat sound: filtered noise
    const noise = Math.random() * 2 - 1;

    return noise * env * 0.15;
  }
);

console.log("Initial signals loaded from live-session.js. Use REPL to explore!");
console.log("Try: stop('filtered-delayed-sine') or play('kick') or play('hihat')");
