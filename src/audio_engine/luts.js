// src/audio_engine/luts.js
// ============================================================================
// Fast Lookup Tables (LUTs) for performant audio synthesis.
// ============================================================================

const SINE_TABLE_SIZE = 8192;

// --- Sine Wave Lookup Table ---
// Pre-calculate one full cycle of a sine wave.
// Accessing this array is significantly faster than calling `Math.sin()`.
const SINE_TABLE = new Float64Array(SINE_TABLE_SIZE);
for (let i = 0; i < SINE_TABLE_SIZE; i++) {
  SINE_TABLE[i] = Math.sin((i / SINE_TABLE_SIZE) * 2 * Math.PI);
}

/**
 * A fast sine function that uses the lookup table.
 * It takes a phase (0.0 to 1.0) and finds the corresponding value in the table.
 * Linear interpolation is used for values that fall between table indices.
 * 
 * @param {number} phase - The phase of the wave, from 0.0 to 1.0.
 * @returns {number} The sine value.
 */
function lookupSin(phase) {
  const position = phase * SINE_TABLE_SIZE;
  const index = Math.floor(position);
  const fraction = position - index;

  const a = SINE_TABLE[index % SINE_TABLE_SIZE];
  const b = SINE_TABLE[(index + 1) % SINE_TABLE_SIZE];

  // Linear interpolation for improved accuracy
  return a + (b - a) * fraction;
}

/**
 * A fast cosine function that uses the same sine lookup table with a phase offset.
 * cos(x) = sin(x + PI/2)
 * 
 * @param {number} phase - The phase of the wave, from 0.0 to 1.0.
 * @returns {number} The cosine value.
 */
function lookupCos(phase) {
  // A phase offset of 0.25 (PI/2) gives us a cosine wave.
  return lookupSin((phase + 0.25) % 1.0);
}


module.exports = {
  SINE_TABLE,
  lookupSin,
  lookupCos
};
