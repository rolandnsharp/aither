// src/audio_engine/player.js
// ============================================================================
// Player Class - Wraps a recipe and manages its playback state.
// Now passes LUT functions to JIT-compiled update functions.
// ============================================================================

const { ringBuffer } = require('./storage.js');
const { lookupSin, lookupCos } = require('./luts.js'); // Import LUT functions
const STRIDE = ringBuffer.stride;

class Player {
  constructor(updateFn, isStateful = false, originalRecipe = null, baseStateIndex = -1) {
    if (typeof updateFn !== 'function') {
      throw new Error('Player update function must be a function.');
    }
    this.updateFn = updateFn;
    this.isStateful = isStateful;
    this.recipe = originalRecipe || updateFn;
    this.baseStateIndex = baseStateIndex;

    this.crossfadeVolume = 1.0;
    this.fadeStartTime = -1;
    this.targetVolume = 1.0;
  }

  /**
   * Called by the Conductor for each sample. Always returns a vector of STRIDE length.
   * @param {number} t - The current global time from the CHRONOS clock.
   * @returns {Array<number>} A vector of samples (e.g., `[L, R]` for stereo).
   */
  update(t) {
    let output;
    if (this.isStateful) {
      // --- Pass LUTs to JIT-compiled function ---
      // The JIT-compiled function is expecting these as its final arguments.
      output = this.updateFn(
        globalThis.STATE_ARRAY, 
        this.baseStateIndex, 
        globalThis.dt,
        lookupSin,
        lookupCos
      );
    } else {
      // Pure f(t) recipes don't use the JIT, so no change here.
      output = this.updateFn(t);
    }

    const finalFrame = new Array(STRIDE);

    if (typeof output === 'number') {
      const sample = output * this.crossfadeVolume;
      for (let i = 0; i < STRIDE; i++) {
        finalFrame[i] = sample;
      }
    } else if (Array.isArray(output) && output.length === STRIDE) {
      for (let i = 0; i < STRIDE; i++) {
        finalFrame[i] = (output[i] || 0) * this.crossfadeVolume;
      }
    } else {
      for (let i = 0; i < STRIDE; i++) {
        finalFrame[i] = 0;
      }
    }
    
    return finalFrame;
  }

  setCrossfadeVolume(volume) {
    this.crossfadeVolume = Math.max(0, Math.min(1, volume));
  }
}

module.exports = { Player };
