// ============================================================================
// IMPERATIVE PROGRAMMING EXAMPLE
// ============================================================================
// Shows how to use loops, arrays, and imperative logic to generate signals
// Run with: node signal/runner.js signal/imperative-session.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');

// ============================================================================
// EXAMPLE 1: Generate chord tones with a loop
// ============================================================================

const chordDegrees = [0, 4, 7, 11];  // Major 7th chord
const baseFreq = 200;

for (let i = 0; i < chordDegrees.length; i++) {
  const degree = chordDegrees[i];
  const f = freq(baseFreq, scales.major, degree);

  signal(`chord-${i}`, signal.sin(f).gain(0.1));
}

// ============================================================================
// EXAMPLE 2: Build arpeggio pattern with array methods
// ============================================================================

const arpNotes = [0, 2, 4, 7, 9, 7, 4, 2];  // Pentatonic arpeggio

signal('arp', t => {
  const { index, phase } = step(t, 140, 16);  // Fast 16th notes

  const degree = arpNotes[index % arpNotes.length];
  const f = freq(440, scales.pentatonic, degree);
  const envelope = env.exp(phase, 8);

  return signal.sin(f).eval(t) * envelope * 0.15;
});

// ============================================================================
// EXAMPLE 3: Generate polyrhythmic patterns with nested loops
// ============================================================================

const rhythms = [
  { name: 'three', period: 3, freq: 200 },
  { name: 'five', period: 5, freq: 300 },
  { name: 'seven', period: 7, freq: 400 }
];

for (const rhythm of rhythms) {
  signal(rhythm.name, t => {
    const phase = (t / rhythm.period) % 1;

    // Trigger only at the start of each cycle
    if (phase > 0.05) return 0;

    const envelope = env.exp(phase * 20, 10);  // Very fast decay
    return signal.sin(rhythm.freq).eval(t) * envelope * 0.2;
  });
}

// ============================================================================
// EXAMPLE 4: Conditional logic - play different patterns based on time
// ============================================================================

signal('evolving', t => {
  const { beat, index, phase } = step(t, 120, 8);

  let pattern;

  // Change pattern every 8 beats
  const section = Math.floor(beat / 8) % 3;

  if (section === 0) {
    pattern = [0, 2, 4, 5];  // Major
  } else if (section === 1) {
    pattern = [0, 3, 5, 7];  // Minor
  } else {
    pattern = [0, 2, 4, 7];  // Suspended
  }

  const degree = pattern[index % pattern.length];
  const f = freq(330, scales.major, degree);
  const envelope = env.exp(phase, 6);

  return signal.sin(f).eval(t) * envelope * 0.12;
});

// ============================================================================
// EXAMPLE 5: Generate harmonics using a loop
// ============================================================================

const fundamental = 110;  // Bass note
const numHarmonics = 6;
const harmonicSignals = [];

for (let n = 1; n <= numHarmonics; n++) {
  const harmonicFreq = fundamental * n;
  const amplitude = 1 / n;  // Decay harmonics

  harmonicSignals.push(
    signal.sin(harmonicFreq).gain(amplitude)
  );
}

// Mix all harmonics together
signal('harmonics', signal.mix(...harmonicSignals).gain(0.15));

// ============================================================================
// EXAMPLE 6: Build complex rhythm with array manipulation
// ============================================================================

// Generate euclidean-like pattern programmatically
function generatePattern(pulses, steps) {
  const pattern = [];
  for (let i = 0; i < steps; i++) {
    const bucket = Math.floor(i * pulses / steps);
    const nextBucket = Math.floor((i + 1) * pulses / steps);
    pattern.push(bucket !== nextBucket ? 1 : 0);
  }
  return pattern;
}

const kickPattern = generatePattern(5, 16);
const snarePattern = generatePattern(3, 8);

signal('kick', t => {
  const { index, phase } = step(t, 128, 16);

  if (!kickPattern[index % kickPattern.length]) return 0;
  if (phase > 0.25) return 0;

  const pitchEnv = 80 * env.exp(phase, 20);
  const f = 50 + pitchEnv;

  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.4;
});

signal('snare', t => {
  const { index, phase } = step(t, 128, 8);

  if (!snarePattern[index % snarePattern.length]) return 0;
  if (phase > 0.15) return 0;

  // Snare = noise with envelope
  return signal.noise().eval(t) * env.exp(phase, 15) * 0.25;
});

// ============================================================================
// EXAMPLE 7: Use while loop for generative melody
// ============================================================================

signal('generative', t => {
  const { beat, phase } = step(t, 100, 8);

  // Deterministic random walk
  let seed = beat;
  let degree = 0;
  let steps = 5;

  while (steps > 0) {
    seed = (seed * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    degree += rand > 0.5 ? 1 : -1;
    steps--;
  }

  // Keep in scale range
  degree = ((degree % 12) + 12) % 12;

  const f = freq(550, scales.pentatonic, degree);
  const envelope = env.exp(phase, 6);

  return signal.sin(f).eval(t) * envelope * 0.1;
});

// ============================================================================
// EXAMPLE 8: Filter and map arrays to create textures
// ============================================================================

const frequencies = [100, 150, 200, 250, 300, 350, 400, 450, 500];

// Filter to only odd harmonics
const oddHarmonics = frequencies.filter((f, i) => i % 2 === 0);

// Map to signals with varying amplitudes
const textureSignals = oddHarmonics.map((f, i) => {
  const amp = 0.05 / (i + 1);  // Decay amplitude
  return signal.sin(f).gain(amp);
});

signal('texture', signal.mix(...textureSignals).gain(0.8));

console.log('Imperative Programming Session Loaded!');
console.log(`Generated ${chordDegrees.length} chord tones`);
console.log(`Generated ${numHarmonics} harmonics`);
console.log(`Generated ${rhythms.length} polyrhythms`);
console.log(`Generated ${textureSignals.length} texture layers`);
