#!/usr/bin/env node

// ============================================================================
// SIGNAL LIVE CODING RUNNER
// ============================================================================
// Watches a session file and hot-reloads it on changes
// Usage: signal <session-file.js>

const fs = require('fs');
const path = require('path');
const signal = require('./index');

// Get session file from command line
const sessionFile = process.argv[2];

if (!sessionFile) {
  console.error('Usage: signal <session-file.js>');
  process.exit(1);
}

const sessionPath = path.resolve(sessionFile);

if (!fs.existsSync(sessionPath)) {
  console.error(`Session file not found: ${sessionPath}`);
  process.exit(1);
}

console.log('Signal Live Coding Runner');
console.log('=========================');
console.log(`Session: ${sessionPath}`);
console.log('Watching for changes...\n');

// Track which signals were defined in the last load
let lastSignals = new Set();

// Load and execute session file
function loadSession() {
  try {
    // Clear require cache for hot reload
    delete require.cache[sessionPath];

    // Get current signals before reload
    const beforeSignals = new Set(signal.list());

    // Clear all signals
    signal.clear();

    // Load the session file
    require(sessionPath);

    // Get signals after reload
    const afterSignals = new Set(signal.list());

    // Show what changed
    const added = [...afterSignals].filter(s => !beforeSignals.has(s));
    const removed = [...beforeSignals].filter(s => !afterSignals.has(s));
    const updated = [...afterSignals].filter(s => beforeSignals.has(s));

    console.log(`[${new Date().toLocaleTimeString()}] Reloaded`);
    if (added.length > 0) console.log(`  + Added: ${added.join(', ')}`);
    if (removed.length > 0) console.log(`  - Removed: ${removed.join(', ')}`);
    if (updated.length > 0) console.log(`  ↻ Updated: ${updated.join(', ')}`);
    console.log('');

    lastSignals = afterSignals;
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Error loading session:`);
    console.error(err.message);
    console.error('');
  }
}

// Initial load
loadSession();

// Watch for file changes
fs.watch(sessionPath, (eventType) => {
  if (eventType === 'change') {
    // Debounce: wait a bit for file write to complete
    setTimeout(loadSession, 100);
  }
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\nStopping audio...');
  signal.stopAudio();
  process.exit(0);
});
