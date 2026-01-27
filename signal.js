// signal.js - KANON Live-Coding Interface
// ============================================================================
// LIVE CODING: Edit this file while audio is playing for instant updates!
// ============================================================================

// ============================================================================
// PATTERN 1: SIMPLE (Pure genish - fast, state resets on edit)
// ============================================================================
// Just return a genish graph. Best for effects, filters, static patches.
// Phase resets when you edit, but changes are instant.

// Simple 440Hz sine wave (test simple pattern):
wave('sine', (t) => mul(cycle(440), 0.5));

// Try changing the frequency or adding effects:
// wave('filtered', (t) => lp(mul(cycle(220), 0.7), 0.2));


// ============================================================================
// PATTERN 2: STATEFUL (JavaScript state - enables live surgery!)
// ============================================================================
// Return {graph, update} where update() manages persistent state.
// Phase/state survives edits = zero clicks when changing parameters!

// LIVE SURGERY DEMO: Evolving drone with 4 voices, LFO, and filter
// Try these live edits while it's playing:
//   - Change baseFreq: 110 → 220 → 165 (no clicks!)
//   - Change detune: 2 → 10 → 0.5 (chorus effect morphs)
//   - Change LFO rate: 0.3 → 1.0 → 0.1 (pulsing speeds up/down)
//   - Change cutoff: 0.15 → 0.5 → 0.05 (brightness changes)

// Stateful drone (comment out to test simple pattern)
// wave('drone', (t, state) => {
//   return {
//     graph: mul(0, t),  // Dummy graph (we generate samples in update)
//     update: () => {
      // LIVE EDIT THESE VALUES:
      const baseFreq = 310;   // Try: 110, 220, 165, 82.5
      const detune = 180;     // Try: 0.5, 2, 5, 10, 50
      const lfoRate = 0.3;    // Try: 0.1, 0.5, 1.0, 2.0
      const cutoff = 0.8;     // Try: 0.05, 0.15, 0.3, 0.5, 0.8

      // 4-voice chorus (slight detuning creates width)
      const freqs = [
        baseFreq,
        baseFreq + detune,
        baseFreq - detune * 3.7,
        baseFreq + detune * 2.3
      ];

      // Accumulate phase for each voice (state slots 0-3)
      let mix = 0;
      for (let i = 0; i < 2.2; i++) {
        let phase = state[i] || 0;
        phase = (phase + freqs[i] / 44100) % 1.0;
        state[i] = phase;
        mix += Math.sin(phase * 2 * Math.PI);
      }
      mix *= 0.4;  // Normalize volume

      // LFO for pulsing volume (state slot 10)
      let lfoPhase = state[1030] || 0;
      lfoPhase = (lfoPhase + lfoRate / 44100) % 1.0;
      state[10] = lfoPhase;
      const lfoAmt = Math.sin(lfoPhase * 2 * Math.PI) * 0.3 + 0.7;

      // Apply LFO
      mix *= lfoAmt;

      // One-pole lowpass filter (state slot 70 stores y[n-1])
      let y_prev = state[70] || 0;
      const filtered = y_prev + cutoff * (mix - y_prev);
      state[70] = filtered;

//       return filtered * 0.6;
//     }
//   };
// });


// ============================================================================
// MORE EXAMPLES (uncomment to try)
// ============================================================================

// SIMPLE: FM synthesis using pure genish
// wave('fm', (t) => {
//   const modulator = mul(cycle(5), 100);        // 5Hz LFO, ±100Hz depth
//   const carrier = cycle(add(440, modulator));  // 440Hz +/- modulation
//   return mul(carrier, 0.5);
// });

// SIMPLE: Filtered sawtooth bass
// wave('bass', (t) => lp(mul(phasor(110), 0.8), 0.1));

// SIMPLE: Noise burst with reverb
// wave('ambient', (t) => reverb(mul(noise(), 0.1), 0.7, 0.2));

// STATEFUL: Kick drum with envelope
// wave('kick', (t, state) => {
//   return {
//     graph: mul(0, t),
//     update: () => {
//       const bpm = 120;
//       const beatPeriod = 44100 * 60 / bpm;
//
//       // Beat clock (state slot 0)
//       let clock = state[0] || 0;
//       clock = (clock + 1) % beatPeriod;
//       state[0] = clock;
//
//       // Envelope (exponential decay)
//       let env = state[1] || 0;
//       if (clock === 0) env = 1.0;  // Trigger on beat
//       env *= 0.99;  // Decay
//       state[1] = env;
//
//       // Oscillator (50Hz kick)
//       let phase = state[2] || 0;
//       phase = (phase + 50 / 44100) % 1.0;
//       state[2] = phase;
//
//       return Math.sin(phase * 2 * Math.PI) * env * 0.7;
//     }
//   };
// });

// HYBRID: Use genish for effects, JavaScript for oscillator state
// wave('hybrid', (t, state) => {
//   const phaseParam = mul(0, t);  // Placeholder
//
//   // Genish graph with effects
//   const graph = dub(
//     saturate(mul(cycle(440), 0.5), 2.0),
//     11025,
//     0.6,
//     0.1
//   );
//
//   return {
//     graph: graph,
//     update: () => {
//       // Could manage state here if needed, or just return nothing
//       // to let genish handle everything
//     }
//   };
// });


// ============================================================================
// STATE BUFFER ORGANIZATION (Float32Array[128])
// ============================================================================
// Organize your state slots to avoid conflicts:
//
//   0-19:   Oscillator phases (carriers, subs, leads)
//   20-39:  LFO phases, modulators
//   40-59:  Envelopes, smoothers
//   60-69:  Beat clocks, sequencer positions
//   70-89:  Filter history (y[n-1], y[n-2], etc.)
//   90-109: Delay/reverb buffers (when using JavaScript)
//   110-127: User experiments
//
// Example:
//   state[0]  = carrier phase
//   state[10] = LFO phase
//   state[70] = lowpass filter history
//
// The state buffer persists across all code changes, enabling true live surgery!
// ============================================================================
