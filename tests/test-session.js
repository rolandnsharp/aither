// ============================================================================
// SIGNAL API TEST SESSION
// ============================================================================

const signal = require('../src/index');
const { step } = require('../src/rhythm');
const { freq } = require('../src/melody');
const { env } = require('../src/envelopes');
const scales = require('../src/scales');

console.log('Signal API Test Session Started');
console.log('================================\n');

// ============================================================================
// TEST 1: Simple sine wave using helpers
// ============================================================================

console.log('Test 1: Simple sine wave (432 Hz)');
signal('test1', t => signal.sin(432).gain(0.2).eval(t));

setTimeout(() => {
  signal.remove('test1');
  console.log('✓ Test 1 complete\n');

  // ==========================================================================
  // TEST 2: Chord using mix
  // ==========================================================================

  console.log('Test 2: Major chord (432 Hz root)');
  signal('test2', t => {
    return signal.mix(
      signal.sin(432).gain(0.15),
      signal.sin(540).gain(0.15),
      signal.sin(648).gain(0.15)
    ).eval(t);
  });

  setTimeout(() => {
    signal.remove('test2');
    console.log('✓ Test 2 complete\n');

    // ========================================================================
    // TEST 3: Tremolo using modulation
    // ========================================================================

    console.log('Test 3: Tremolo (3 Hz LFO)');
    const lfo = signal.sin(3).gain(0.5).offset(0.5);
    signal('test3', t => {
      return signal.sin(432).modulate(lfo).gain(0.2).eval(t);
    });

    setTimeout(() => {
      signal.remove('test3');
      console.log('✓ Test 3 complete\n');

      // ======================================================================
      // TEST 4: Distortion using .fx()
      // ======================================================================

      console.log('Test 4: Distorted bass');
      signal('test4', t => {
        return signal.sin(110)
          .fx(sample => Math.tanh(sample * 3))
          .gain(0.3)
          .eval(t);
      });

      setTimeout(() => {
        signal.remove('test4');
        console.log('✓ Test 4 complete\n');

        // ==================================================================
        // TEST 5: Melody with step sequencer
        // ==================================================================

        console.log('Test 5: Melodic sequence (C minor scale)');
        signal('test5', t => {
          const { index, phase } = step(t, 120, 8);  // 120 BPM, 8th notes
          const melody = [0, 3, 5, 3, 7, 5, 3, 0];
          const degree = melody[index % melody.length];

          const f = freq(432, scales.minor, degree);
          const envelope = env.exp(phase, 5);

          return signal.sin(f).eval(t) * envelope * 0.2;
        });

        setTimeout(() => {
          signal.remove('test5');
          console.log('✓ Test 5 complete\n');

          // ================================================================
          // TEST 6: Different waveforms
          // ================================================================

          console.log('Test 6: Square wave');
          signal('test6', t => signal.square(220).gain(0.2).eval(t));

          setTimeout(() => {
            signal.remove('test6');
            console.log('✓ Test 6 complete\n');

            console.log('All tests complete!');
            console.log('Stopping audio...');
            signal.stopAudio();
            process.exit(0);
          }, 2000);
        }, 3000);
      }, 2000);
    }, 2000);
  }, 2000);
}, 2000);
