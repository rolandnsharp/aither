// src/arche/kanon/index.js - The Kanon Paradigm (Abstract Ideal)
// ============================================================================
// "The Abstract Ideal" - Fire 🔥
// ============================================================================
// This paradigm implements a pure function of time f(t), with NO explicit state.
// It is subject to discontinuities (clicks) on hot-reload.
// ============================================================================

// NOTE: This module does NOT manage state or a local registry.
// Its purpose is solely to register a pure f(t) function with the central engine.

// import { registry } from '../../engine.js';

// /**
//  * Register a Kanon signal (abstract ideal, pure function of time).
//  * @param {string} id - Unique identifier for this signal.
//  * @param {Function} ft_function - (t) => [samples...] - A pure function of time.
//  * @returns {Object} - A representation of the registered Kanon function.
//  */
// export function kanon(id, ft_function) {
//   // Register the function with a type tag
//   registry.set(id, { type: 'kanon', func: ft_function });

//   return { id, type: 'kanon' }; // Return a minimal object for consistency
// }

