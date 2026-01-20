// ============================================================================
// ASYNC COMPOSITION PATTERNS
// ============================================================================
// Examples of different async patterns for composition
// Run with: node signal/async-patterns.js

const signal = require('./index');
const { step } = require('./rhythm');
const { freq } = require('./melody');
const { env } = require('./envelopes');
const scales = require('./scales');
const { sleep } = signal;

console.log('Async Composition Patterns');
console.log('===========================\n');

// ============================================================================
// Create instruments
// ============================================================================

const instruments = {
  bass: signal('bass').sin(110).gain(0.3).stop(),
  mid: signal('mid').sin(220).gain(0.2).stop(),
  high: signal('high').sin(440).gain(0.15).stop(),
  pad: signal('pad').sin(165).gain(0.12).stop()
};

// ============================================================================
// PATTERN 1: Sequential - One after another
// ============================================================================

async function sequentialPattern() {
  console.log('Pattern 1: Sequential (one after another)');

  await sleep(1000);
  instruments.bass.play();
  console.log('  - Bass');

  await sleep(1000);
  instruments.mid.play();
  console.log('  - Mid');

  await sleep(1000);
  instruments.high.play();
  console.log('  - High');

  await sleep(2000);

  // Stop all
  instruments.bass.stop();
  instruments.mid.stop();
  instruments.high.stop();
  console.log('  - Stopped all\n');
}

// ============================================================================
// PATTERN 2: Parallel - Start multiple at once
// ============================================================================

async function parallelPattern() {
  console.log('Pattern 2: Parallel (start multiple together)');

  await sleep(1000);

  // Start all at once
  instruments.bass.play();
  instruments.mid.play();
  instruments.high.play();
  console.log('  - All started together');

  await sleep(3000);

  // Stop all at once
  instruments.bass.stop();
  instruments.mid.stop();
  instruments.high.stop();
  console.log('  - All stopped together\n');
}

// ============================================================================
// PATTERN 3: Staggered - Overlapping starts
// ============================================================================

async function staggeredPattern() {
  console.log('Pattern 3: Staggered (overlapping)');

  // Start with delays but don't wait for each to finish
  sleep(0).then(() => {
    instruments.bass.play();
    console.log('  - Bass (0ms)');
  });

  sleep(500).then(() => {
    instruments.mid.play();
    console.log('  - Mid (500ms)');
  });

  sleep(1000).then(() => {
    instruments.high.play();
    console.log('  - High (1000ms)');
  });

  await sleep(3000);

  instruments.bass.stop();
  instruments.mid.stop();
  instruments.high.stop();
  console.log('  - Stopped all\n');
}

// ============================================================================
// PATTERN 4: Loop - Repeating patterns
// ============================================================================

async function loopPattern() {
  console.log('Pattern 4: Loop (repeating on/off)');

  for (let i = 0; i < 3; i++) {
    console.log(`  - Cycle ${i + 1}`);

    instruments.bass.play();
    await sleep(500);
    instruments.bass.stop();

    instruments.mid.play();
    await sleep(500);
    instruments.mid.stop();
  }

  console.log('  - Loop complete\n');
}

// ============================================================================
// PATTERN 5: Conditional - Change based on state
// ============================================================================

async function conditionalPattern() {
  console.log('Pattern 5: Conditional (changes based on state)');

  const sections = ['intro', 'build', 'drop', 'outro'];

  for (const section of sections) {
    console.log(`  - Section: ${section}`);

    if (section === 'intro') {
      instruments.pad.play();
    } else if (section === 'build') {
      instruments.bass.play();
    } else if (section === 'drop') {
      instruments.mid.play();
      instruments.high.play();
    } else if (section === 'outro') {
      instruments.mid.stop();
      instruments.high.stop();
      instruments.bass.stop();
    }

    await sleep(1500);
  }

  instruments.pad.stop();
  console.log('  - Conditional complete\n');
}

// ============================================================================
// PATTERN 6: Promise.race - First one wins
// ============================================================================

async function racePattern() {
  console.log('Pattern 6: Race (whichever finishes first)');

  const scenario1 = async () => {
    await sleep(1000);
    instruments.bass.play();
    return 'bass';
  };

  const scenario2 = async () => {
    await sleep(1500);
    instruments.mid.play();
    return 'mid';
  };

  const winner = await Promise.race([scenario1(), scenario2()]);
  console.log(`  - Winner: ${winner} started first`);

  await sleep(2000);
  instruments.bass.stop();
  instruments.mid.stop();
  console.log('  - Race complete\n');
}

// ============================================================================
// PATTERN 7: Array methods - Generate from data
// ============================================================================

async function arrayPattern() {
  console.log('Pattern 7: Array methods (generate from data)');

  const layers = [
    { name: 'bass', delay: 0 },
    { name: 'mid', delay: 500 },
    { name: 'high', delay: 1000 }
  ];

  // Bring in each layer with delay
  for (const layer of layers) {
    await sleep(layer.delay);
    instruments[layer.name].play();
    console.log(`  - ${layer.name} (delay: ${layer.delay}ms)`);
  }

  await sleep(2000);

  // Remove in reverse order
  for (const layer of layers.reverse()) {
    instruments[layer.name].stop();
    console.log(`  - Stopped ${layer.name}`);
    await sleep(500);
  }

  console.log('  - Array pattern complete\n');
}

// ============================================================================
// PATTERN 8: Nested async - Composition of compositions
// ============================================================================

async function nestedPattern() {
  console.log('Pattern 8: Nested (composition of compositions)');

  async function intro() {
    console.log('  - Intro starting');
    instruments.pad.play();
    await sleep(1000);
  }

  async function verse() {
    console.log('  - Verse starting');
    instruments.bass.play();
    await sleep(1500);
  }

  async function chorus() {
    console.log('  - Chorus starting');
    instruments.mid.play();
    instruments.high.play();
    await sleep(2000);
  }

  async function outro() {
    console.log('  - Outro starting');
    instruments.mid.stop();
    instruments.high.stop();
    await sleep(1000);
    instruments.bass.stop();
    instruments.pad.stop();
  }

  await intro();
  await verse();
  await chorus();
  await outro();

  console.log('  - Song complete\n');
}

// ============================================================================
// Run all patterns sequentially
// ============================================================================

async function runAllPatterns() {
  console.log('Running all patterns...\n');

  await sequentialPattern();
  await sleep(1000);

  await parallelPattern();
  await sleep(1000);

  await staggeredPattern();
  await sleep(1000);

  await loopPattern();
  await sleep(1000);

  await conditionalPattern();
  await sleep(1000);

  await racePattern();
  await sleep(1000);

  await arrayPattern();
  await sleep(1000);

  await nestedPattern();

  console.log('✓ All patterns complete!');
  signal.stopAudio();
  process.exit(0);
}

// Run it!
runAllPatterns().catch(err => {
  console.error('Error:', err);
  signal.stopAudio();
  process.exit(1);
});
