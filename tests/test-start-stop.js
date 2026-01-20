// ============================================================================
// TEST START/STOP FUNCTIONALITY
// ============================================================================

const signal = require('../src/index');

console.log('Testing start/stop functionality...\n');

// Create three signals
const bass = signal('bass').sin(110).gain(0.3);
const mid = signal('mid').sin(220).gain(0.2);
const high = signal('high').sin(440).gain(0.15);

console.log('All three signals playing...');

// Stop mid after 2 seconds
setTimeout(() => {
  console.log('Stopping mid frequency...');
  mid.stop();
}, 2000);

// Stop bass after 4 seconds
setTimeout(() => {
  console.log('Stopping bass...');
  bass.stop();
}, 4000);

// Restart mid after 6 seconds
setTimeout(() => {
  console.log('Restarting mid frequency...');
  mid.play();
}, 6000);

// Stop all and exit after 8 seconds
setTimeout(() => {
  console.log('Stopping all...');
  bass.stop();
  mid.stop();
  high.stop();

  setTimeout(() => {
    console.log('✓ Start/stop test complete!');
    signal.stopAudio();
    process.exit(0);
  }, 1000);
}, 8000);
