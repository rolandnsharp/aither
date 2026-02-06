// math-helpers.js - Functional Vector Math
// ============================================================================
// Dimension-agnostic math operations for N-channel signals
// ============================================================================

/**
 * Add two vectors element-wise
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {Array<number>}
 */
export const add = (vecA, vecB) => vecA.map((val, i) => val + (vecB[i] || 0));

/**
 * Multiply vector by scalar
 * @param {Array<number>} vec
 * @param {number} scalar
 * @returns {Array<number>}
 */
export const mul = (vec, scalar) => vec.map(val => val * scalar);

/**
 * Linear interpolation between two vectors
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @param {number} t - Blend factor (0 = all A, 1 = all B)
 * @returns {Array<number>}
 */
export const lerp = (vecA, vecB, t) =>
  vecA.map((val, i) => val + t * ((vecB[i] || 0) - val));

/**
 * Mix (average) multiple vectors
 * @param {...Array<number>} vectors
 * @returns {Array<number>}
 */
export const mix = (...vectors) => {
  if (vectors.length === 0) return [0];
  if (vectors.length === 1) return vectors[0];

  const length = Math.max(...vectors.map(v => v.length));
  const result = new Array(length).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < vec.length; i++) {
      result[i] += vec[i] || 0;
    }
  }

  return result.map(val => val / vectors.length);
};

/**
 * Clamp vector elements to range
 * @param {Array<number>} vec
 * @param {number} min
 * @param {number} max
 * @returns {Array<number>}
 */
export const clamp = (vec, min, max) =>
  vec.map(val => Math.max(min, Math.min(max, val)));

/**
 * Apply soft saturation (tanh) to vector
 * @param {Array<number>} vec
 * @returns {Array<number>}
 */
export const saturate = (vec) => vec.map(val => Math.tanh(val));
