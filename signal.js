// signal.js - KANON Live-Coding Interface
// ============================================================================
// LIVE SURGERY: Change values while playing - no clicks, instant morphs!
// Each oscillator has a "slot" number (0-62) that preserves its phase.
// ============================================================================

// Example 1: Pure tone - try changing 220 to 440 mid-performance
wave('tone', t => liveSin(220, 0));

// Example 2: FM synthesis with continuous phase
// Try changing modulation depth (100 → 500) or carrier freq (440 → 220)
// wave('fm', t => {
//   const mod = gain(100, liveSin(5, 1));      // 5Hz LFO at slot 1
//   const carrier = liveSin(add(440, mod), 0); // Carrier at slot 0
//   return gain(0.5, carrier);
// });

// Example 3: Rhythmic gate using square wave
// wave('gate', t => {
//   const rhythm = liveSquare(2, 2);           // 2Hz gate at slot 2
//   const tone = liveSin(330, 3);              // 330Hz tone at slot 3
//   return gain(0.6, mul(tone, rhythm));
// });

// Example 4: Binaural beating (requires stereo support - TODO)
// wave('binaural', t => {
//   const left = liveSin(440, 4);
//   const right = liveSin(445, 5);  // 5Hz difference creates spatial effect
//   return [gain(0.3, left), gain(0.3, right)];
// });

// Example 5: Generative texture using persistent time
// wave('texture', t => {
//   const T = liveTime(8, 10);  // 8-second loop at slot 10
//   const freq = add(110, mul(T, 50));  // Frequency rises over 8 seconds
//   return gain(0.4, liveSin(freq, 11));
// });

// Example 6: Multiple voices (chord)
// wave('chord', t => {
//   const root = liveSin(220, 0);
//   const third = liveSin(277, 1);  // Major third
//   const fifth = liveSin(330, 2);  // Perfect fifth
//   return gain(0.2, add(root, third, fifth));
// });

// Example 7: Smooth parameter changes (no pops when editing gain)
// wave('smooth', t => {
//   const tone = liveSin(440, 0);
//   const volume = smooth(0.5, 0.999, 40);  // Try changing 0.5 to 0.1
//   return mul(tone, volume);
// });

// Example 8: Rhythmic kick with beat clock
// wave('kick', t => {
//   const kick = liveSin(50, 0);         // 50Hz kick drum
//   const trigger = beat(120, 60);       // 120 BPM trigger
//   return mul(kick, trigger, 0.7);
// });

// Example 9: Filtered pad with stateful lowpass
// wave('pad', t => {
//   const saw = liveSaw(110, 0);         // Rich sawtooth
//   const filtered = lp(saw, 0.05, 70);  // Try changing cutoff (0.01 to 0.5)
//   return gain(0.4, filtered);
// });

// Example 10: Complete track with all elements
// wave('track', t => {
//   // Kick drum on the beat
//   const kick = mul(liveSin(50, 0), beat(120, 60), 0.8);
//
//   // Bass line with smooth volume
//   const bassOsc = liveSin(110, 1);
//   const bassVol = smooth(0.3, 0.999, 40);
//   const bass = mul(bassOsc, bassVol);
//
//   // Filtered pad
//   const pad = lp(liveSaw(220, 2), 0.1, 70);
//
//   return gain(0.5, add(kick, bass, gain(0.2, pad)));
// });

// ============================================================================
// MEMORY SLOT ORGANIZATION:
// 0-19:   Main oscillators (carriers, basses)
// 20-39:  LFOs and modulators
// 40-59:  Smoothers and envelopes
// 60-69:  Rhythm clocks (beat)
// 70-89:  Filter history
// 90-109: Time accumulators
//
// ============================================================================
// HOW TO PERFORM LIVE SURGERY:
// 1. Pick an example, uncomment it
// 2. Start the engine: bun run host.ts
// 3. While it's playing, change a frequency, modulation depth, or cutoff
// 4. Save the file
// 5. Result: The sound morphs instantly without any click or phase reset
// ============================================================================
