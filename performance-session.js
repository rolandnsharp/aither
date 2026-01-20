// ============================================================================
// LIVE PERFORMANCE SESSION
// ============================================================================
// Demonstrates using .play()/.stop() for live performance control
// Run with: node signal/runner.js signal/performance-session.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');

// ============================================================================
// Create instrument layers that you can toggle on/off
// ============================================================================

// Layer 1: Bass
const bass = signal('bass').fn(t => {
  const { index, phase } = step(t, 128, 2);
  const pattern = [0, 0, 7, 5];
  const degree = pattern[index % pattern.length];
  const f = freq(110, scales.minor, degree);
  return signal.sin(f).eval(t) * env.exp(phase, 3) * 0.3;
});

// Layer 2: Arpeggio
const arp = signal('arp').fn(t => {
  const { index, phase } = step(t, 128, 16);
  const pattern = [0, 3, 7, 10, 7, 3];
  const degree = pattern[index % pattern.length];
  const f = freq(440, scales.minor, degree);
  return signal.sin(f).eval(t) * env.exp(phase, 8) * 0.15;
}).stop();  // Start muted

// Layer 3: Pad
const pad = signal('pad').fn(t => {
  return signal.mix(
    signal.sin(freq(330, scales.minor, 0)),
    signal.sin(freq(330, scales.minor, 3)),
    signal.sin(freq(330, scales.minor, 7))
  ).eval(t) * 0.1;
}).stop();  // Start muted

// Layer 4: Kick
const kick = signal('kick').fn(t => {
  const { beat, phase } = step(t, 128, 4);
  if (beat % 4 !== 0 || phase > 0.25) return 0;
  const f = 50 + 80 * env.exp(phase, 20);
  return signal.sin(f).eval(t) * env.exp(phase, 10) * 0.35;
});

// Layer 5: Hi-hat
const hihat = signal('hihat').fn(t => {
  const { index, phase } = step(t, 128, 16);
  if (phase > 0.05) return 0;
  const amplitude = index % 4 === 0 ? 0.2 : 0.1;  // Accent on downbeats
  return signal.noise().eval(t) * env.exp(phase, 15) * amplitude;
}).stop();  // Start muted

// ============================================================================
// Performance Controls
// ============================================================================

console.log('Live Performance Session');
console.log('========================\n');
console.log('Layers: bass(on), arp(off), pad(off), kick(on), hihat(off)');
console.log('\nEdit this file to toggle layers:\n');
console.log('  arp.play()   // Bring in arpeggio');
console.log('  arp.stop()    // Remove arpeggio');
console.log('  pad.play()   // Bring in pad');
console.log('  bass.stop()   // Remove bass');
console.log('  hihat.play() // Bring in hi-hat\n');

// ============================================================================
// Uncomment these to create an automatic performance
// ============================================================================

// setTimeout(() => {
//   console.log('[4s] Adding arpeggio...');
//   arp.play();
// }, 4000);

// setTimeout(() => {
//   console.log('[8s] Adding pad...');
//   pad.play();
// }, 8000);

// setTimeout(() => {
//   console.log('[12s] Adding hi-hat...');
//   hihat.play();
// }, 12000);

// setTimeout(() => {
//   console.log('[16s] Removing bass...');
//   bass.stop();
// }, 16000);

// setTimeout(() => {
//   console.log('[20s] Bringing bass back...');
//   bass.play();
// }, 20000);
