// ============================================================================
// TEST NEW BUILDER SYNTAX
// ============================================================================

const signal = require('../src/index');

console.log('Testing new signal builder syntax...\n');

// Test 1: Builder style
console.log('Test 1: signal("tone").sin(432).gain(0.2)');
signal('tone').sin(432).gain(0.2);

setTimeout(() => {
  signal.remove('tone');
  console.log('✓ Builder style works\n');

  // Test 2: Custom function - builder style
  console.log('Test 2: signal("custom").fn(t => ...)');
  signal('custom').fn(t => Math.sin(2 * Math.PI * 440 * t) * 0.2);

  setTimeout(() => {
    signal.remove('custom');
    console.log('✓ Builder .fn() style works\n');

    // Test 3: Direct function style (backward compat)
    console.log('Test 3: signal("direct", t => ...)');
    signal('direct', t => Math.sin(2 * Math.PI * 330 * t) * 0.2);

    setTimeout(() => {
      signal.remove('direct');
      console.log('✓ Direct function style works\n');

      // Test 4: Unnamed signal
      console.log('Test 4: const lfo = signal.sin(5)');
      const lfo = signal.sin(5);
      signal('modulated').sin(440).modulate(lfo.gain(0.5).offset(0.5)).gain(0.2);

      setTimeout(() => {
        signal.remove('modulated');
        console.log('✓ Unnamed signal style works\n');

        // Test 5: Chaining with builder
        console.log('Test 5: signal("chain").square(220).clip(0.8).gain(0.2)');
        signal('chain').square(220).clip(0.8).gain(0.2);

        setTimeout(() => {
          signal.remove('chain');
          console.log('✓ Builder with chaining works\n');

          console.log('All builder tests passed!');
          signal.stopAudio();
          process.exit(0);
        }, 2000);
      }, 2000);
    }, 2000);
  }, 2000);
}, 2000);
