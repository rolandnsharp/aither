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

// Example 10: Echo effect (classic delay)
// wave('echo-test', t => {
//   const tone = mul(liveSin(440, 0), beat(2, 60), 0.5);  // Beeping tone
//   return echo(tone, 11025, 0.6);  // 250ms delay, 60% feedback
// });

// Example 11: Dub-style delay with filtering
// wave('dub', t => {
//   const stab = mul(liveSaw(220, 0), beat(1, 60));
//   return dub(stab, 22050, 0.7, 0.1);  // Dark, organic repeats
// });

// Example 12: Bitcrusher lo-fi effect
// wave('lofi', t => {
//   const clean = liveSin(330, 0);
//   return crush(clean, 6);  // Try 4, 8, 12 bits
// });

// Example 13: Tape saturation / distortion
// wave('saturated', t => {
//   const clean = liveSin(110, 0);
//   return saturate(clean, 3.0);  // Try 1.0-10.0
// });

// Example 14: Wavefolding (Buchla-style)
// wave('folded', t => {
//   const clean = liveSin(220, 0);
//   return fold(clean, 2.5);  // Try 1.0-4.0
// });

// Example 15: Reverb (spacious ambience)
// wave('space', t => {
//   const dry = mul(liveSin(440, 0), beat(2, 60), 0.4);
//   return reverb(dry, 0.7, 0.2);  // size, damping
// });

// Example 16: Comb filter (metallic resonance)
// wave('metallic', t => {
//   const pulse = mul(noise(), beat(4, 60), 0.3);  // Noise burst
//   return comb(pulse, 441, 0.8);  // 100Hz resonance
// });

// Example 17: Karplus-Strong plucked string
// wave('pluck', t => {
//   const pluck = mul(noise(), beat(2, 60), 0.5);  // Trigger
//   return karplus(pluck, 220, 0.995);  // A3 string
// });

// Example 18: Feedback loop with processing
// wave('feedback-chaos', t => {
//   const source = liveSin(110, 0);
//   return feedback(source, sig => saturate(sig, 2.0), 0.3, 100);
// });

// Example 19: Complete track with effects
// wave('track', t => {
//   // Kick drum on the beat
//   const kick = mul(liveSin(50, 0), beat(120, 60), 0.8);
//
//   // Bass line with dub delay
//   const bassOsc = liveSin(110, 1);
//   const bassVol = smooth(0.3, 0.999, 40);
//   const bass = dub(mul(bassOsc, bassVol), 22050, 0.5, 0.08);
//
//   // Saturated lead with echo
//   const lead = saturate(liveSaw(440, 2), 2.0);
//   const leadEcho = echo(lead, 11025, 0.4);
//
//   // Reverb pad
//   const pad = reverb(lp(liveSaw(220, 3), 0.05, 70), 0.6, 0.3);
//
//   return gain(0.6, add(kick, bass, gain(0.5, leadEcho), gain(0.2, pad)));
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
