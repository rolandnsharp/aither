// live-session.js - Epic Five Element Soundscape
// Demonstrating all five paradigms working together through the unified f(s) interface
//
// 🔥 Kanon (Fire) - Pure time functions using s.t
// 🌍 Rhythmos (Earth) - Explicit state using s.state, s.sr
// 💨 Atomos (Air) - Discrete processes using s.state, s.dt
// 💧 Physis (Water) - Physics simulation using s.dt
// ✨ Chora (Aither) - Spatial synthesis using s.position

clear(true); // Full reset for a clean start

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  EPIC FIVE ELEMENT SOUNDSCAPE');
console.log('  "One interface. Five paradigms. Infinite expression."');
console.log('  🎼 Pure functional cross-paradigm composition');
console.log('═══════════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// 🎼 CONTROL SIGNALS - Pure Functions of s
// ═══════════════════════════════════════════════════════════════════════════
// These are reusable control signals that any paradigm can call.
// They're just f(s) → value, like any other signal!

// Earth pulse phase (normalized 0-1)
const earthPulsePhase = s => {
  const PULSE_PHASE_SLOT = 100; // Use high slot numbers to avoid conflicts
  const pulseMod = 1 + waterTension(s) * 0.5; // Water tension speeds up pulse
  s.state[PULSE_PHASE_SLOT] = (s.state[PULSE_PHASE_SLOT] || 0) + (2 * pulseMod) / s.sr;
  s.state[PULSE_PHASE_SLOT] %= 1.0;
  return s.state[PULSE_PHASE_SLOT];
};

// Earth energy (pulse envelope 0.3-1.0)
const earthEnergy = s => {
  const phase = earthPulsePhase(s);
  return phase < 0.5 ? 1 : 0.3;
};

// Water tension (from spring displacement)
const waterTension = s => {
  const WATER_SPRING_POS_SLOT = 110;
  return Math.abs(s.state[WATER_SPRING_POS_SLOT] || 0);
};

// Water flow (from ripple velocities)
const waterFlow = s => {
  const RIPPLE_VEL_BASE = 120;
  const numSprings = 3;
  let totalVelocity = 0;
  for (let i = 0; i < numSprings; i++) {
    totalVelocity += Math.abs(s.state[RIPPLE_VEL_BASE + i] || 0);
  }
  return totalVelocity / numSprings;
};

// Spatial density (from field source amplitudes)
const spatialDensity = s => {
  const { x, y, z } = s.position;
  const sources = [
    [0, 0, 0],    // Center
    [3, 0, 0],    // Right
    [-3, 0, 0]    // Left
  ];
  let densitySum = 0;
  for (const [sx, sy, sz] of sources) {
    const dx = x - sx, dy = y - sy, dz = z - sz;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    densitySum += 1 / (distance + 1);
  }
  return densitySum / sources.length;
};

// Spatial movement (from orbit speeds)
const spatialMovement = s => {
  const orbitSpeed = 0.5 + earthEnergy(s) * 0.3 + waterFlow(s) * 0.2;
  return orbitSpeed;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 KANON (Fire) - Pure Time Functions
// ═══════════════════════════════════════════════════════════════════════════
// Uses only s.t - no state, purely mathematical

play('fire-drone',
  pipe(
    // Deep bass drone with slow amplitude modulation
    s => {
      const baseFreq = 555; // A1
      const harmonic2 = 210; // A2
      const harmonic3 = 365; // E3

      // Three harmonics for richness
      const fundamental = Math.sin(2 * Math.PI * baseFreq * s.t);
      const second = Math.sin(2 * Math.PI * harmonic2 * s.t) * 0.5;
      const third = Math.sin(2 * Math.PI * harmonic3 * s.t) * 0.3;

      // Slow amplitude modulation (0.1 Hz = 6 beats per minute)
      const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * s.t);

      return (fundamental + second + third) * am * 0.25;
    },
    signal => lowpass(signal, 400), // Dark, warm filter
    signal => feedback(signal, 3.0, 1.5, 0.2) // Long reverb-like feedback
  )
);

// play('fire-melody',
//   pipe(
//     // Melodic line using pure sine waves
//     s => {
//       // Melody changes every 4 seconds
//       const melodyIndex = Math.floor(s.t / 4) % 4;
//       const melody = [220, 247, 277, 330]; // A3, B3, C#4, E4
//       const freq = melody[melodyIndex];

//       // Fade in/out within each note
//       const phase = (s.t % 4) / 4;
//       const envelope = Math.sin(phase * Math.PI);

//       return Math.sin(2 * Math.PI * freq * s.t) * envelope * 0.15;
//     },
//     signal => delay(signal, 1.0, 0.375), // Dotted eighth note delay
//     signal => tremolo(signal, 6, 0.4) // Slight vibrato effect
//   )
// );

// ═══════════════════════════════════════════════════════════════════════════
// 🌍 RHYTHMOS (Earth) - Explicit State (Phase Accumulators)
// ═══════════════════════════════════════════════════════════════════════════
// Uses s.state for phase accumulation, s.sr for sample rate

// play('earth-pulse',
//   s => {
//     // Pulsing chord progression
//     const chordIndex = Math.floor(s.t / 8) % 2;
//     const chords = [
//       [110, 138.6, 165],    // A2, C#3, E3
//       [98, 130.8, 164.8]    // G2, C3, E3
//     ];
//     const freqs = chords[chordIndex];

//     let output = 0;
//     for (let i = 0; i < freqs.length; i++) {
//       s.state[i] = (s.state[i] || 0) + freqs[i] / s.sr;
//       s.state[i] %= 1.0;
//       output += Math.sin(s.state[i] * 2 * Math.PI);
//     }

//     // Get the rhythmic pulse by calling the control signal
//     const pulse = earthEnergy(s);

//     return output / freqs.length * pulse * 0.92;
//   }
// );

// play('earth-lead',
//   pipe(
//     s => {
//       // Evolving lead synth with detuned oscillators
//       // Spatial density influences the pitch drift amount
//       const driftAmount = 20 + spatialDensity(s) * 30;
//       const baseFreq = 440 + Math.sin(s.t * 0.2) * driftAmount;

//       // Three detuned oscillators (fat sound)
//       // Water flow influences detune spread
//       const detuneSpread = 0.005 + waterFlow(s) * 0.01;
//       let output = 0;
//       const detune = [0, detuneSpread, -detuneSpread];
//       for (let i = 0; i < 3; i++) {
//         const freq = baseFreq * (1 + detune[i]);
//         s.state[i] = (s.state[i] || 0) + freq / s.sr;
//         s.state[i] %= 1.0;
//         output += Math.sin(s.state[i] * 2 * Math.PI);
//       }

//       // Envelope (8 second cycle)
//       s.state[10] = (s.state[10] || 0) + 0.125 / s.sr; // 0.125 Hz
//       s.state[10] %= 1.0;
//       const env = Math.sin(s.state[10] * Math.PI);

//       return output / 3 * env * 0.18;
//     },
//     // Filter cutoff modulated by spatial movement
//     signal => lowpass(signal, s => 1200 + spatialMovement(s) * 1800),
//     signal => gain(signal, 0.8)
//   )
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // 💨 ATOMOS (Air) - Discrete Processes (Granular/Trigger-Based)
// // ═══════════════════════════════════════════════════════════════════════════
// // Uses s.state with s.dt for discrete events

// // play('air-particles',
// //   s => {
// //     const TRIGGER_PHASE = 0;
// //     const RANDOM_FREQ = 1;
// //     const ENV_PHASE = 2;
// //     const PREV_TRIGGER = 3;
// //     const OSC_PHASE = 4;

// //     // Variable trigger rate (evolves over time)
// //     const rate = 8 + Math.sin(s.t * 0.3) * 4; // 4-12 Hz
// //     s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + rate / s.sr;
// //     s.state[TRIGGER_PHASE] %= 1.0;

// //     const trigger = s.state[TRIGGER_PHASE] < 0.01 ? 1 : 0; // Very short trigger window
// //     const prevTrigger = s.state[PREV_TRIGGER] || 0;

// //     // On trigger: set new random frequency and reset envelope
// //     if (trigger > prevTrigger) {
// //       s.state[ENV_PHASE] = 1.0;
// //       // Random pitch in pentatonic scale (A minor pentatonic)
// //       const scale = [440, 523, 587, 659, 783, 880]; // A4 to A5
// //       s.state[RANDOM_FREQ] = scale[Math.floor(Math.random() * scale.length)];
// //     }
// //     s.state[PREV_TRIGGER] = trigger;

// //     // Fast exponential decay
// //     s.state[ENV_PHASE] = (s.state[ENV_PHASE] || 0) * Math.exp(-25 * s.dt);
// //     const env = s.state[ENV_PHASE];

// //     // Sine grain
// //     const freq = s.state[RANDOM_FREQ] || 440;
// //     s.state[OSC_PHASE] = (s.state[OSC_PHASE] || 0) + freq / s.sr;
// //     s.state[OSC_PHASE] %= 1.0;

// //     return Math.sin(s.state[OSC_PHASE] * 2 * Math.PI) * env * 0.12;
// //   }
// // );

// // play('air-rhythm',
// //   s => {
// //     // Discrete rhythmic clicks (minimal percussion)
// //     const TRIGGER_PHASE = 0;
// //     const ENV_PHASE = 1;
// //     const PREV_TRIGGER = 2;
// //     const NOISE_PHASE = 3;

// //     // Syncopated rhythm (3.33 Hz = ~100 BPM in triplets)
// //     s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + 3.33 / s.sr;
// //     s.state[TRIGGER_PHASE] %= 1.0;

// //     const trigger = s.state[TRIGGER_PHASE] < 0.5 ? 1 : 0;
// //     const prevTrigger = s.state[PREV_TRIGGER] || 0;

// //     if (trigger > prevTrigger) {
// //       s.state[ENV_PHASE] = 1.0;
// //     }
// //     s.state[PREV_TRIGGER] = trigger;

// //     // Very fast decay (click sound)
// //     s.state[ENV_PHASE] = (s.state[ENV_PHASE] || 0) * Math.exp(-50 * s.dt);
// //     const env = s.state[ENV_PHASE];

// //     // High-frequency noise burst
// //     const noise = Math.random() * 2 - 1;

// //     return noise * env * 0.08;
// //   }
// // );

// // ═══════════════════════════════════════════════════════════════════════════
// // 💧 PHYSIS (Water) - Physics Simulation (Spring/Mass Systems)
// // ═══════════════════════════════════════════════════════════════════════════
// // Uses s.dt for differential equations

// play('water-spring',
//   pipe(
//     s => {
//       const POSITION = 110; // Use slot 110 so waterTension() can read it
//       const VELOCITY = 111;
//       const TRIGGER_PHASE = 112;
//       const PREV_TRIGGER = 113;

//       // Periodic excitation (0.5 Hz = one impulse every 2 seconds)
//       s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + 0.5 / s.sr;
//       s.state[TRIGGER_PHASE] %= 1.0;

//       const trigger = s.state[TRIGGER_PHASE] < 0.5 ? 1 : 0;
//       const prevTrigger = s.state[PREV_TRIGGER] || 0;

//       // Apply impulse to velocity (stronger when earth pulse is active)
//       const earthBoost = 1 + earthEnergy(s) * 3;
//       if (trigger > prevTrigger) {
//         s.state[VELOCITY] = (s.state[VELOCITY] || 0) + (8.0 * earthBoost);
//       }
//       s.state[PREV_TRIGGER] = trigger;

//       // Spring-mass-damper system
//       // F = -k*x - c*v (Hooke's law + damping)
//       // Spring constant modulated by spatial density (denser space = stiffer spring)
//       const springConstant = 150 + spatialDensity(s) * 100;
//       const damping = 0.5;         // Damping coefficient

//       const position = s.state[POSITION] || 0;
//       const velocity = s.state[VELOCITY] || 0;

//       const force = -springConstant * position - damping * velocity;

//       // Euler integration
//       const newVelocity = velocity + force * s.dt;
//       const newPosition = position + newVelocity * s.dt;

//       s.state[POSITION] = newPosition;
//       s.state[VELOCITY] = newVelocity;

//       // Convert position to audio (with saturation for warmth)
//       return Math.tanh(newPosition * 3) * 0.25;
//     },
//     signal => lowpass(signal, 1200),
//     signal => delay(signal, 1.0, 0.5) // Echo
//   )
// );

// play('water-ripple',
//   s => {
//     // Multiple coupled spring systems (ripple effect)
//     const numSprings = 3;
//     const POSITION_BASE = 0;
//     const VELOCITY_BASE = 120; // Use slot 120+ so waterFlow() can read them
//     const TRIGGER_PHASE = 130;
//     const PREV_TRIGGER = 131;

//     // Trigger rate modulated by earth pulse phase
//     const triggerRate = 1 + Math.sin(earthPulsePhase(s) * Math.PI * 2) * 0.3;
//     s.state[TRIGGER_PHASE] = (s.state[TRIGGER_PHASE] || 0) + triggerRate / s.sr;
//     s.state[TRIGGER_PHASE] %= 1.0;

//     const trigger = s.state[TRIGGER_PHASE] < 0.5 ? 1 : 0;
//     const prevTrigger = s.state[PREV_TRIGGER] || 0;

//     if (trigger > prevTrigger) {
//       // Excite first spring (influenced by spatial movement)
//       const excitation = 5.0 + spatialMovement(s) * 3.0;
//       s.state[VELOCITY_BASE] = (s.state[VELOCITY_BASE] || 0) + excitation;
//     }
//     s.state[PREV_TRIGGER] = trigger;

//     let output = 0;

//     // Update each spring (with coupling to neighbors)
//     for (let i = 0; i < numSprings; i++) {
//       const posSlot = POSITION_BASE + i;
//       const velSlot = VELOCITY_BASE + i;

//       const position = s.state[posSlot] || 0;
//       const velocity = s.state[velSlot] || 0;

//       // Spring force
//       const k = 100 - i * 20; // Each spring has different frequency
//       const c = 0.3;
//       let force = -k * position - c * velocity;

//       // Coupling force from neighbors
//       if (i > 0) {
//         const leftPos = s.state[POSITION_BASE + i - 1] || 0;
//         force += (leftPos - position) * 20; // Coupling strength
//       }
//       if (i < numSprings - 1) {
//         const rightPos = s.state[POSITION_BASE + i + 1] || 0;
//         force += (rightPos - position) * 20;
//       }

//       const newVelocity = velocity + force * s.dt;
//       const newPosition = position + newVelocity * s.dt;

//       s.state[posSlot] = newPosition;
//       s.state[velSlot] = newVelocity;

//       output += newPosition;
//     }

//     return Math.tanh(output * 2) * 0.2;
//   }
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // ✨ CHORA (Aither) - Spatial Synthesis (Position-Based Sound Fields)
// // ═══════════════════════════════════════════════════════════════════════════
// // Uses s.position for spatial awareness

// play('aither-field',
//   pipe(
//     s => {
//       const { x, y, z } = s.position;

//       // Three virtual sound sources at different positions
//       const sources = [
//         { pos: [0, 0, 0], freq: 440 },     // Center
//         { pos: [3, 0, 0], freq: 554 },     // Right
//         { pos: [-3, 0, 0], freq: 330 }     // Left
//       ];

//       let output = 0;

//       for (const source of sources) {
//         const [sx, sy, sz] = source.pos;

//         // Distance from listener to source
//         const dx = x - sx;
//         const dy = y - sy;
//         const dz = z - sz;
//         const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

//         // Amplitude falloff with distance (inverse square law)
//         const amplitude = 1 / (distance + 1);

//         // Time-varying frequency influenced by water tension
//         const freqMod = 1 + Math.sin(s.t * 0.3 + sx) * (0.02 + waterTension(s) * 0.03);
//         const freq = source.freq * freqMod;

//         output += Math.sin(2 * Math.PI * freq * s.t) * amplitude;
//       }

//       return output * 0.2;
//     },
//     signal => tremolo(signal, 0.2, 0.3), // Very slow modulation
//     signal => feedback(signal, 2.0, 0.8, 0.15) // Spatial reverb
//   )
// );

// play('aither-orbits',
//   s => {
//     const { x, y, z } = s.position;

//     // Rotating sound sources (orbiting the listener)
//     const numOrbiters = 4;
//     let output = 0;

//     for (let i = 0; i < numOrbiters; i++) {
//       // Orbit speed influenced by earth energy and water flow
//       // This calls the control signals to get their current values
//       const orbitSpeed = spatialMovement(s);
//       const angle = (s.t * orbitSpeed + i * Math.PI * 2 / numOrbiters) % (Math.PI * 2);

//       // Orbit radius pulsing with water tension
//       const radius = 2 + waterTension(s) * 1.5;

//       // Orbiter position
//       const ox = Math.cos(angle) * radius;
//       const oy = Math.sin(angle) * radius;
//       const oz = 0;

//       // Distance
//       const dx = x - ox;
//       const dy = y - oy;
//       const dz = z - oz;
//       const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

//       // Amplitude and frequency based on distance
//       const amplitude = 1 / (distance + 1);
//       const freq = 220 * (i + 1); // Different frequency per orbiter

//       output += Math.sin(2 * Math.PI * freq * s.t) * amplitude;
//     }

//     return output * 0.15;
//   }
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // 🌟 UNITY - Cross-Influenced Composite
// // ═══════════════════════════════════════════════════════════════════════════
// // This signal demonstrates all paradigms responding to the shared influence system

// play('elemental-unity',
//   pipe(
//     mix(
//       // 🔥 Kanon component - frequency modulated by all influences
//       s => {
//         const freqMod = 1 +
//           earthEnergy(s) * 0.05 +
//           waterTension(s) * 0.1 +
//           spatialDensity(s) * 0.08;
//         const freq = 165 * freqMod;
//         const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * (0.15 + waterFlow(s) * 0.1) * s.t);
//         return Math.sin(2 * Math.PI * freq * s.t) * am * 0.2;
//       },

//       // 🌍 Rhythmos component - phase rate modulated by spatial movement
//       s => {
//         const phaseMod = 1 + spatialMovement(s) * 0.3;
//         s.state[0] = (s.state[0] || 0) + (277 * phaseMod) / s.sr;
//         s.state[0] %= 1.0;
//         return Math.sin(s.state[0] * 2 * Math.PI) * 0.2;
//       },

//       // 💨 Atomos component - trigger rate responds to earth pulse
//       s => {
//         const triggerRate = 4 + earthPulsePhase(s) * 8;
//         s.state[1] = (s.state[1] || 0) + triggerRate / s.sr;
//         s.state[1] %= 1.0;
//         const trigger = s.state[1] < 0.01 ? 1 : 0;
//         const prevTrigger = s.state[2] || 0;
//         if (trigger > prevTrigger) s.state[3] = 1.0;
//         s.state[2] = trigger;
//         s.state[3] = (s.state[3] || 0) * Math.exp(-30 * s.dt);
//         return (Math.random() * 2 - 1) * s.state[3] * 0.15;
//       },

//       // 💧 Physis component - spring constant varies with spatial density
//       s => {
//         const k = 200 + spatialDensity(s) * 150;
//         const c = 0.2;
//         const pos = s.state[4] || 0;
//         const vel = s.state[5] || 0;
//         const triggerMod = 0.5 + earthEnergy(s) * 0.5;
//         s.state[6] = (s.state[6] || 0) + triggerMod / s.sr;
//         s.state[6] %= 1.0;
//         if (s.state[6] < 0.5 && (s.state[7] || 1) > 0.5) {
//           s.state[5] = 3.0 + waterFlow(s) * 2.0;
//         }
//         s.state[7] = s.state[6];
//         const force = -k * pos - c * vel;
//         const newVel = vel + force * s.dt;
//         const newPos = pos + newVel * s.dt;
//         s.state[4] = newPos;
//         s.state[5] = newVel;
//         return Math.tanh(newPos * 2) * 0.2;
//       },

//       // ✨ Chora component - frequency varies with water tension
//       s => {
//         const { x, y, z } = s.position;
//         const d = Math.sqrt(x*x + y*y + z*z);
//         const amp = 1 / (d + 1);
//         const freq = 220 * (1 + waterTension(s) * 0.5);
//         return Math.sin(2 * Math.PI * freq * s.t) * amp * 0.2;
//       }
//     ),
//     // Filter cutoff responds to combined influences
//     signal => lowpass(signal, s =>
//       1000 +
//       spatialMovement(s) * 1500 +
//       waterFlow(s) * 800
//     ),
//     signal => feedback(signal, 3.0, 1.2, 0.25),
//     signal => gain(signal, 0.6)
//   )
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // Initialize spatial position (you can change this in the REPL!)
// // ═══════════════════════════════════════════════════════════════════════════

// setPosition({ x: 0, y: 0, z: 0 });

console.log('');
console.log('🎼 CONTROL SIGNALS (Pure Functions):');
console.log('   • earthEnergy(s)      → Pulse envelope from earth rhythm');
console.log('   • earthPulsePhase(s)  → Normalized phase 0-1');
console.log('   • waterTension(s)     → Spring displacement magnitude');
console.log('   • waterFlow(s)        → Ripple velocity magnitude');
console.log('   • spatialDensity(s)   → Field source amplitude sum');
console.log('   • spatialMovement(s)  → Orbital speed');
console.log('');
console.log('🌍 RHYTHMOS (Earth) - Active Signals:');
console.log('   • earth-pulse  → Generates earthEnergy(s) and earthPulsePhase(s)');
console.log('   • earth-lead   → Calls spatialDensity(s), waterFlow(s)');
console.log('');
console.log('💧 PHYSIS (Water) - Active Signals:');
console.log('   • water-spring → Calls earthEnergy(s), spatialDensity(s)');
console.log('   • water-ripple → Calls earthPulsePhase(s), spatialMovement(s)');
console.log('');
console.log('✨ CHORA (Aither) - Active Signals:');
console.log('   • aither-field  → Calls waterTension(s)');
console.log('   • aither-orbits → Calls spatialMovement(s), waterTension(s)');
console.log('');
console.log('🌟 UNITY - Cross-Influenced Composite:');
console.log('   • elemental-unity → Calls ALL control signals');
console.log('');
console.log('💡 KEY INSIGHT:');
console.log('   Control signals are just f(s) → value, like audio signals!');
console.log('   No global state, no buses - just pure function composition.');
console.log('   Each paradigm can call any control signal to read its value.');
console.log('');
console.log('Try: setPosition({ x: 2, y: 1, z: 0 }) to change spatial field');
console.log('');
console.log('═══════════════════════════════════════════════════');
