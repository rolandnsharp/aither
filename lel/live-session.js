// live-session.js - Live Coding Interface for LEL
// This file is watched by `bun --hot`. When you save, the whole
// engine reloads, and this file is re-run.

import { register, clear } from './index.js';
// Import the new helpers, including the essential `resetHelperCounter` and `pipe`
import { gain, pan, tremolo, lowpass, delay, resetHelperCounter, pipe } from './helpers.js';

// Clear all signal functions on every reload.
clear();

// This is a simple, stateless oscillator function.
// It doesn't need to manage its own state because it's a pure function of time.
const pureSine = freq => s => Math.sin(freq * Math.PI * 2 * s.t);


// --- Signal 1: A simple filtered sine wave ---

// Reset the helper counter before registering a new signal chain.
resetHelperCounter();
register('filtered-sine',
  lowpass(
    gain(
      pureSine(220),
      0.5
    ),
    // The cutoff can be a dynamic function!
    s => 200 + (100 * (Math.sin(s.t * 2) + 1))
  )
);


// --- Signal 2: A complex, composed signal with multiple stateful helpers ---

// Reset the counter again for this completely separate signal chain.
resetHelperCounter();

// This is a stateful oscillator that we can use inside the chain.
const statefulOsc = (s, freq) => {
    // This is our USER state. It's safe to use index 0 here because the
    // helpers manage their own state slots automatically.
    s.state[0] = (s.state[0] + freq / s.sr) % 1.0;
    return Math.sin(s.state[0] * 2 * Math.PI);
};

// Refactored using `pipe` for a clean, linear signal chain.
// // The `pipe` function takes the base signal as its first argument,
// // and then a sequence of "transformer" functions.
register('complex-drone',
  pipe(
    s => statefulOsc(s, 555), // 1. Start with our base oscillator.

    // 2. Pipe it into the first (inner) tremolo.
    //    Each of these functions receives the signal from the previous line.
    signal => tremolo(signal, 0.5, 0.9),

    // 3. Pipe the result into a lowpass filter.
    signal => lowpass(signal, 200),

    // 4. Pipe the result into the second (outer) tremolo.
    signal => tremolo(signal, 2, 0.5),

    // 5. Pipe into a gain stage.
    signal => gain(signal, 0.3),

    // 6. Finally, pipe into the stereo panner.
    signal => pan(signal, s => Math.sin(s.t * 2))
  )
);


// // --- Signal 3: A Delayed Sine Wave ---

// // Reset the counter for this new, independent signal chain.
// resetHelperCounter();

// register('delayed-sine',
//   pipe(
//     pureSine(440), // Input signal: a pure sine wave

//     // Apply a delay. maxTime sets the buffer size.
//     // The actual delay time can be dynamic.
//     signal => delay(signal, 10.11, 0.125), // Max 0.5s delay, actual 0.25s

//     signal => gain(signal, 0.4) // Apply some gain
//   )
// );
