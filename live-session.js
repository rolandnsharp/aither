// live-session.js - Live Coding Interface (Kanon Engine)
// ============================================================================
// LIVE CODING: Edit this file while audio is playing for instant updates!
// ============================================================================
// Hot-reload compatible: Uses globalThis.KANON_STATE for phase continuity
// ============================================================================

import { kanon, clear } from './src/kanon.js';
import { pipe, sin, saw, tri, square, lfo, gain, pan, stereo, mix, am, softClip, feedback } from './src/helpers.js';

clear();
// ============================================================================
// MANUAL API TEST - Basic sine for testing hot-reload
// ============================================================================

  // kanon('basic-sines3', (state, idx) => {
  //   // GC OPTIMIZATION: Create the output vector once and reuse it.
  //   const reusableVector = new Float64Array(1);
  //   const freq = 444;

  //   console.log(`[REGISTER] freq=${freq}Hz, idx=${idx}`);

  //   return {
  //     update: (sr) => {
  //       state[idx] = ((state[idx] || 0) + freq / sr) % 1.0;

  //       // Log occasionally
  //       if (Math.random() < 0.0001) {
  //         console.log(`[UPDATE] phase=${state[idx].toFixed(3)}`);
  //       }

  //       reusableVector[0] = Math.sin(state[idx] * 2 * Math.PI) * 0.3;
  //       return reusableVector;
  //     }
  //   };
  // });



// ============================================================================
// EXAMPLE 1: Breathing Sine (Simple amplitude modulation)
// ============================================================================
// A pure sine wave whose volume breathes with an LFO

kanon('breathing-sine', (state, idx) => {
  const carrierFreq = 220.0; // A3 note
  const lfoFreq = 0.5; // Breathe twice per second
  const lfoDepth = 0.7; // How much the volume changes

  return {
    update: (sr) => {
      // Carrier oscillator (state slot idx)
      let carrierPhase = state[idx];
      carrierPhase = (carrierPhase + carrierFreq / sr) % 1.0;
      state[idx] = carrierPhase;
      const carrier = Math.sin(carrierPhase * 2 * Math.PI);

      // LFO for amplitude modulation (state slot idx+1)
      let lfoPhase = state[idx + 1];
      lfoPhase = (lfoPhase + lfoFreq / sr) % 1.0;
      state[idx + 1] = lfoPhase;
      // Convert LFO to unipolar (0..1)
      const lfo = (Math.sin(lfoPhase * 2 * Math.PI) + 1) * 0.5;

      // Apply amplitude modulation
      const amplitude = (1 - lfoDepth) + lfo * lfoDepth;
      const output = carrier * amplitude * 0.5; // Scale to safe level

      return [output]; // Mono output
    }
  };
});

// ============================================================================
// EXAMPLE 2: Vortex Morph (Phase-Modulated Feedback Loop)
// ============================================================================
// An organic, growling cello-like tone that continuously evolves
// Uses phase modulation for complex, non-linear harmonics



// kanon('vortex-morph474', (mem, idx) => {
//   // --- SURGERY PARAMS (change these live!) ---
//   const baseFreq = 122.0;    // Deep G2 note
//   // const modRatio = 1.618;    // Golden Ratio (non-harmonic shimmer)
//   const modRatio = 1.1;    // Golden Ratio (non-harmonic shimmer)
//   const morphSpeed = 2;    // How fast the "vortex" breathes (Hz)
//   const intensity = 4.0;     // Modulation depth (try 50.0 for chaos!)

//   return {
//     update: (sr) => {
//       // 1. Accumulate three phases
//       let p1 = mem[idx];     // Carrier Phase
//       let p2 = mem[idx + 1]; // Modulator Phase
//       let t  = mem[idx + 2]; // Global LFO for morphing

//       p1 = (p1 + baseFreq / sr) % 1.0;
//       p2 = (p2 + (baseFreq * modRatio) / sr) % 1.0;
//       t  = (t + morphSpeed / sr) % 1.0;

//       mem[idx] = p1;
//       mem[idx + 1] = p2;
//       mem[idx + 2] = t;

//       // 2. The Functional Surgery
//       // Use the second osc to warp the time-space of the first osc
//       const depthLFO = Math.sin(t * 2 * Math.PI) * intensity;
//       const modulator = Math.sin(p2 * 2 * Math.PI) * depthLFO;

//       const sample = Math.sin(p1 * 2 * Math.PI + modulator);

//       // Return as a mono-vector (STRIDE 1)
//       return [sample * 0.5];
//     }
//   };
// });



// kanon('vortex-333', (mem, idx) => {
//   // --- SURGERY PARAMS (change these live!) ---
//   const baseFreq = 22.0;    // Deep G2 note
//   // const modRatio = 1.618;    // Golden Ratio (non-harmonic shimmer)
//   const modRatio = 2.1;    // Golden Ratio (non-harmonic shimmer)
//   const morphSpeed = 0.1;    // How fast the "vortex" breathes (Hz)
//   const intensity = 44;     // Modulation depth (try 50.0 for chaos!)

//   return {
//     update: (sr) => {
//       // 1. Accumulate three phases
//       let p1 = mem[idx];     // Carrier Phase
//       let p2 = mem[idx + 1]; // Modulator Phase
//       let t  = mem[idx + 2]; // Global LFO for morphing

//       p1 = (p1 + baseFreq / sr) % 1.0;
//       p2 = (p2 + (baseFreq * modRatio) / sr) % 1.0;
//       t  = (t + morphSpeed / sr) % 1.0;

//       mem[idx] = p1;
//       mem[idx + 1] = p2;
//       mem[idx + 2] = t;

//       // 2. The Functional Surgery
//       // Use the second osc to warp the time-space of the first osc
//       const depthLFO = Math.sin(t * 2 * Math.PI) * intensity;
//       const modulator = Math.sin(p2 * 2 * Math.PI) * depthLFO;

//       const sample = Math.sin(p1 * 2 * Math.PI + modulator);

//       // Return as a mono-vector (STRIDE 1)
//       return [sample * 0.5];
//     }
//   };
// });

// kanon('vortex-444', (mem, idx) => {
//   // --- SURGERY PARAMS (change these live!) ---
//   const baseFreq = 359.0;    // Deep G2 note
//   const modRatio = 1.618;    // Golden Ratio (non-harmonic shimmer)
//   // const modRatio = 1.1;    // Golden Ratio (non-harmonic shimmer)
//   const morphSpeed = 0.1;    // How fast the "vortex" breathes (Hz)
//   const intensity = 22.0;     // Modulation depth (try 50.0 for chaos!)

//   return {
//     update: (sr) => {
//       // 1. Accumulate three phases
//       let p1 = mem[idx];     // Carrier Phase
//       let p2 = mem[idx + 1]; // Modulator Phase
//       let t  = mem[idx + 2]; // Global LFO for morphing

//       p1 = (p1 + baseFreq / sr) % 1.0;
//       p2 = (p2 + (baseFreq * modRatio) / sr) % 1.0;
//       t  = (t + morphSpeed / sr) % 1.0;

//       mem[idx] = p1;
//       mem[idx + 1] = p2;
//       mem[idx + 2] = t;

//       // 2. The Functional Surgery
//       // Use the second osc to warp the time-space of the first osc
//       const depthLFO = Math.sin(t * 2 * Math.PI) * intensity;
//       const modulator = Math.sin(p2 * 2 * Math.PI) * depthLFO;

//       const sample = Math.sin(p1 * 2 * Math.PI + modulator);

//       // Return as a mono-vector (STRIDE 1)
//       return [sample * 0.2];
//     }
//   };
// });


// ============================================================================
// EXAMPLE 3: Van der Pol Oscillator (Functional Style)
// ============================================================================
// A non-linear limit cycle oscillator (sounds like a reed or heartbeat)
// Pure functional transformer: state -> nextState
// UNCOMMENT to hear it (it's slow and pulsing - that's correct!)

// The Physics: Pure state transition function
// const vanDerPolStep = (state, { mu, dt }) => {
//   const [x, y] = state;

//   // The non-linear damping term
//   const dx = y;
//   const dy = mu * (1 - x * x) * y - x;

//   return [x + dx * dt, y + dy * dt];
// };

// kanon('van-der-pol', (mem, idx) => {
//   // --- SURGERY PARAMETERS ---
//   // mu: 0.1 (sine-like) to 5.0 (aggressive/jagged)
//   // dt: Controls pitch/speed (0.01 = very low, 0.15 = audio rate)
//   const params = { mu: 1.5, dt: 0.12 }; // Increased dt for faster oscillation

//   // Initialize if empty
//   if (mem[idx] === 0) {
//     mem[idx] = 0.1;
//     mem[idx + 1] = 0.1;
//   }

//   return {
//     update: () => {
//       // 1. Extract current state
//       const current = [mem[idx], mem[idx + 1]];

//       // 2. Transform (Pure functional step)
//       const [nextX, nextY] = vanDerPolStep(current, params);

//       // 3. Commit to persistent memory
//       mem[idx] = nextX;
//       mem[idx + 1] = nextY;

//       // 4. Emit (X is the signal, Y is 90° out of phase)
//       return [nextX * 0.4]; // Mono output, scaled to safe level
//     }
//   };
// });

// ============================================================================
// EXAMPLE 3: Lorenz Attractor (Chaos Theory)
// ============================================================================
// The "butterfly effect" - never repeats the same path twice

// const lorenzStep = (state, { sigma, rho, beta, dt }) => {
//   const [x, y, z] = state;

//   const dx = sigma * (y - x);
//   const dy = x * (rho - z) - y;
//   const dz = x * y - beta * z;

//   return [x + dx * dt, y + dy * dt, z + dz * dt];
// };

// kanon('lorenz-chaos', (mem, idx) => {
//   // Classic Lorenz parameters
//   const params = { sigma: 10, rho: 28, beta: 8 / 3, dt: 0.005 };

//   // Initialize state if empty
//   if (mem[idx] === 0) {
//     mem[idx] = 0.1;
//     mem[idx + 1] = 0.1;
//     mem[idx + 2] = 0.1;
//   }

//   return {
//     update: () => {
//       // 1. Extract
//       const current = [mem[idx], mem[idx + 1], mem[idx + 2]];

//       // 2. Transform
//       const [nextX, nextY, nextZ] = lorenzStep(current, params);

//       // 3. Commit
//       mem[idx] = nextX;
//       mem[idx + 1] = nextY;
//       mem[idx + 2] = nextZ;

//       // 4. Emit (X-axis as audio, normalized)
//       return [nextX * 0.05]; // Mono output
//     }
//   };
// });

// ============================================================================
// EXAMPLE 4: FM Vortex (Frequency Modulation)
// ============================================================================
// Classic FM synthesis for metallic, shimmering tones

// kanon('fm-vortex', (mem, idx) => {
//   const carrierFreq = 110.0; // Base frequency
//   const modRatio = 1.618; // Golden ratio for organic shimmer
//   const modIndex = 2.5; // Modulation depth

//   return {
//     update: (sr) => {
//       // Modulator oscillator
//       mem[idx] = (mem[idx] + (carrierFreq * modRatio) / sr) % 1.0;
//       const modSignal = Math.sin(mem[idx] * 2 * Math.PI) * modIndex;

//       // Carrier oscillator (frequency modulated by modSignal)
//       const instantFreq = carrierFreq + modSignal * 100;
//       mem[idx + 1] = (mem[idx + 1] + instantFreq / sr) % 1.0;

//       const output = Math.sin(mem[idx + 1] * 2 * Math.PI) * 0.5;
//       return [output]; // Mono output
//     }
//   };
// });

// ============================================================================
// FUNCTIONAL COMPOSITION EXAMPLES (Using helpers.js)
// ============================================================================
// The new functional API allows elegant signal composition!

// EXAMPLE 4: Simple sine with gain (functional style)
// kanon('functional-sine34', pipe(
//   sin(333),           // 440 Hz sine wave
//   gain(0.2)           // Scale amplitude to 30%
// ));

// EXAMPLE 5: Stereo panned sine
// kanon('panned-sine', pipe(
//   sin(330),           // E4 note
//   gain(0.4),
//   pan(0.75)           // Pan to the right (0=left, 0.5=center, 1=right)
// ));

// EXAMPLE 6: Mixed waveforms
// kanon('mixed-waves', pipe(
//   mix(
//     pipe(sin(240), gain(0.3)),    // A3 sine
//     // pipe(saw(330), gain(0.2)),    // E4 sawtooth
//     // pipe(tri(440), gain(0.2))     // A4 triangle
//   ),
//   softClip()          // Soft clipping prevents distortion
// ));

// EXAMPLE 7: Amplitude modulation (tremolo)
// kanon('tremolo', pipe(
//   am(
//     lfo(4)            // 4 Hz modulator (0-1 range)
//   )(
//     sin(440)          // 440 Hz carrier
//   ),
//   gain(2)
// ));

// EXAMPLE 8: Stereo with independent channels
// kanon('stereo-pad', stereo(
//   pipe(sin(220), gain(3)),    // Left: A3
//   pipe(sin(330), gain(3))     // Right: E4 (perfect fifth)
// ));

// EXAMPLE 9: Binaural Beat (2Hz beat frequency for deep relaxation)
// kanon('binaural', pipe(
//   stereo(
//     pipe(sin(432), gain(0.3)),    // Left: 432 Hz
//     pipe(sin(434), gain(0.3))     // Right: 434 Hz (2Hz beat)
//   )
//   // Add feedback for ambient echo:
//   ,feedback(2, 2)              // 300ms delay, 40% feedback
// ));

// ============================================================================
// LIVE SURGERY TIPS
// ============================================================================
// 1. Change parameters (freq, gain, pan) and save - sound morphs instantly!
// 2. Uncomment different examples to hear various approaches
// 3. Multiple kanon() calls play simultaneously (each needs unique ID)
// 4. State persists in globalThis.KANON_STATE during hot-reload
// 5. All signals auto-mix and soft-clip via Math.tanh() in updateAll()
// 6. Functional style (pipe/compose) is cleaner for simple signals
// 7. Manual style gives more control for complex state management
// ============================================================================
