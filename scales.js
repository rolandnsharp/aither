// ============================================================================
// SCALE DEFINITIONS
// ============================================================================

module.exports = {
  // Equal temperament scales (semitone offsets from root)
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],  // Natural minor
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],
  pentatonic: [0, 2, 4, 7, 9, 12],
  blues: [0, 3, 5, 6, 7, 10, 12],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

  // Just intonation scales (frequency ratios)
  justMajor: [1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2/1],
  harmonic: [1/1, 9/8, 5/4, 11/8, 3/2, 13/8, 7/4, 2/1]
};
