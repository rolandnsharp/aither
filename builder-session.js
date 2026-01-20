// ============================================================================
// BUILDER STYLE SESSION
// ============================================================================
// Demonstrates the clean builder syntax
// Run with: node signal/runner.js signal/builder-session.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');

// ============================================================================
// Simple examples
// ============================================================================

// Pure sine wave
// signal('tone').sin(432).gain(0.2);

// Distorted bass
// signal('bass').sin(110)
//   .fx(sample => Math.tanh(sample * 3))
//   .gain(0.3);

// Tremolo (amplitude modulation)
const lfo = signal.sin(3).gain(0.5).offset(0.5);
// signal('tremolo').sin(440).modulate(lfo).gain(0.2);

// Square wave with wavefolder
// signal('folded').square(220).fold(0.7).gain(0.25);

// Chord - mix inline
// signal('chord').sin(432)
//   .mix(signal.sin(540), signal.sin(648))
//   .gain(0.15);

// ============================================================================
// Melodic sequencer with builder style
// ============================================================================

signal('melody').fn(t => {
  const { index, phase } = step(t, 120, 8);
  const pattern = [0, 3, 5, 3, 7, 5, 3, 0];
  const degree = pattern[index % pattern.length];

  const f = freq(550, scales.minor, degree);
  const envelope = env.exp(phase, 5);

  return signal.sin(f).eval(t) * envelope * 0.15;
});

// ============================================================================
// Kick drum
// ============================================================================

signal('kick').fn(t => {
  const { beat, phase } = step(t, 120, 4);

  if (beat % 4 !== 0) return 0;
  if (phase > 0.3) return 0;

  const pitchEnv = 100 * env.exp(phase, 15);
  const f = 50 + pitchEnv;

  return signal.sin(f).eval(t) * env.exp(phase, 8) * 0.35;
});

console.log('Builder Style Session Loaded!');
console.log('Clean, readable syntax using signal("name").method() pattern');
