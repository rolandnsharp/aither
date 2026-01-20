// ============================================================================
// BOSCA CEOIL STYLE - ASYNC/AWAIT VERSION
// ============================================================================
// Bar-based composition with clean async/await syntax
// Run with: node signal/bosca-async.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');
const { bars } = signal;

console.log('Bosca Style Composition (Async)');
console.log('================================\n');

const BPM = 128;

// ============================================================================
// Create instruments
// ============================================================================

const bass = signal('bass').fn(t => {
  const { index, phase } = step(t, BPM, 2);
  const pattern = [0, 0, 7, 5];
  const degree = pattern[index % pattern.length];
  const f = freq(110, scales.minor, degree);
  return signal.sin(f).eval(t) * env.exp(phase, 3) * 0.3;
}).stop();

const arp = signal('arp').fn(t => {
  const { index, phase } = step(t, BPM, 16);
  const pattern = [0, 3, 7, 10, 7, 3];
  const degree = pattern[index % pattern.length];
  const f = freq(440, scales.minor, degree);
  return signal.sin(f).eval(t) * env.exp(phase, 8) * 0.15;
}).stop();

const pad = signal('pad').fn(t => {
  return signal.mix(
    signal.sin(freq(330, scales.minor, 0)),
    signal.sin(freq(330, scales.minor, 3)),
    signal.sin(freq(330, scales.minor, 7))
  ).eval(t) * 0.08;
}).stop();

const kick = signal('kick').fn(t => {
  const { beat, phase } = step(t, BPM, 4);
  if (beat % 4 !== 0 || phase > 0.25) return 0;
  const f = 50 + 80 * env.exp(phase, 20);
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.35;
}).stop();

const hihat = signal('hihat').fn(t => {
  const { index, phase } = step(t, BPM, 16);
  if (index % 2 !== 0 || phase > 0.05) return 0;
  return signal.noise().eval(t) * env.exp(phase, 20) * 0.15;
}).stop();

// ============================================================================
// COMPOSITION - Clean bar-based async
// ============================================================================

async function composition() {
  console.log('[Bar 0] Intro: Pad\n');
  pad.play();
  await bars(4, BPM);

  console.log('[Bar 4] Verse: + Bass\n');
  bass.play();
  await bars(4, BPM);

  console.log('[Bar 8] Build: + Kick\n');
  kick.play();
  await bars(4, BPM);

  console.log('[Bar 12] Pre-chorus: + Arp\n');
  arp.play();
  await bars(4, BPM);

  console.log('[Bar 16] CHORUS: + Hi-hat (Full energy!)\n');
  hihat.play();
  await bars(8, BPM);

  console.log('[Bar 24] Break: - Drums\n');
  kick.stop();
  hihat.stop();
  await bars(4, BPM);

  console.log('[Bar 28] Break: - Bass\n');
  bass.stop();
  await bars(4, BPM);

  console.log('[Bar 32] Build: Drums back\n');
  kick.play();
  await bars(2, BPM);

  console.log('[Bar 34] Build: Bass back\n');
  bass.play();
  hihat.play();
  await bars(2, BPM);

  console.log('[Bar 36] Final DROP!\n');
  // Everything playing
  await bars(8, BPM);

  console.log('[Bar 44] Outro: - Melody & drums\n');
  arp.stop();
  kick.stop();
  hihat.stop();
  await bars(4, BPM);

  console.log('[Bar 48] Outro: - Bass\n');
  bass.stop();
  await bars(4, BPM);

  console.log('[Bar 52] End\n');
  pad.stop();

  setTimeout(() => {
    console.log('✓ Composition complete!\n');
    signal.stopAudio();
    process.exit(0);
  }, 2000);
}

// Run it!
composition().catch(err => {
  console.error('Error:', err);
  signal.stopAudio();
  process.exit(1);
});

console.log('52 bars @ 128 BPM');
console.log('Press Ctrl+C to stop\n');
