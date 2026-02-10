#!/usr/bin/env bun
// index.js - Main Kanon Server
// ============================================================================
// Starts the audio engine, loads a session file, and listens for REPL commands.
// Usage:
//   kanon              - Starts server with live-session.js
//   kanon <other.js>   - Starts server with a specific session file
// ============================================================================

import { start } from './engine.js';
import { kanon, clear, list, remove } from './kanon.js';
import { pipe, sin, saw, tri, square, lfo, gain, pan, stereo, mix, am, softClip, feedback } from './helpers.js';
import dgram from 'dgram';
import { resolve } from 'path';

// --- Configuration ---
const PORT = 41234;
const HOST = '127.0.0.1';

// --- Main Execution ---
async function main() {
  // Determine which session file to load
  const sessionFile = process.argv[2] || 'live-session.js';
  const sessionPath = resolve(process.cwd(), sessionFile);

  console.log('='.repeat(60));
  console.log('KANON - Live Coding Server');
  console.log('='.repeat(60));
  console.log(`Session File: ${sessionFile}`);

  // 1. Start the audio engine
  start();

  // 2. Load the initial session file
  try {
    console.log(`Loading initial session from ${sessionFile}...`);
    // Bust cache to ensure we get the latest version
    await import(`${sessionPath}?v=${Date.now()}`);
  } catch (err) {
    console.error(`Error loading session file: ${err.message}`);
    // Continue running so the REPL is available
  }
  
  // 3. Start the REPL server
  const server = dgram.createSocket('udp4');
  server.on('listening', () => {
    console.log(`REPL Ready. Listening on ${HOST}:${PORT}`);
    console.log('Use `kanon-send` or `kanon-repl` to send commands.');
  });
  server.on('message', (msg) => {
    const code = msg.toString();
    console.log(`[REPL] Received ${msg.length} bytes. Evaluating...`);
    try {
      eval(code);
      console.log('[REPL] Evaluation successful.');
    } catch (e) {
      console.error('[REPL] Evaluation error:', e.message);
    }
  });
  server.bind(PORT, HOST);
}

main();
