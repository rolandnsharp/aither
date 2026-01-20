// ============================================================================
// ASYNC COMPOSITION - Clean async/await style
// ============================================================================
// Demonstrates time-based composition using async/await (much cleaner!)
// Run with: node signal/composition-async.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');
const { sleep } = signal;  // Use built-in sleep helper

console.log('Async Composition Session');
console.log('=========================\n');

// ============================================================================
// Create all instruments (stopped initially)
// ============================================================================

const bass = signal('bass').fn(t => {
  const { index, phase } = step(t, 120, 2);  // Half notes
  const pattern = [0, 0, 5, 3];
  const degree = pattern[index % pattern.length];
  const f = freq(110, scales.minor, degree);
  const envelope = 0.7 + 0.3 * env.exp(phase, 3);
  return signal.sin(f).eval(t) * envelope * 0.3;
}).stop();

const melody = signal('melody').fn(t => {
  const { index, phase } = step(t, 120, 8);  // 8th notes
  const pattern = [0, 3, 5, 3, 7, 5, 3, 0];
  const degree = pattern[index % pattern.length];
  const f = freq(440, scales.minor, degree);
  const envelope = env.exp(phase, 5);
  return signal.sin(f).eval(t) * envelope * 0.15;
}).stop();

const pad = signal('pad').fn(t => {
  // Slow evolving chord
  return signal.mix(
    signal.sin(freq(220, scales.minor, 0)),
    signal.sin(freq(220, scales.minor, 3)),
    signal.sin(freq(220, scales.minor, 7))
  ).eval(t) * 0.08;
}).stop();

const kick = signal('kick').fn(t => {
  const { beat, phase } = step(t, 120, 4);
  if (beat % 4 !== 0 || phase > 0.25) return 0;
  const pitchEnv = 80 * env.exp(phase, 20);
  const f = 50 + pitchEnv;
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.35;
}).stop();

const hihat = signal('hihat').fn(t => {
  const { index, phase } = step(t, 120, 16);
  if (index % 2 !== 0 || phase > 0.05) return 0;
  return signal.noise().eval(t) * env.exp(phase, 20) * 0.15;
}).stop();

// ============================================================================
// Composition Timeline - Clean async/await style!
// ============================================================================

async function composition() {
  console.log('[0s] Starting composition...\n');

  // Intro - just pad
  await sleep(2000);
  console.log('[2s] Intro: Pad enters');
  pad.play();

  // Add bass
  await sleep(4000);
  console.log('[6s] Build: Bass enters');
  bass.play();

  // Add kick
  await sleep(4000);
  console.log('[10s] Build: Kick enters');
  kick.play();

  // Add melody
  await sleep(4000);
  console.log('[14s] Drop: Melody enters');
  melody.play();

  // Add hihat
  await sleep(4000);
  console.log('[18s] Full: Hi-hat enters');
  hihat.play();

  // Break - remove drums
  await sleep(4000);
  console.log('[22s] Break: Removing drums');
  kick.stop();
  hihat.stop();

  // Remove bass
  await sleep(4000);
  console.log('[26s] Break: Removing bass');
  bass.stop();

  // Build back up
  await sleep(4000);
  console.log('[30s] Build: Drums return');
  kick.play();
  hihat.play();

  await sleep(2000);
  console.log('[32s] Build: Bass returns');
  bass.play();

  // Outro - fade everything
  await sleep(4000);
  console.log('[36s] Outro: Removing melody and drums');
  melody.stop();
  kick.stop();
  hihat.stop();

  await sleep(4000);
  console.log('[40s] Outro: Removing bass');
  bass.stop();

  // End
  await sleep(4000);
  console.log('[44s] End: Stopping pad');
  pad.stop();

  await sleep(2000);
  console.log('\n✓ Composition complete!');
  signal.stopAudio();
  process.exit(0);
}

// Run the composition
composition().catch(err => {
  console.error('Error in composition:', err);
  signal.stopAudio();
  process.exit(1);
});

console.log('Composition running for ~46 seconds...');
console.log('Press Ctrl+C to stop early\n');
