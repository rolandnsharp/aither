#!/usr/bin/env bun
// kanon-client.js - Client for the Kanon Server
// ============================================================================
// Provides a unified interface for sending files or starting a REPL.
// ============================================================================

import dgram from 'dgram';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const PORT = 41234;
const HOST = '127.0.0.1';

// --- Client Logic ---
const client = dgram.createSocket('udp4');

function sendCode(code, callback) {
  client.send(Buffer.from(code), PORT, HOST, (err) => {
    if (callback) callback(err);
    else if (err) console.error('Error:', err);
    client.close();
  });
}

function sendFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }
  let code = fs.readFileSync(absolutePath, 'utf-8');
  code = code.replace(/import.*from '.*';/g, '');
  
  // Prepend clear() for whole-file sends
  const finalCode = `clear();
${code}`;
  
  console.log(`Sending ${filePath}...`);
  sendCode(finalCode, (err) => {
    if (err) console.error(`Error sending ${filePath}:`, err);
    else console.log('Sent successfully.');
  });
}

function startRepl() {
  console.log('Connecting to Kanon server... (Ctrl+C to exit)');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'kanon> '
  });

  rl.prompt();

  rl.on('line', (line) => {
    if (line.trim()) {
      // Don't prepend clear() in REPL mode
      sendCode(line.trim(), (err) => {
        if (err) console.error('Error sending command:', err);
        rl.prompt();
      });
    } else {
      rl.prompt();
    }
  }).on('close', () => {
    console.log('Exiting REPL.');
    client.close();
    process.exit(0);
  });
}

// --- Main CLI Parsing ---
const args = process.argv.slice(2);
const command = args[0];

if (command === 'send') {
  const file = args[1];
  if (!file) {
    console.error('Usage: kanon-client send <file>');
    process.exit(1);
  }
  sendFile(file);
} else if (command === 'repl') {
  startRepl();
} else {
  console.log('Usage:');
  console.log('  kanon-client send <file>  - Send a session file to the server.');
  console.log('  kanon-client repl         - Start an interactive REPL.');
  process.exit(1);
}
