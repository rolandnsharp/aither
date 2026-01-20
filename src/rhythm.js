// ============================================================================
// RHYTHM HELPERS
// ============================================================================

// step(t, bpm, subdivision) - returns beat/phase info
// subdivision: 4 = quarter notes, 8 = eighth notes, 16 = sixteenth notes, etc.
function step(t, bpm, subdivision) {
  const stepsPerBeat = subdivision / 4;
  const stepDuration = 60 / (bpm * stepsPerBeat);
  const totalSteps = Math.floor(t / stepDuration);

  return {
    beat: Math.floor(totalSteps / stepsPerBeat),
    index: totalSteps,
    phase: (t / stepDuration) % 1
  };
}

// euclidean(k, n) - generate euclidean rhythm
// k = number of pulses, n = total steps
// Returns array of 1s and 0s
function euclidean(k, n) {
  const pattern = [];
  for (let i = 0; i < n; i++) {
    const bucket = Math.floor(i * k / n);
    const nextBucket = Math.floor((i + 1) * k / n);
    pattern.push(bucket !== nextBucket ? 1 : 0);
  }
  return pattern;
}

module.exports = { step, euclidean };
