// signal.js - KANON Live-Coding Interface with Compositional API
// ============================================================================
// LIVE CODING: Edit this file while audio is playing for instant updates!
// ============================================================================
// 2026 Modern API: State-driven, not time-driven
// The () => arrow function is REQUIRED for lazy evaluation and hot-reload
// ============================================================================

// ============================================================================
// TIER 1: The Musician (Implicit, High-Level Sugar)
// ============================================================================
// Code reduction: 40+ lines → 1 line (98% reduction!)

// Arrow function for deterministic slot allocation
kanon('minimal-drone', () =>
  withLfo(mixGain(voices(343, 1, 3), 1.0), 0.8, 0.85)
);

// ============================================================================
// MULTIPLE WAVES DEMO - Each wave needs a UNIQUE label to play together!
// ============================================================================

// Wave 1: Low bass drone
// kanon('bass', () =>
//   withLfo(mixGain(voices(330, 2, 4), 0.3), 0.3, 0.25)
// );

// Wave 2: Mid drone (plays AT THE SAME TIME as bass)
kanon('mid', () =>
  withLfo(mixGain(voices(220, 3, 4), 0.25), 0.5, 0.20)
);

// Wave 3: High lead (ready to become looper later)
// kanon('lead', () =>
//   mul(osc(440), 0.15)
// );

// ============================================================================
// ALTERNATIVE STYLES
// ============================================================================

// Method chaining style (more readable for complex chains)
// kanon('chaining-drone', () =>
//   $(mix(...voices(375, 2, 4)))
//     .mod(0.3, 0.25)
//     .mul(0.4)
//     .unwrap()
// );

// Explicit style (good for understanding the flow)
// kanon('explicit-drone', () => {
//   const v = voices(375, 2, 4);
//   const mixed = mix(...v);
//   const modulated = withLfo(mixed, 0.3, 0.25);
//   return mul(modulated, 0.4);
// });

// ============================================================================
// TIER 2: The Sound Designer (Mix of sugar + manual peek/poke)
// ============================================================================
// Use slots 0-99 for custom state, auto-slots start at 100+

// kanon('drifting-drone', () => {
//   // Auto-slot oscillator
//   const carrier = mul(osc(440), 0.5);
//
//   // Manual state for drift (slot 0)
//   const driftVal = peek(globalThis.STATE, 0);
//   const lfoVal = mul(lfo(0.5), 0.1);
//   const newDrift = mod(add(driftVal, lfoVal), 10);
//   poke(globalThis.STATE, newDrift, 0);
//
//   return carrier;
// });

// ============================================================================
// TIER 3: The Researcher (Raw peek/poke for experimental DSP)
// ============================================================================
// Full manual control - patterns impossible with standard oscillators

// Feedback chaos (non-linear feedback loop)
// kanon('feedback-chaos', () => {
//   const last = peek(globalThis.STATE, 0);
//   const next = sin(add(last, mul(last, 0.5)));
//   poke(globalThis.STATE, next, 0);
//   return mul(next, 0.3);
// });
