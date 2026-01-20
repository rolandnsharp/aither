// ============================================================================
// BOSCA CEOIL STYLE COMPOSITION
// ============================================================================
// Bar-based triggering instead of time-based
// Run with: node signal/bosca-style.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');
const { bars, onBar, getCurrentBar, loop } = signal;

console.log('Bosca Ceoil Style Composition');
console.log('=============================\n');

const BPM = 120;

// ============================================================================
// Create instruments (all stopped initially)
// ============================================================================

const bass = signal('bass').fn(t => {
  const { index, phase } = step(t, BPM, 2);  // Half notes
  const pattern = [0, 0, 5, 3];
  const degree = pattern[index % pattern.length];
  const f = freq(110, scales.minor, degree);
  const envelope = 0.7 + 0.3 * env.exp(phase, 3);
  return signal.sin(f).eval(t) * envelope * 0.3;
}).stop();

const melody = signal('melody').fn(t => {
  const { index, phase } = step(t, BPM, 8);  // 8th notes
  const pattern = [0, 3, 5, 3, 7, 5, 3, 0];
  const degree = pattern[index % pattern.length];
  const f = freq(440, scales.minor, degree);
  const envelope = env.exp(phase, 5);
  return signal.sin(f).eval(t) * envelope * 0.15;
}).stop();

const pad = signal('pad').fn(t => {
  return signal.mix(
    signal.sin(freq(220, scales.minor, 0)),
    signal.sin(freq(220, scales.minor, 3)),
    signal.sin(freq(220, scales.minor, 7))
  ).eval(t) * 0.08;
}).stop();

const kick = signal('kick').fn(t => {
  const { beat, phase } = step(t, BPM, 4);
  if (beat % 4 !== 0 || phase > 0.25) return 0;
  const pitchEnv = 80 * env.exp(phase, 20);
  const f = 50 + pitchEnv;
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.35;
}).stop();

const hihat = signal('hihat').fn(t => {
  const { index, phase } = step(t, BPM, 16);
  if (index % 2 !== 0 || phase > 0.05) return 0;
  return signal.noise().eval(t) * env.exp(phase, 20) * 0.15;
}).stop();

// ============================================================================
// COMPOSITION - Declarative bar-based triggering
// ============================================================================

console.log('Setting up bar-based composition...\n');

// Intro (bars 0-3)
onBar(0, BPM, () => {
  console.log('[Bar 0] Intro: Pad enters');
  pad.play();
});

// Verse 1 (bars 4-7)
onBar(4, BPM, () => {
  console.log('[Bar 4] Verse: Bass enters');
  bass.play();
});

// Pre-chorus (bars 8-11)
onBar(8, BPM, () => {
  console.log('[Bar 8] Build: Kick enters');
  kick.play();
});

// Chorus (bars 12-15)
onBar(12, BPM, () => {
  console.log('[Bar 12] Chorus: Melody enters');
  melody.play();
});

// Chorus full (bars 16-19)
onBar(16, BPM, () => {
  console.log('[Bar 16] Chorus: Hi-hat enters (full energy!)');
  hihat.play();
});

// Break (bars 20-23)
onBar(20, BPM, () => {
  console.log('[Bar 20] Break: Removing drums');
  kick.stop();
  hihat.stop();
});

// Break minimal (bars 24-27)
onBar(24, BPM, () => {
  console.log('[Bar 24] Break: Removing bass');
  bass.stop();
});

// Build back (bars 28-31)
onBar(28, BPM, () => {
  console.log('[Bar 28] Build: Drums return');
  kick.play();
  hihat.play();
});

onBar(30, BPM, () => {
  console.log('[Bar 30] Build: Bass returns');
  bass.play();
});

// Final chorus (bars 32-35)
onBar(32, BPM, () => {
  console.log('[Bar 32] Final chorus: Everything playing!');
});

// Outro (bars 36-39)
onBar(36, BPM, () => {
  console.log('[Bar 36] Outro: Removing melody and drums');
  melody.stop();
  kick.stop();
  hihat.stop();
});

// Outro minimal (bars 40-43)
onBar(40, BPM, () => {
  console.log('[Bar 40] Outro: Removing bass');
  bass.stop();
});

// End (bar 44)
onBar(44, BPM, () => {
  console.log('[Bar 44] End: Stopping pad');
  pad.stop();

  setTimeout(() => {
    console.log('\n✓ Composition complete!');
    signal.stopAudio();
    process.exit(0);
  }, 2000);
});

console.log('Composition: 44 bars @ 120 BPM');
console.log('Duration: ~176 seconds (2 min 56 sec)');
console.log('Press Ctrl+C to stop early\n');
console.log('Timeline:');
console.log('  Bars 0-3:   Intro (pad)');
console.log('  Bars 4-7:   Verse (+ bass)');
console.log('  Bars 8-11:  Build (+ kick)');
console.log('  Bars 12-15: Chorus (+ melody)');
console.log('  Bars 16-19: Full (+ hihat)');
console.log('  Bars 20-23: Break (- drums)');
console.log('  Bars 24-27: Break minimal (- bass)');
console.log('  Bars 28-31: Build back (drums + bass)');
console.log('  Bars 32-35: Final chorus');
console.log('  Bars 36-43: Outro');
console.log('  Bar 44:     End\n');
