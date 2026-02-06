// kanon.js - The Kanon Engine Registry (Phase-Continuous Signal Management)
// ============================================================================
// "The Monochord" - Pythagorean Signal Surgery for Living Sound
// ============================================================================

import { STRIDE } from './storage.js';

// ============================================================================
// State Memory (Survives hot-reloads)
// ============================================================================

// Persistent Float64Array for "Scientific Grade" phase precision
globalThis.KANON_STATE ??= new Float64Array(1024);
const stateMemory = globalThis.KANON_STATE;

// Signal registry (Map survives across hot-reloads in globalThis)
globalThis.KANON_REGISTRY ??= new Map();
const registry = globalThis.KANON_REGISTRY;

// ============================================================================
// Core API
// ============================================================================

/**
 * Register a signal for live surgery
 * @param {string} id - Unique identifier for this signal
 * @param {Function} factory - (state, idx) => { update: (sr) => [samples...] }
 * @returns {Object} - Signal object with update method
 */
export function kanon(id, factory) {
  // Simple hash for persistent index (deterministic across reloads)
  const idx = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 512;

  // Create the closure logic
  const signal = factory(stateMemory, idx);

  // Register/Overwrite (The Surgery)
  registry.set(id, signal);

  return signal;
}

/**
 * Mix all registered signals and apply soft clipping
 * @param {number} sampleRate - Sample rate (e.g., 48000)
 * @returns {Array<number>} - Mixed vector [ch0, ch1, ...] clipped with tanh
 */
export function updateAll(sampleRate) {
  const mixedVector = new Float64Array(STRIDE);

  // Mix all signals
  let signalCount = 0;
  for (const signal of registry.values()) {
    const vector = signal.update(sampleRate);
    for (let i = 0; i < STRIDE; i++) {
      mixedVector[i] += vector[i] || 0;
    }
    signalCount++;
  }

  // Soft-clip every channel for safety and warmth
  for (let i = 0; i < STRIDE; i++) {
    mixedVector[i] = Math.tanh(mixedVector[i]);
  }

  return Array.from(mixedVector);
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
  registry.clear();
}
