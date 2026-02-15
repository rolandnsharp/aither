// snippet.js
// This is an example snippet to send to the running `lel` engine.
// It will unregister one of the default signals.

console.log('[REPL] Unregistering the filtered-sine signal...');
// unregister('filtered-delayed-sine');
// stop('elemental-unity')

play('tone-432-rhythmos', s => {
  const frequency = 432; // A4 = 432 Hz
  const amplitude = 0.125;
  // s.state[0] stores the phase accumulator for this signal.
  // It will persist across hot-reloads, ensuring phase continuity.
  s.state[0] = (s.state[0] || 0) + (frequency / s.sr);
  s.state[0] %= 1.0; // Wrap phase around 0 to 1
  return Math.sin(s.state[0] * 0.5 * Math.PI) * amplitude;
});

solo('tone-432-rhythmos', 4);

stop('tone-432-rhythmos')

list()


play('tone-432', s => {
  const frequency = 432; // A4 = 432 Hz
  const amplitude = 0.5;
  return Math.sin(2 * Math.PI * frequency * s.t) * amplitude;
}, 1);

stop('tone-432', 4)

clear(1)


play('fire-melody',
  pipe(
    // Melodic line using pure sine waves
    s => {
      // Melody changes every 4 seconds
      const melodyIndex = Math.floor(s.t / 4) % 4;
      const melody = [220, 247, 277, 330]; // A3, B3, C#4, E4
      const freq = melody[melodyIndex];
      // Fade in/out within each note
      const phase = (s.t % 4) / 4;
      const envelope = Math.sin(phase * Math.PI);
      return Math.sin(2 * Math.PI * freq * s.t) * envelope * 0.15;
    },
    signal => delay(signal, 1.0, 0.375), // Dotted eighth note delay
    signal => tremolo(signal, 6, 0.4) // Slight vibrato effect
  )
);

stop('fire-melody')

play('fire-drone',
  pipe(
    // Deep bass drone with slow amplitude modulation
    s => {
      const baseFreq = 555; // A1
      const harmonic2 = 210; // A2
      const harmonic3 = 365; // E3
      // Three harmonics for richness
      const fundamental = Math.sin(2 * Math.PI * baseFreq * s.t);
      const second = Math.sin(2 * Math.PI * harmonic2 * s.t) * 0.5;
      const third = Math.sin(2 * Math.PI * harmonic3 * s.t) * 0.3;
      // Slow amplitude modulation (0.1 Hz = 6 beats per minute)
      const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * s.t);
      return (fundamental + second + third) * am * 0.25;
    },
    signal => lowpass(signal, 400), // Dark, warm filter
    signal => feedback(signal, 3.0, 1.5, 0.2) // Long reverb-like feedback
  )
);

// stop('fire-drone')

play('mix-test',
  mix(
    s => Math.sin(2 * Math.PI * 220 * s.t) * 0.2,
    s => Math.sin(2 * Math.PI * 330 * s.t) * 0.2,
    s => Math.sin(2 * Math.PI * 440 * s.t) * 0.2
  )
)

stop('mix-test', 4)

play('osc-sin', sin(440))

play('osc-saw', pipe(saw(110), signal => lowpass(signal, 800)))

const mod = sin(180);
const carrier = sin(s => 340 + mod(s) * 100);
play('osc-fm', carrier)

stop('osc-fm', 2)

stop('osc-sin', 2)

stop('osc-saw', 2)
