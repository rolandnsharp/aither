// ============================================================================
// TEST BAR-BASED COMPOSITION
// ============================================================================

const signal = require('./index');
const { bars, onBar, getCurrentBar } = signal;

console.log('Testing bar-based composition...\n');

const BPM = 180; // Fast for quick testing

const bass = signal('bass').sin(110).gain(0.3).stop();
const mid = signal('mid').sin(220).gain(0.2).stop();
const high = signal('high').sin(440).gain(0.15).stop();

// Test async bars()
async function testAsync() {
  console.log('Test 1: Async bars()');
  console.log('[Bar 0] Starting with bass');
  bass.play();

  await bars(2, BPM);
  console.log(`[Bar ${getCurrentBar(BPM)}] Adding mid`);
  mid.play();

  await bars(2, BPM);
  console.log(`[Bar ${getCurrentBar(BPM)}] Adding high`);
  high.play();

  await bars(2, BPM);
  console.log(`[Bar ${getCurrentBar(BPM)}] Stopping all`);
  bass.stop();
  mid.stop();
  high.stop();

  await bars(1, BPM);
  console.log('\n✓ Async test complete!\n');

  // Test onBar()
  testOnBar();
}

// Test declarative onBar()
function testOnBar() {
  console.log('Test 2: onBar() declarative');

  signal.resetTimer(); // Reset for clean test

  onBar(0, BPM, () => {
    console.log('[Bar 0] Bass plays');
    bass.play();
  });

  onBar(2, BPM, () => {
    console.log('[Bar 2] Mid plays');
    mid.play();
  });

  onBar(4, BPM, () => {
    console.log('[Bar 4] High plays');
    high.play();
  });

  onBar(6, BPM, () => {
    console.log('[Bar 6] All stop');
    bass.stop();
    mid.stop();
    high.stop();

    setTimeout(() => {
      console.log('\n✓ onBar test complete!\n');
      console.log('All bar-based tests passed!');
      signal.stopAudio();
      process.exit(0);
    }, 1000);
  });
}

// Run tests
testAsync().catch(err => {
  console.error('Error:', err);
  signal.stopAudio();
  process.exit(1);
});
