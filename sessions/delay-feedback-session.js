const signal = require('../src/index.js');
const { step, freq, scales, env } = signal;

// ============================================================================
// DELAY AND FEEDBACK EXAMPLES
// ============================================================================

// Example 1: Simple Delay (No Feedback)
// Uncomment to hear:
/*
const melody = signal('simple-delay', t => {
  const { index, phase } = step(t, 100, 8);
  const pattern = [0, 2, 4, 5];
  const degree = pattern[index % pattern.length];
  const f = freq(330, scales.major, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.2;
});

// Add simple delay
signal('with-delay', melody.delay(0.5).gain(0.6).fn);
*/

// Example 2: Feedback Delay (Dub Echo)
// Uncomment to hear:
/*
signal('dub-echo', t => {
  const { index, phase } = step(t, 85, 4);

  // Short percussive hit
  if (phase > 0.15) return 0;

  const pattern = [0, 3, 7, 5];
  const degree = pattern[index % pattern.length];
  const f = freq(220, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase * 6, 10) * 0.3;
}).feedback(0.375, 0.65);
*/

// Example 3: Multi-Tap Delay (Manual)
// Uncomment to hear:
/*
const hit = signal('hit', t => {
  const { phase } = step(t, 90, 2);
  if (phase > 0.1) return 0;

  return Math.sin(2 * Math.PI * 200 * t) * env.exp(phase * 10, 10);
});

signal('multi-tap', t => {
  const dry = hit.eval(t);
  const tap1 = hit.delay(0.125).eval(t) * 0.6;
  const tap2 = hit.delay(0.25).eval(t) * 0.4;
  const tap3 = hit.delay(0.375).eval(t) * 0.3;
  const tap4 = hit.delay(0.5).eval(t) * 0.2;

  return (dry + tap1 + tap2 + tap3 + tap4) * 0.4;
});
*/

// Example 4: Feedback + Filtering (Darker Echoes)
// Uncomment to hear:
/*
signal('filtered-echo', t => {
  const { index, phase } = step(t, 70, 4);

  if (phase > 0.1) return 0;

  const degree = [0, 5, 7][index % 3];
  const f = freq(330, scales.minor, degree);

  // Bright hit
  const hit = Math.sin(2 * Math.PI * f * t) * env.exp(phase * 10, 12) * 0.3;

  // Feedback makes it echo, but each echo gets darker
  // (In real implementation, we'd have .lowpass() method)
  return hit;
}).feedback(0.4, 0.7);
*/

// Example 5: Ping-Pong Delay (Stereo)
// Uncomment to hear:
/*
const mono = signal('mono-source', t => {
  const { phase } = step(t, 95, 4);
  if (phase > 0.08) return 0;

  return Math.sin(2 * Math.PI * 440 * t) * env.exp(phase * 12, 15) * 0.25;
});

signal('ping-pong', {
  left: t => {
    const dry = mono.eval(t);
    // Left gets delayed right channel
    const fromRight = t >= 0.25 ? mono.delay(0.25).eval(t) * 0.6 : 0;
    return dry + fromRight;
  },
  right: t => {
    // Right gets delayed left channel
    const fromLeft = t >= 0.25 ? mono.delay(0.25).eval(t) * 0.6 : 0;
    return fromLeft;
  }
});
*/

// Example 6: Rhythmic Echo Pattern
// Uncomment to hear:
/*
signal('rhythm-echo', t => {
  const { index, phase } = step(t, 120, 16);

  // Euclidean pattern
  const pattern = [1, 0, 0, 1, 0, 1, 0, 0];
  const trigger = pattern[index % pattern.length];

  if (!trigger || phase > 0.08) return 0;

  return Math.sin(2 * Math.PI * 150 * t) * env.exp(phase * 15, 12) * 0.35;
}).feedback(0.25, 0.6);
*/

// Example 7: Long Feedback (Infinite Sustain)
// Uncomment to hear:
/*
signal('infinite', t => {
  const { phase } = step(t, 50, 2);

  if (phase > 0.05) return 0;

  // Very short impulse
  return Math.sin(2 * Math.PI * 220 * t) * env.exp(phase * 20, 15) * 0.2;
}).feedback(0.1, 0.95);  // 95% feedback = almost infinite
*/

// Example 8: Delay-Based Chord
// Uncomment to hear:
signal('delay-chord', t => {
  const { phase } = step(t, 60, 2);

  if (phase > 0.1) return 0;

  // Single note
  const note = Math.sin(2 * Math.PI * 220 * t) * env.exp(phase, 8) * 0.15;

  // Delay creates harmony (like a poor man's chord)
  const third = t >= 0.05 ? Math.sin(2 * Math.PI * 277 * (t - 0.05)) * env.exp((phase - 0.05) * 8, 8) * 0.15 : 0;
  const fifth = t >= 0.1 ? Math.sin(2 * Math.PI * 330 * (t - 0.1)) * env.exp((phase - 0.1) * 8, 8) * 0.15 : 0;

  return note + third + fifth;
}).feedback(2.0, 0.5);

// Example 9: Complex Feedback Network
// Uncomment to hear (experimental!):
/*
const source = signal('source', t => {
  const { index, phase } = step(t, 80, 8);
  const degree = [0, 3, 7][index % 3];
  const f = freq(330, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
});

// Multiple feedback paths
const fb1 = source.feedback(0.29, 0.6);
const fb2 = source.feedback(0.37, 0.5);

signal('network', t => {
  return (fb1.eval(t) + fb2.eval(t)) * 0.5;
});
*/

// Example 10: Karplus-Strong String Synthesis (Simple Version)
// Uncomment to hear:
/*
signal('pluck', t => {
  // Initial noise burst
  if (t < 0.01) {
    return (Math.random() * 2 - 1) * 0.4;
  }

  // Let feedback do the work
  return 0;
}).feedback(1 / 220, 0.995);  // 220 Hz string
*/

console.log('\n🎵 Signal Delay & Feedback Session');
console.log('Uncomment examples in delay-feedback-session.js to try them!\n');
console.log('Available examples:');
console.log('  1. Simple Delay - Basic echo effect');
console.log('  2. Dub Echo - Classic feedback delay');
console.log('  3. Multi-Tap Delay - Rhythmic echoes');
console.log('  4. Filtered Echo - Darker repeats');
console.log('  5. Ping-Pong - Stereo bouncing delay');
console.log('  6. Rhythmic Echo - Pattern with feedback');
console.log('  7. Infinite Sustain - 95% feedback');
console.log('  8. Delay Chord - Currently playing!');
console.log('  9. Network - Multiple feedback paths');
console.log(' 10. Pluck - Physical modeling string\n');
