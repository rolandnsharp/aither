#!/usr/bin/env bun
// repl.js - Interactive REPL client for the Aether audio engine.
// Usage: aether repl

import dgram from 'dgram';
import readline from 'readline';

const REPL_PORT = 41234;
const REPL_HOST = '127.0.0.1';

// Create UDP client
const client = dgram.createSocket('udp4');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'aether> '
});

// Banner
console.log('\n╔═══════════════════════════════════════════╗');
console.log('║      Aether Live REPL - Interactive      ║');
console.log('╚═══════════════════════════════════════════╝\n');
console.log(`Sending to: ${REPL_HOST}:${REPL_PORT}`);
console.log('Type JavaScript code to send to the audio engine.');
console.log('Commands:');
console.log('  .help       - Show this help');
console.log('  .exit       - Exit the REPL');
console.log('  .multiline  - Enter multiline mode (end with .send)');
console.log('  .clear      - Clear the screen');
console.log('  .info       - Show available functions\n');

// Track multiline mode
let multilineMode = false;
let multilineBuffer = [];

// Show available functions
function showInfo() {
  console.log('\nAvailable functions in the engine:');
  console.log('  register(name, fn)     - Register a signal');
  console.log('  unregister(name)       - Unregister a signal');
  console.log('  clear()                - Clear all signals');
  console.log('  setPosition(x, y, z)   - Set listener position');
  console.log('\nAvailable helpers:');
  console.log('  pipe(signal, ...fns)   - Compose signal functions');
  console.log('  lowpass(signal, cutoff)- One-pole lowpass filter');
  console.log('  tremolo(signal, rate, depth) - Amplitude modulation');
  console.log('  delay(signal, maxTime, time) - Delay effect');
  console.log('  gain(signal, amount)   - Gain control');
  console.log('  pan(signal, position)  - Stereo panning');
  console.log('\nExample:');
  console.log('  register("sine", s => Math.sin(2 * Math.PI * 440 * s.t) * 0.3)');
  console.log('  unregister("sine")');
  console.log('');
}

// Send code to the engine
function sendCode(code) {
  if (!code.trim()) return;

  client.send(Buffer.from(code), REPL_PORT, REPL_HOST, (err) => {
    if (err) {
      console.error(`✗ Error sending code: ${err.message}`);
    } else {
      console.log('✓ Sent to engine');
    }
    rl.prompt();
  });
}

// Handle line input
rl.on('line', (line) => {
  const trimmed = line.trim();

  // Check for commands
  if (trimmed === '.help') {
    console.log('\nCommands:');
    console.log('  .help       - Show this help');
    console.log('  .exit       - Exit the REPL');
    console.log('  .multiline  - Enter multiline mode (end with .send)');
    console.log('  .clear      - Clear the screen');
    console.log('  .info       - Show available functions\n');
    rl.prompt();
    return;
  }

  if (trimmed === '.exit') {
    console.log('Goodbye!');
    client.close();
    process.exit(0);
  }

  if (trimmed === '.clear') {
    console.clear();
    rl.prompt();
    return;
  }

  if (trimmed === '.info') {
    showInfo();
    rl.prompt();
    return;
  }

  if (trimmed === '.multiline') {
    multilineMode = true;
    multilineBuffer = [];
    console.log('Entering multiline mode. Type .send when done, .cancel to abort.');
    rl.setPrompt('...     ');
    rl.prompt();
    return;
  }

  // Handle multiline mode
  if (multilineMode) {
    if (trimmed === '.send') {
      multilineMode = false;
      const code = multilineBuffer.join('\n');
      multilineBuffer = [];
      rl.setPrompt('aether> ');
      sendCode(code);
      return;
    }

    if (trimmed === '.cancel') {
      multilineMode = false;
      multilineBuffer = [];
      console.log('Multiline input cancelled.');
      rl.setPrompt('aether> ');
      rl.prompt();
      return;
    }

    multilineBuffer.push(line);
    rl.prompt();
    return;
  }

  // Send single line
  sendCode(line);
});

// Handle CTRL+C
rl.on('SIGINT', () => {
  if (multilineMode) {
    console.log('\n(Use .cancel to exit multiline mode)');
    rl.prompt();
  } else {
    console.log('\nUse .exit to quit, or CTRL+C again to force quit.');
    setTimeout(() => {
      rl.prompt();
    }, 100);
  }
});

// Handle close
rl.on('close', () => {
  console.log('\nGoodbye!');
  client.close();
  process.exit(0);
});

// Handle errors
client.on('error', (err) => {
  console.error(`\n✗ UDP Client error: ${err.message}`);
  console.error('Is the Aether server running? (aether start)');
});

// Start the REPL
rl.prompt();
