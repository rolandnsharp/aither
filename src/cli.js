#!/usr/bin/env bun
// Aether CLI - Main entry point

const [, , command, ...args] = process.argv;

const commands = {
  start: './server.js',
  repl: './repl.js',
  send: './send-repl.js',
};

function showHelp() {
  console.log(`
Aether - Live Coding Audio Synthesis Engine

Usage:
  aether start              Start the audio server
  aether repl               Open interactive REPL client
  aether send <code>        Send code to running server
  aether help               Show this help

Examples:
  aether start              # Start the server
  aether repl               # Connect and live code
  aether send "play('test', s => Math.sin(s.t * 440 * Math.PI * 2))"
`);
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'aether help' for usage.`);
  process.exit(1);
}

// Dynamic import and run the command
const modulePath = new URL(commands[command], import.meta.url);
import(modulePath.href);
