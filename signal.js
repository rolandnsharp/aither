// signal.js - KANON Live-Coding Interface
// ============================================================================
// LIVE CODING: Edit this file while audio is playing for instant updates!
// ============================================================================

// ============================================================================
// PATTERN 1: SIMPLE (Pure genish - fast, state resets on edit)
// ============================================================================
// Just return a genish graph. Best for effects, filters, static patches.
// Phase resets when you edit, but changes are instant.

// ============================================================================
// PATTERN 3: HYBRID - THE HOLY GRAIL OF LIVE SURGERY
// ============================================================================
// Genish-compiled performance + stateful phase = click-free parameter changes!
// Change baseFreq, detune, lfoRate while playing - perfectly smooth morphing

wave('hybrid-drone', (t) => {
  // === LIVE EDIT THESE PARAMETERS ===
  const baseFreq = 455;   // Try: 110, 220, 330, 440 (no clicks!)
  const detune = 15;      // Try: 0.5, 2, 5, 10, 20 (chorus width)
  const lfoRate = 0.3;    // Try: 0.1, 0.5, 1.0, 2.0 (pulsing speed)

  // Voice frequencies with detuning
  const freq1 = baseFreq;
  const freq2 = baseFreq + detune;
  const freq3 = baseFreq - (detune * 1.5);
  const freq4 = baseFreq + (detune * 2.2);

  // === VOICE 1 (STATE slot 0) ===
  const phase1 = peek(globalThis.STATE, 0, { mode: 'samples' });
  const newPhase1 = mod(add(phase1, freq1 / 44100), 1.0);
  poke(globalThis.STATE, newPhase1, 0);
  const osc1 = peek(globalThis.SINE_TABLE, newPhase1);

  // === VOICE 2 (STATE slot 1) ===
  const phase2 = peek(globalThis.STATE, 1, { mode: 'samples' });
  const newPhase2 = mod(add(phase2, freq2 / 44100), 1.0);
  poke(globalThis.STATE, newPhase2, 1);
  const osc2 = peek(globalThis.SINE_TABLE, newPhase2);

  // === VOICE 3 (STATE slot 2) ===
  const phase3 = peek(globalThis.STATE, 2, { mode: 'samples' });
  const newPhase3 = mod(add(phase3, freq3 / 44100), 1.0);
  poke(globalThis.STATE, newPhase3, 2);
  const osc3 = peek(globalThis.SINE_TABLE, newPhase3);

  // === VOICE 4 (STATE slot 3) ===
  const phase4 = peek(globalThis.STATE, 3, { mode: 'samples' });
  const newPhase4 = mod(add(phase4, freq4 / 44100), 1.0);
  poke(globalThis.STATE, newPhase4, 3);
  const osc4 = peek(globalThis.SINE_TABLE, newPhase4);

  // Mix the 4 voices
  const mix = mul(add(add(add(osc1, osc2), osc3), osc4), 0.25);

  // === LFO for amplitude modulation (STATE slot 10) ===
  const lfoPhase = peek(globalThis.STATE, 10, { mode: 'samples' });
  const newLfoPhase = mod(add(lfoPhase, lfoRate / 44100), 1.0);
  poke(globalThis.STATE, newLfoPhase, 10);
  const lfo = peek(globalThis.SINE_TABLE, newLfoPhase);

  // LFO range: 0.5 to 1.0 (pulsing, never silent)
  const lfoAmt = add(mul(lfo, 0.25), 0.75);

  // Apply LFO and output gain
  return mul(mul(mix, lfoAmt), 0.4);
});

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

// Commenting out JS stateful drone to test genish stateful
// wave('drone', (t, state) => {
//   return {
//     graph: mul(0, t),  // Dummy graph (we generate samples in update)
//     update: () => {
//       // LIVE EDIT THESE VALUES:
//       const baseFreq = 310;   // Try: 110, 220, 165, 82.5
//       const detune = 180;     // Try: 0.5, 2, 5, 10, 50
//       const lfoRate = 0.3;    // Try: 0.1, 0.5, 1.0, 2.0
//       const cutoff = 0.8;     // Try: 0.05, 0.15, 0.3, 0.5, 0.8
//
//       // 4-voice chorus (slight detuning creates width)
//       const freqs = [
//         baseFreq,
//         baseFreq + detune,
//         baseFreq - detune * 3.7,
//         baseFreq + detune * 2.3
//       ];
//
//       // Accumulate phase for each voice (state slots 0-3)
//       let mix = 0;
//       for (let i = 0; i < 2.2; i++) {
//         let phase = state[i] || 0;
//         phase = (phase + freqs[i] / 44100) % 1.0;
//         state[i] = phase;
//         mix += Math.sin(phase * 2 * Math.PI);
//       }
//       mix *= 0.4;  // Normalize volume
//
//       // LFO for pulsing volume (state slot 10)
//       let lfoPhase = state[1030] || 0;
//       lfoPhase = (lfoPhase + lfoRate / 44100) % 1.0;
//       state[10] = lfoPhase;
//       const lfoAmt = Math.sin(lfoPhase * 2 * Math.PI) * 0.3 + 0.7;
//
//       // Apply LFO
//       mix *= lfoAmt;
//
//       // One-pole lowpass filter (state slot 70 stores y[n-1])
//       let y_prev = state[70] || 0;
//       const filtered = y_prev + cutoff * (mix - y_prev);
//       state[70] = filtered;
//
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
