// ============================================================================
// MELODY HELPERS
// ============================================================================

// freq(base, scale, degree) - convert scale degree to frequency
// Handles both equal temperament (semitone arrays) and just intonation (ratio arrays)
function freq(base, scale, degree) {
  if (typeof scale[0] === 'number' && scale[0] < 13) {
    // Equal temperament (semitone array like [0, 2, 4, 5, 7, 9, 11, 12])
    const octave = Math.floor(degree / scale.length);
    const index = degree % scale.length;
    const semitones = scale[index];
    return base * Math.pow(2, (semitones + octave * 12) / 12);
  } else {
    // Just intonation (ratio array like [1/1, 9/8, 5/4, ...])
    const octave = Math.floor(degree / scale.length);
    const index = degree % scale.length;
    return base * scale[index] * Math.pow(2, octave);
  }
}

// mtof(midi) - MIDI note number to frequency
function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ftom(freq) - frequency to MIDI note number
function ftom(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

module.exports = { freq, mtof, ftom };
