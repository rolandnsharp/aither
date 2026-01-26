// signal.js

// This is a simplified test to diagnose the "no audio" issue.
// It bypasses the `wave-dsp.js` library (pipe, sin, gain, etc.)
// and uses raw genish.js functions.
//
// If this produces sound, the issue is in `wave-dsp.js`.
// If this does NOT produce sound, the issue is in the core engine/worklet.

wave(
  'diagnostic-tone',
  (t) => genish.mul(genish.cycle(440), 0.5)
);