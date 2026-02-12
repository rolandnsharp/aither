// Welcome to your live-coding session in LEL!
// This file is watched by `bun --hot`. When you save, the whole
// engine reloads, and this file is re-run.

import { register, clear } from './index.js';

// --- HMR Cleanup ---
// This is the key to the `aether` hot-reload pattern.
// By calling clear() here (with `fullReset=false`), we remove all
// functions from the registry but PRESERVE the state memory and offsets.
// This ensures phase-continuity on reload.
clear();

// --- Example 1: Simple Sine Wave with Performant State ---
// Try changing the frequency (e.g., to 220) and saving the file. The tone
// should change instantly and smoothly without layering.
register('sine-440', s => {
  // `s.state[0]` is our persistent phase value.
  // s.state[0] = (s.state[0] + 222 / s.sr) % 1.0;
  return Math.sin(666 * Math.PI * s.t) * 0.5;
});
