// Bush Doof Session — send each block to build the set

// --- KICK ---
const beat = phasor(135/60)
const env = share(decay(beat, 35))
const kick = sin(s => 54 + env(s) * 180)
play('kick', s => kick(s) * env(s) * 0.4)

// --- BASS (pythagorean tuning) ---

const knob = connect
const pyth = [1, 1, 4/3, 3/2]
const bassEnv = share(decay(phasor(145/120), 3))
const bass = saw(s => 54 * pyth[Math.floor(s.t * 145/120) % pyth.length])
play('bass', pipe(
  s => bass(s) * bassEnv(s) * 0.14,
  // signal => lowpass(signal, s => 40 + bassEnv(s) * 3500),
  signal => feedback(signal, 0.13, 0.25, 0.3)
))

stop('bass')

// --- TESLA COIL (sustained buzz + pythagorean melody) ---
const phi = 1.2618
const melody = [1, 9/8, 0, 0, 4/3, 0, 3/2, 0, 27/16, 3/2, 4/3, 9/8]
const note = s => melody[Math.floor(s.t * 145/120) % melody.length]
const coil1 = saw(s => 333 * note(s), 0.1)
const coil2 = saw(s => 666 * note(s), 0.1)
const fizz = pipe(noise(), signal => highpass(signal, 2000))
play('tesla', pipe(
  s => (coil1(s) + coil2(s) * 0.6 + fizz(s) * 0.15) * 0.1,
  signal => highpass(signal, 330),
  signal => tremolo(signal, 145/60 * phi, 0.3),
  signal => reverb(signal, 3, 0.5, 0.4)
), 3)

stop('tesla', 5)

// --- VORTEX (spiraling stereo feedback) ---
const phix = 1.618
const vort = sin(s => 162 * phix + Math.sin(s.t * 0.3) * 80)
play('vortex', pipe(
  s => vort(s) * 0.1,
  signal => feedback(signal, 1.5, s => 0.3 + Math.sin(s.t * phix * 0.4) * 0.2, 0.7),
  signal => highpass(signal, 30),
  signal => pan(signal, s => Math.sin(s.t * phix * 0.6))
), 4)

stop('vortex', 6)

// --- DROP ---
solo('kick', 2)

clear(5)


play('hello', s => Math.sin(2 * Math.PI * 440 * s.t) * 0.3)


play('haunt', pipe(
  tri(333),
  signal => lowpass(signal, 300),
  signal => feedback(signal, 2.0, 1.5, 0.7)
))

  // Acid squelch
  const bpm = 130/60
  const envo = share(decay(phasor(bpm), 25))
  play('acid', pipe(
    saw(wave(bpm, [55, 55, 73, 55, 82, 55, 65, 55])),
    signal => lpf(signal, s => 200 + envo(s) * 3000, 0.85)
  ))

  // Self-oscillating filter as oscillator
  play('ping', lpf(noise(), 440, 0.95))

   play('ping', gain(lpf(noise(), 440, 0.999), 0.3))


  // Bandpass resonance
  play('bp', pipe(noise(), signal => bpf(signal, 800, 0.9)))
