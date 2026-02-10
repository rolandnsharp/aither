// src/arche/rhythmos/index.js - The Rhythmos Paradigm (Explicit State)
// ============================================================================
// "The Measured Form" - Earth 🌍
// ============================================================================

import { SAMPLE_RATE } from '../../engine.js';
import { stateMemory, registry } from '../../aether.js';
import * as helpers from './helpers.js';

// ============================================================================
// Core Registration Function
// ============================================================================

/**
 * Register a Rhythmos signal (explicit state, sample-rate dependent).
 * @param {string} id - Unique identifier for this signal.
 * @param {Function} factory - (state, idx, sampleRate) => { update: () => [samples...] }
 * @returns {Object} - The signal object.
 */
function register(id, factory) {
  // Simple hash for persistent index (deterministic across reloads)
  const idx = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 512;

  // Create the closure logic using the explicit state factory
  const signal = factory(stateMemory, idx, SAMPLE_RATE);

  // Register the signal directly (paradigm-agnostic)
  // NOTE: For debugging, you could wrap with type info: { type: 'rhythmos', signal }
  // but then the mixer would need to unwrap: entry.signal || entry
  registry.set(id, signal);
  console.log(`[RHYTHMOS] Registered signal: "${id}" at idx=${idx}`);

  return signal;
}

// ============================================================================
// Rhythmos Namespace Export
// ============================================================================

export const Rhythmos = {
  register,
  ...helpers  // Re-export all helper functions
};
