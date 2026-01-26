// signal.js - KANON Live-Coding Interface
// ============================================================================
// LIVE CODING: Change values while playing - instant updates!
// ============================================================================
// STRING-BASED LIVE SURGERY - Click-free parameter changes!
//
// Your wave functions receive (t, state) where state is a Float32Array[128]
// that persists across ALL code recompilations.
//
// PATTERN FOR LIVE SURGERY:
//   return {
//     graph: mul(0, t),  // Dummy graph or use genish for effects
//     update: () => {
//       // Manage state in JavaScript (phase, filter history, etc.)
//       let phase = state[0] || 0;
//       phase = (phase + freq/44100) % 1.0;
//       state[0] = phase;
//
//       // Return the sample value
//       return Math.sin(phase * 2 * Math.PI) * volume;
//     }
//   };
//
// This keeps phase/state in plain JavaScript while still enabling hot-reloads!
// ============================================================================

// LIVE SURGERY DEMO: Evolving Drone Texture
// This showcases true live surgery with:
//   - 4 independent oscillator phases (try changing frequencies!)
//   - LFO modulating volume (try changing rate!)
//   - Stateful lowpass filter (try changing cutoff!)
//   - Detune spread (try changing detune amount!)
// ALL parameters can be changed while playing with ZERO clicks!

wave('drone', (t, state) => {
  return {
    graph: mul(0, t),
    update: () => {
      // Base frequency - try: 110, 220, 165, 82.5
      const baseFreq = 310;

      // Detune spread in Hz - try: 0.5, 2, 5, 10
      const detune = 180;

      // Voice frequencies (slight detuning creates chorusing)
      const freqs = [
        baseFreq,
        baseFreq + detune,
        baseFreq - detune * 3.7,
        baseFreq + detune * 2.3
      ];

      // Oscillator phases (slots 0-3)
      let mix = 0;
      for (let i = 0; i < 2.2; i++) {
        let phase = state[i] || 0;
        phase = (phase + freqs[i] / 44100) % 1.0;
        state[i] = phase;
        mix += Math.sin(phase * 2 * Math.PI);
      }
      mix *= 0.4;  // Normalize for 4 voices

      // LFO for volume modulation (slot 10)
      let lfoPhase = state[1030] || 0;
      lfoPhase = (lfoPhase + 0.3 / 44100) % 1.0;  // Try: 0.1, 0.5, 1.0 Hz
      state[10] = lfoPhase;
      const lfoAmt = Math.sin(lfoPhase * 2 * Math.PI) * 0.3 + 0.7;  // 0.4 to 1.0

      // Apply LFO
      mix *= lfoAmt;

      // Stateful lowpass filter (slot 70 = y[n-1])
      const cutoff = 0.8;  // Try: 0.05, 0.3, 0.5, 0.8
      let y_prev = state[70] || 0;
      const filtered = y_prev + cutoff * (mix - y_prev);
      state[70] = filtered;

      // Output - try changing volume: 0.3, 0.6, 0.8
      return filtered * 0.6;
    }
  };
});

// ============================================================================
// TRY THESE LIVE EDITS (while audio is playing):
// ============================================================================
// 1. Change baseFreq: 110 → 220 (octave up, phases continue!)
// 2. Change detune: 2 → 10 (thicker chorus, no glitches!)
// 3. Change LFO rate: 0.3 → 1.0 (faster pulsing, phase preserved!)
// 4. Change cutoff: 0.15 → 0.5 (brighter tone, filter state intact!)
// 5. Change number of voices: comment out some freqs[] entries
// 6. Add more voices: add more freqs[] and increase loop count
//
// Every change morphs seamlessly - this is true live surgery!
// ============================================================================

// Example 2: FM synthesis with persistent carrier and modulator phases
// wave('fm', (t, state) => {
//   return {
//     graph: mul(0, t),
//     update: () => {
//       // Modulator at slot 0
//       let modPhase = state[0] || 0;
//       modPhase = (modPhase + 5/44100) % 1.0;  // 5Hz LFO
//       state[0] = modPhase;
//
//       const modulation = Math.sin(modPhase * 2 * Math.PI) * 100;  // ±100Hz
//
//       // Carrier at slot 1
//       let carPhase = state[1] || 0;
//       carPhase = (carPhase + (440 + modulation)/44100) % 1.0;
//       state[1] = carPhase;
//
//       return Math.sin(carPhase * 2 * Math.PI) * 0.5;
//     }
//   };
// });

// Example 2 (original, commented out for reference): FM synthesis with continuous phase
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
// STATE SLOT ORGANIZATION (Float32Array[128]):
// 0-19:   Main oscillator phases (carriers, basses)
// 20-39:  LFO and modulator phases
// 40-59:  Smoother values and envelope states
// 60-69:  Rhythm clock phases
// 70-89:  Filter history (y[n-1], y[n-2], etc.)
// 90-109: Time accumulators for sequencing
// 110-127: Reserved for user experiments
//
// ============================================================================
// HOW TO PERFORM LIVE SURGERY (CLICK-FREE HOT-SWAPPING):
// ============================================================================
// 1. Start the engine: bun run host.ts
// 2. Uncomment one of the examples above (or write your own)
// 3. While audio is playing, change a frequency (e.g., 220 → 440)
// 4. Save the file
// 5. Result: The sound morphs INSTANTLY without clicks or phase resets!
//
// This works because:
//   - State lives in Float32Array that survives recompilation
//   - JavaScript code gets eval'd with preserved state context
//   - Phase continues from current position = seamless transitions
//
// This is TRUE Incudine-grade live coding in JavaScript!
// ============================================================================
