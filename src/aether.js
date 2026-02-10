// aether.js - The Aether Engine Registry (Multi-Paradigm Signal Management)
// ============================================================================
// "The Five Elements" - Unified registry for all synthesis paradigms
// ============================================================================

import { STRIDE } from './storage.js';
import { SAMPLE_RATE } from './engine.js'; // Import SAMPLE_RATE

// ============================================================================
// State Memory (Survives hot-reloads)
// ============================================================================

// Persistent Float64Array for "Scientific Grade" phase precision
globalThis.AETHER_STATE ??= new Float64Array(1024);
export const stateMemory = globalThis.AETHER_STATE;

// Signal registry (Map survives across hot-reloads in globalThis)
globalThis.AETHER_REGISTRY ??= new Map();
export const registry = globalThis.AETHER_REGISTRY;

// GC OPTIMIZATION: Reusable vector to avoid allocations in the hot path
const reusableVector = new Float64Array(STRIDE);

// ============================================================================
// Core API - Paradigm-Agnostic Mixer
// ============================================================================
// NOTE: Signal registration is now paradigm-specific:
//   - Rhythmos.register() for f(state, sr) - Earth 🌍
//   - Kanon.register() for f(t) - Fire 🔥
//   - Atomos.register() for f(state, dt) - Air 💨
//   - Physis.register() for flow(state) - Water 💧
//   - Chora.register() for field(state) - Aether ✨
//
// This registry is paradigm-agnostic - it just calls update(context) on all signals.
// ============================================================================

/**
 * Mix all registered signals and apply soft clipping
 * @param {number} sampleRate - Sample rate (e.g., 48000)
 * @returns {Array<number>} - Mixed vector [ch0, ch1, ...] clipped with tanh
 */
// Debug counter for periodic logging
let updateCounter = 0;

// Track time for paradigms that need it (Kanon, etc.)
let currentTime = 0;

export function updateAll(sampleRate) {
  // Reset the reusable vector
  reusableVector.fill(0);

  // Prepare context for all paradigms
  const dt = 1 / sampleRate;
  const context = {
    t: currentTime,
    dt,
    sampleRate
  };

  // Mix all signals (paradigm-agnostic)
  for (const signal of registry.values()) {
    const vector = signal.update(context);
    for (let i = 0; i < STRIDE; i++) {
      reusableVector[i] += vector[i] || 0;
    }
  }

  // Soft-clip every channel for safety and warmth
  for (let i = 0; i < STRIDE; i++) {
    reusableVector[i] = Math.tanh(reusableVector[i]);
  }

  // Advance time
  currentTime += dt;

  // Debug: Log occasionally to verify audio is flowing
  if (++updateCounter % 48000 === 0) {
    console.log(`[AETHER] Audio flowing: L=${reusableVector[0].toFixed(3)}, R=${reusableVector[1]?.toFixed(3)}, signals=${registry.size}`);
  }

  return reusableVector;
}

/**
 * Remove a signal from the registry
 * @param {string} id - Signal identifier
 */
export function remove(id) {
  registry.delete(id);
}

/**
 * List all registered signal IDs
 * @returns {Array<string>} - Array of signal IDs
 */
export function list() {
  return Array.from(registry.keys());
}

/**
 * Clear all signals
 */
export function clear() {
  console.log(`[KANON] Clearing ${registry.size} signals`);
  registry.clear();
}
