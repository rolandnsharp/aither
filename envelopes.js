// ============================================================================
// ENVELOPE HELPERS
// ============================================================================

const env = {
  // Exponential decay
  // phase: 0 to 1, rate: decay speed (higher = faster decay)
  exp: (phase, rate = 5) => {
    return Math.exp(-rate * phase);
  },

  // Linear ramp
  // phase: 0 to 1, start/end: amplitude values
  ramp: (phase, start = 0, end = 1) => {
    return start + (end - start) * phase;
  },

  // ADSR envelope
  // phase: 0 to 1 (note progress)
  // duration: total note duration in seconds
  // attack, decay, release: time in seconds
  // sustain: level 0-1
  adsr: (phase, duration, attack, decay, sustain, release) => {
    const t = phase * duration;

    if (t < attack) {
      // Attack phase
      return t / attack;
    } else if (t < attack + decay) {
      // Decay phase
      return 1 - (1 - sustain) * ((t - attack) / decay);
    } else if (t < duration - release) {
      // Sustain phase
      return sustain;
    } else {
      // Release phase
      return sustain * (1 - (t - (duration - release)) / release);
    }
  }
};

module.exports = { env };
