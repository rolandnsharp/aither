// ============================================================================
// EXAMPLE LIVE CODING SESSION
// ============================================================================
// Run with: node runner.js example-session.js
// Edit this file and save to hear changes in real-time!

const signal = require('../src/index');
const { step, euclidean } = require('../src/rhythm');
const { freq } = require('../src/melody');
const { env } = require('../src/envelopes');
const scales = require('../src/scales');

// ============================================================================
// SIMPLE EXAMPLES - Uncomment to try
// ============================================================================

// Pure sine wave
// signal('tone', t => signal.sin(432).gain(0.2).eval(t));

// Tremolo (amplitude modulation)
// const lfo = signal.sin(3).gain(0.5).offset(0.5);
// signal('tremolo', t => signal.sin(432).modulate(lfo).gain(0.2).eval(t));

// Distorted bass
// signal('bass', t => {
//   return signal.sin(110)
//     .fx(sample => Math.tanh(sample * 3))
//     .gain(0.3)
//     .eval(t);
// });

// ============================================================================
// MUSICAL EXAMPLE
// ============================================================================

// Bass line with rhythm
signal('bass', t => {
  const { index, phase } = step(t, 120, 2);  // Half notes at 120 BPM
  const pattern = [0, 0, 5, 3];  // Scale degrees
  const degree = pattern[index % pattern.length];

  const f = freq(110, scales.minor, degree);
  const envelope = 0.7 + 0.3 * env.exp(phase, 3);

  return signal.sin(f)
    .fx(sample => Math.tanh(sample * 2.5))  // Soft distortion
    .eval(t) * envelope * 0.25;
});

// Melody
signal('melody', t => {
  const { index, phase } = step(t, 120, 8);  // 8th notes
  const pattern = [0, 3, 5, 3, 7, 5, 3, 0];
  const degree = pattern[index % pattern.length];

  const f = freq(440, scales.minor, degree);
  const envelope = env.exp(phase, 5);

  return signal.sin(f).eval(t) * envelope * 0.15;
});

// Kick drum (euclidean rhythm)
signal('kick', t => {
  const { index, phase } = step(t, 120, 16);  // 16th notes
  const pattern = euclidean(4, 16);  // 4 kicks in 16 steps

  if (!pattern[index % pattern.length]) return 0;
  if (phase > 0.3) return 0;

  const pitchEnv = 100 * env.exp(phase, 15);
  const f = 50 + pitchEnv;

  return signal.sin(f).eval(t) * env.exp(phase, 8) * 0.35;
});

// ============================================================================
// TRY EDITING THE CODE ABOVE AND SAVING TO HEAR CHANGES LIVE!
// ============================================================================
// - Change frequencies
// - Modify patterns
// - Adjust envelopes
// - Comment/uncomment signals
// - Add new signals
