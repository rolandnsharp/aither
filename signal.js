// signal.js - KANON Live-Coding Interface
// ============================================================================
// LIVE CODING: Edit this file while audio is playing for instant updates!
// ============================================================================

wave('hybrid-drone', (t) => {
  // === LIVE EDIT THESE PARAMETERS ===
  const baseFreq = 373;   // Try: 110, 220, 330, 440
  const detune = 2;       // Try: 0.5, 2, 5, 10, 20 (chorus width)
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

  // === LFO (STATE slot 10) ===
  const lfoPhase = peek(globalThis.STATE, 10, { mode: 'samples' });
  const newLfoPhase = mod(add(lfoPhase, lfoRate / 44100), 1.0);
  poke(globalThis.STATE, newLfoPhase, 10);
  const lfo = peek(globalThis.SINE_TABLE, newLfoPhase);

  // LFO range: 0.5 to 1.0 (pulsing, never silent)
  const lfoAmt = add(mul(lfo, 0.25), 0.75);

  // Apply LFO and output gain
  return mul(mul(mix, lfoAmt), 0.4);
});

// ============================================================================
// Genish-compiled drone with 20ms equal-power crossfade
// ============================================================================
