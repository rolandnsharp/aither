#!/usr/bin/env bun
// index.js - Main Entry Point for Kanon Engine
// ============================================================================
// Run with: bun --hot index.js
// ============================================================================

import { start, stop, status } from './src/engine.js';

// Load signal definitions (live-codeable)
import './signals.js';

// ============================================================================
// Initialize
// ============================================================================

console.log('='.repeat(60));
console.log('KANON - Live Sound Surgery Engine');
console.log('Pythagorean Monochord: Bun + Closures + SharedArrayBuffer');
console.log('='.repeat(60));
console.log('');
console.log('CONTROLS:');
console.log('  Edit signals.js and save for instant hot-reload');
console.log('  Press Ctrl+C to stop');
console.log('');

// Start the engine
start();

// Log status after 1 second
setTimeout(() => {
  const s = status();
  console.log('');
  console.log('ENGINE STATUS:');
  console.log(`  Sample Rate: ${s.sampleRate}Hz`);
  console.log(`  Channels: ${s.stride} (Mono)`);
  console.log(`  Buffer: ${s.bufferFill}/${s.bufferSize} frames`);
  console.log('');
  console.log('\u001b[32m\u2713 Ready for live surgery!\u001b[0m');
  console.log('');
}, 1000);

// Keep process alive
setInterval(() => {
  // Heartbeat (optional: could log buffer health here)
}, 5000);
