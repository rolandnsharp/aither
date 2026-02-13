# Wavetable Synthesis in Aither

> *Pre-computed waveforms, table lookup, and spectral morphing - the backbone of modern synthesis.*

## What is Wavetable Synthesis?

**Wavetable synthesis** reads through pre-computed waveforms stored in buffers instead of calculating waveforms mathematically in real-time.

### Traditional Oscillator (Mathematical)

```javascript
// Calculate sine wave sample-by-sample
const sine = freq => s => Math.sin(2 * Math.PI * freq * s.t);

// Every sample: compute sine function (expensive)
```

### Wavetable Oscillator (Table Lookup)

```javascript
// Pre-compute one cycle (2048 samples)
const sineTable = new Float32Array(2048);
for (let i = 0; i < 2048; i++) {
  sineTable[i] = Math.sin(2 * Math.PI * i / 2048);
}

// Read through table at different speeds for different pitches
const wavetableSine = freq => s => {
  const phase = (s.t * freq) % 1.0;
  const readPos = phase * sineTable.length;
  const index = Math.floor(readPos);
  const frac = readPos - index;

  // Linear interpolation
  const sample1 = sineTable[index];
  const sample2 = sineTable[(index + 1) % sineTable.length];

  return sample1 + (sample2 - sample1) * frac;
};

// Every sample: just table lookup + interpolation (fast)
```

---

## Why Wavetable Synthesis?

### 1. **Efficiency** (Historical Reason)
- Table lookup is faster than `Math.sin()` or other complex functions
- Mattered more in 1980s hardware (PPG Wave)
- Less relevant today with fast CPUs and JIT compilation
- Still matters on embedded systems (Eurorack, microcontrollers)

### 2. **Arbitrary Complex Waveforms**

You can store waveforms that are impossible or impractical to compute mathematically:

```javascript
// Easy to compute
const sine = /* Math.sin */;
const saw = /* 2 * (phase % 1) - 1 */;

// Hard to compute
const vocal_ah = /* ??? how to synthesize this mathematically? */;
const bell = /* ??? complex harmonic structure */;
const metallic = /* ??? inharmonic partials */;

// But with wavetables, just store them!
const wavetables = {
  vocal_ah: loadFromFile('vocal_ah.wav'),  // Or pre-compute
  bell: generateBellSpectrum(),
  metallic: generateInharmonicPartials(),
};
```

### 3. **Wavetable Synthesis** (The Real Power)

**Multiple tables that you morph between:**

```
Table 0:  Sine     ─────────╱╲─────────╱╲─────────
Table 1:  Triangle ────────╱──╲──────╱──╲────────
Table 2:  Saw      ───────╱│  │  ╱│  │  ╱│────────
Table 3:  Square   ─────┌──┘  └──┌──┘  └──┌───────
                         ↕ morph ↕
Position: 0.0 ←───────────────────────────→ 3.0
```

**Morph through 64+ tables for evolving timbres:**

```javascript
const bank = [
  sineTable,      // 0: Pure sine
  triangleTable,  // 1: Mild harmonics
  sawTable,       // 2: Bright harmonics
  squareTable,    // 3: Odd harmonics
  // ... 60 more increasingly complex waveforms
];

// Position 0-64 smoothly morphs through all tables
const wavetableSynth = (position, freq) => s => {
  const pos = typeof position === 'function' ? position(s) : position;
  const index1 = Math.floor(pos) % bank.length;
  const index2 = (index1 + 1) % bank.length;
  const morph = pos - Math.floor(pos);

  // Read from both tables
  const sample1 = readFromTable(bank[index1], freq, s);
  const sample2 = readFromTable(bank[index2], freq, s);

  // Crossfade between them
  return sample1 * (1 - morph) + sample2 * morph;
};

// Evolving timbre over time
play('morph', wavetableSynth(
  s => Math.sin(s.t * 0.1) * 32 + 32, // Position sweeps 0-64
  440
));
```

This creates **constantly evolving timbres** that would be very difficult to achieve with mathematical oscillators.

---

## Who Uses Wavetable Synthesis?

### **Synthesizers**

1. **Serum** (Xfer Records)
   - Most popular modern wavetable synth
   - Visual wavetable editor
   - EDM/dubstep standard
   - Real-time spectral morphing

2. **Massive** (Native Instruments)
   - Dubstep/bass music workhorse
   - 100+ wavetables
   - Iconic "Massive bass" sound

3. **Vital** (Matt Tytel)
   - Free/open source
   - Serum alternative
   - Beautiful UI, spectral editor

4. **PPG Wave** (1980s)
   - First commercial wavetable synth
   - Wolfgang Palm (inventor)
   - Vintage classic

5. **Waldorf Blofeld, Quantum**
   - Hardware wavetable synthesizers
   - Professional/boutique market

6. **Arturia Pigments**
   - Hybrid wavetable + virtual analog
   - Modern comprehensive synth

### **Music Genres**

- **EDM/Dubstep** - Evolving bass sounds, growls
- **Synthwave** - Retro-futuristic pads
- **Ambient** - Evolving textural drones
- **Sound Design** - Film/game effects
- **Experimental Electronic**

### **Artists Known for Wavetable Sounds**

- Skrillex (Massive)
- deadmau5 (wavetable pads)
- Virtual Riot (wavetable bass design)
- Au5 (complex wavetable synthesis)
- Most modern electronic producers

---

## Implementation in Aither

Wavetable synthesis fits Aither's architecture perfectly. It's just another helper function!

### Basic Wavetable Oscillator

```javascript
// Store wavetables globally (outside s.state)
const WAVETABLE_POOL = new Map();

// Load or generate a wavetable
export function createWavetable(name, generator, size = 2048) {
  const table = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    table[i] = generator(i / size);
  }
  WAVETABLE_POOL.set(name, table);
  return table;
}

// Wavetable oscillator helper
export const wavetable = (tableName, freq) => {
  return expand((s, input, mem, base, chan, f) => {
    const PHASE = 0;
    const table = WAVETABLE_POOL.get(tableName);

    if (!table) {
      console.warn(`Wavetable "${tableName}" not found`);
      return 0;
    }

    const frequency = typeof f === 'function' ? f(s) : f;

    // Phase accumulation
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    // Table lookup with linear interpolation
    const readPos = mem[base + PHASE] * table.length;
    const index = Math.floor(readPos);
    const frac = readPos - index;
    const sample1 = table[index];
    const sample2 = table[(index + 1) % table.length];

    return sample1 + (sample2 - sample1) * frac;
  }, 'wavetable', 1); // Just needs phase state
};

// Create some basic wavetables
createWavetable('sine', phase => Math.sin(2 * Math.PI * phase));
createWavetable('saw', phase => 2 * phase - 1);
createWavetable('square', phase => phase < 0.5 ? 1 : -1);
createWavetable('triangle', phase =>
  phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase
);

// Usage
play('wt', pipe(
  wavetable('saw', 220),
  lowpass(_, 1000),
  gain(_, 0.3)
));
```

### Wavetable Bank with Morphing

```javascript
// Create a bank of wavetables
export function createWavetableBank(name, tables) {
  WAVETABLE_POOL.set(name, tables);
}

// Morphing wavetable oscillator
export const wavetableMorph = (bankName, position, freq) => {
  return expand((s, input, mem, base, chan, pos, f) => {
    const PHASE = 0;
    const bank = WAVETABLE_POOL.get(bankName);

    if (!bank || bank.length === 0) {
      console.warn(`Wavetable bank "${bankName}" not found`);
      return 0;
    }

    const p = typeof pos === 'function' ? pos(s) : pos;
    const frequency = typeof f === 'function' ? f(s) : f;

    // Determine which two tables to interpolate between
    const position = Math.max(0, Math.min(bank.length - 1, p));
    const index1 = Math.floor(position);
    const index2 = Math.min(index1 + 1, bank.length - 1);
    const morph = position - index1;

    const table1 = bank[index1];
    const table2 = bank[index2];

    // Phase accumulation
    mem[base + PHASE] = (mem[base + PHASE] || 0) + frequency / s.sr;
    mem[base + PHASE] %= 1.0;

    // Read from both tables with interpolation
    const readPos = mem[base + PHASE] * table1.length;
    const idx = Math.floor(readPos);
    const frac = readPos - idx;

    // Table 1
    const s1a = table1[idx];
    const s1b = table1[(idx + 1) % table1.length];
    const sample1 = s1a + (s1b - s1a) * frac;

    // Table 2
    const s2a = table2[idx];
    const s2b = table2[(idx + 1) % table2.length];
    const sample2 = s2a + (s2b - s2a) * frac;

    // Morph between tables
    return sample1 * (1 - morph) + sample2 * morph;
  }, 'wavetableMorph', 1);
};

// Create a bank of increasingly complex waveforms
const basicBank = [];
for (let i = 0; i < 64; i++) {
  const table = new Float32Array(2048);
  const harmonics = Math.floor(1 + i / 4); // More harmonics as index increases

  for (let j = 0; j < 2048; j++) {
    const phase = j / 2048;
    let sample = 0;

    // Additive synthesis - sum harmonics
    for (let h = 1; h <= harmonics; h++) {
      sample += Math.sin(2 * Math.PI * phase * h) / h;
    }

    table[j] = sample / harmonics;
  }

  basicBank.push(table);
}

createWavetableBank('basic', basicBank);

// Usage: morph through 64 waveforms
play('evolving', pipe(
  wavetableMorph('basic',
    s => Math.sin(s.t * 0.2) * 32 + 32, // Position 0-64
    110
  ),
  lowpass(_, s => 500 + Math.sin(s.t * 0.3) * 400),
  gain(_, 0.3)
));
```

### Advanced: Spectral Wavetables

```javascript
// Generate wavetables from spectral data
export function createSpectralWavetable(name, magnitudes, phases) {
  const size = magnitudes.length * 2;
  const table = new Float32Array(size);

  // Additive synthesis from frequency domain
  for (let i = 0; i < size; i++) {
    const phase = i / size;
    let sample = 0;

    for (let h = 0; h < magnitudes.length; h++) {
      const mag = magnitudes[h];
      const phs = phases ? phases[h] : 0;
      sample += Math.sin(2 * Math.PI * phase * (h + 1) + phs) * mag;
    }

    table[i] = sample;
  }

  // Normalize
  const max = Math.max(...table.map(Math.abs));
  for (let i = 0; i < size; i++) {
    table[i] /= max;
  }

  WAVETABLE_POOL.set(name, table);
}

// Create vocal formant
createSpectralWavetable('vocal-ah', [
  1.0,  // Fundamental
  0.5,  // 2nd harmonic
  0.8,  // 3rd harmonic (formant peak)
  0.3,  // 4th
  0.6,  // 5th
  0.2,  // 6th
  0.4,  // 7th (formant peak)
  0.1,  // 8th
]);

play('vocal', pipe(
  wavetable('vocal-ah', 110),
  lowpass(_, 2000),
  gain(_, 0.3)
));
```

### Loading External Wavetables

```javascript
// Load wavetables from audio files
export async function loadWavetableFromFile(name, filepath) {
  // This would use Web Audio API or a file loader
  const audioData = await loadAudioFile(filepath);

  // Extract one cycle (or multiple cycles for a bank)
  // This requires pitch detection or user-specified cycle length
  const cycle = extractOneCycle(audioData);

  WAVETABLE_POOL.set(name, cycle);
}

// Usage
await loadWavetableFromFile('my-sample', './samples/interesting-sound.wav');
play('sample-based', wavetable('my-sample', 440));
```

---

## Wavetable Design Techniques

### 1. **Additive Synthesis**

Build wavetables by summing harmonics:

```javascript
function generateAdditiveTable(harmonics) {
  const table = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) {
    const phase = i / 2048;
    let sample = 0;

    for (let h = 0; h < harmonics.length; h++) {
      const mag = harmonics[h];
      sample += Math.sin(2 * Math.PI * phase * (h + 1)) * mag;
    }

    table[i] = sample;
  }

  return normalize(table);
}

// Sawtooth = all harmonics with 1/n falloff
const saw = generateAdditiveTable([1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/7, 1/8]);

// Square = odd harmonics with 1/n falloff
const square = generateAdditiveTable([1, 0, 1/3, 0, 1/5, 0, 1/7, 0]);
```

### 2. **Spectral Morphing Banks**

Create smooth transitions:

```javascript
function generateMorphBank(start, end, steps) {
  const bank = [];

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0 to 1
    const table = new Float32Array(2048);

    for (let j = 0; j < 2048; j++) {
      // Linear interpolation between start and end spectrums
      table[j] = start[j] * (1 - t) + end[j] * t;
    }

    bank.push(table);
  }

  return bank;
}

const sineTable = generateAdditiveTable([1]);
const sawTable = generateAdditiveTable([1, 1/2, 1/3, 1/4, 1/5, 1/6]);

const sineToSaw = generateMorphBank(sineTable, sawTable, 64);
createWavetableBank('sine-to-saw', sineToSaw);
```

### 3. **Waveshaping**

Apply nonlinear transforms to basic waveforms:

```javascript
function waveshape(inputTable, shaper) {
  const output = new Float32Array(inputTable.length);
  for (let i = 0; i < inputTable.length; i++) {
    output[i] = shaper(inputTable[i]);
  }
  return output;
}

const sine = generateAdditiveTable([1]);

// Soft clipping
const softClipped = waveshape(sine, x => Math.tanh(x * 2));

// Wave folding
const folded = waveshape(sine, x => {
  while (x > 1) x = 2 - x;
  while (x < -1) x = -2 - x;
  return x;
});
```

### 4. **Inharmonic Partials**

For bell-like, metallic sounds:

```javascript
function generateInharmonicTable(partials) {
  const table = new Float32Array(2048);

  for (let i = 0; i < 2048; i++) {
    const phase = i / 2048;
    let sample = 0;

    // partials = [{freq: 1.0, mag: 1.0}, {freq: 2.76, mag: 0.5}, ...]
    for (const partial of partials) {
      sample += Math.sin(2 * Math.PI * phase * partial.freq) * partial.mag;
    }

    table[i] = sample;
  }

  return normalize(table);
}

// Bell spectrum (inharmonic)
const bell = generateInharmonicTable([
  {freq: 1.0, mag: 1.0},
  {freq: 2.76, mag: 0.6},
  {freq: 5.4, mag: 0.4},
  {freq: 8.93, mag: 0.3},
]);

createWavetable('bell', bell);
```

---

## Integration with Aither's Paradigms

Wavetable synthesis fits naturally:

### 🔥 Kanon (Fire) - Pure Wavetables

```javascript
// Pure mathematical wavetable generation
const pureTable = createWavetable('pure', phase =>
  Math.sin(2 * Math.PI * phase)
);
```

### 🌍 Rhythmos (Earth) - Stateful Phase Accumulation

```javascript
// Wavetable oscillator IS a Rhythmos pattern
// Phase accumulation in s.state, reading from table
play('rhythmos-wt', wavetable('saw', 110));
```

### 💨 Atomos (Air) - Granular Wavetable Scanning

```javascript
// Scan through wavetable bank with discrete jumps
play('granular-scan', s => {
  const position = Math.floor(Math.random() * 64);
  return wavetableMorph('basic', position, 220)(s);
});
```

### 💧 Physis (Water) - Physics-Modulated Wavetable Position

```javascript
// Spring oscillator controls wavetable position
play('physics-morph', s => {
  // Spring physics in s.state slots 0-1
  const k = 100, c = 0.5;
  const pos = s.state[0] || 0;
  const vel = s.state[1] || 5;
  const force = -k * pos - c * vel;

  s.state[1] = vel + force * s.dt;
  s.state[0] = pos + s.state[1] * s.dt;

  // Use spring position to select wavetable
  const wtPosition = Math.abs(pos) * 10;

  return wavetableMorph('basic', wtPosition, 110)(s);
});
```

### ✨ Chora (Aither) - Spatial Wavetable Fields

```javascript
// Different wavetables at different spatial positions
play('spatial-wt', s => {
  const { x, y, z } = s.position;
  const distance = Math.sqrt(x*x + y*y + z*z);

  // Distance determines wavetable position
  const wtPosition = distance * 10;

  return wavetableMorph('basic', wtPosition, 440)(s) / (distance + 1);
});
```

---

## Advantages for Aither

### ✅ No Architecture Change

- Uses existing `expand()` pattern
- State management via `s.state`
- Just another helper function
- Composable with everything

### ✅ Expressive Timbres

- Access to complex waveforms
- Evolving sounds over time
- Impossible to achieve with simple oscillators

### ✅ Modern Synthesis Standard

- Used in most professional synthesizers
- Expected by electronic music producers
- Opens up new sound design possibilities

### ✅ Relatively Simple Implementation

- ~100 lines of code for basic version
- No FFT complexity
- No block processing
- Just table lookup + interpolation

### ✅ Educational Value

- Teaches interpolation, aliasing, phase accumulation
- Bridge between theory and practice
- Accessible to learners

---

## Potential Issues

### ⚠️ Memory Usage

- Each table: 2048 floats = 8KB
- Bank of 64 tables = 512KB
- Multiple banks = megabytes

**Solution:** Reasonable for modern systems. Can limit bank sizes if needed.

### ⚠️ Aliasing

Without band-limiting, wavetables can alias at high frequencies:

```
Nyquist frequency = sample_rate / 2 = 24kHz @ 48kHz
Playing a wavetable with 20 harmonics at 2000Hz = 40kHz fundamental
→ Aliases back into audible range
```

**Solutions:**
1. Generate multiple band-limited versions (like Serum does)
2. Low-pass filter the output
3. Accept slight aliasing (most users won't notice)

### ⚠️ Interpolation Quality

Linear interpolation is fast but can cause artifacts:

**Better options:**
- Cubic interpolation (slower, smoother)
- Hermite interpolation (good balance)
- Sinc interpolation (best quality, very slow)

**For Aither:** Start with linear, add cubic as an option later.

---

## Recommendation

### **Yes, implement wavetable synthesis in Aither!**

**Why:**
1. Fits architecture perfectly
2. No breaking changes
3. Modern synthesis standard
4. Highly expressive
5. Relatively simple
6. Expected by users

**Implementation priority:**
1. ✅ Basic single-table oscillator
2. ✅ Morphing between tables
3. ✅ Wavetable bank system
4. ⚠️ External file loading (optional)
5. ⚠️ Band-limiting (optional, later)

**Estimated complexity:** Low-medium
**Estimated time:** 2-4 hours for basic version

**Start with:**
```javascript
// Just these functions:
createWavetable(name, generator, size)
wavetable(tableName, freq)
wavetableMorph(bankName, position, freq)
```

**Add standard tables:**
- Sine, saw, square, triangle
- Basic bank (sine → saw morph)
- Maybe a few specialized ones (vocal, bell)

**Let users create their own** with `createWavetable()` for experimentation.

---

## Conclusion

Wavetable synthesis is a **perfect fit for Aither**:
- Architecturally simple (just a helper)
- Expressively powerful (evolving timbres)
- Industry standard (Serum, Massive, Vital)
- Composable with all paradigms

Unlike FFT (complex, not core to philosophy), wavetables are **fundamental synthesis tools** that expand Aither's sonic palette without architectural complexity.

**Recommendation: Implement wavetable synthesis before considering FFT.**

---

**Related documents:**
- [FFT-AND-SPECTRAL-PROCESSING.md](FFT-AND-SPECTRAL-PROCESSING.md) - More complex spectral techniques
- [COMPARISON.md](docs/COMPARISON.md) - How Aither compares to other systems
- [HELPERS.md](docs/HELPERS.md) - Current DSP helper implementation

**Further reading:**
- [Wavetable Synthesis on Wikipedia](https://en.wikipedia.org/wiki/Wavetable_synthesis)
- [Serum Wavetable Editor Tutorial](https://www.youtube.com/results?search_query=serum+wavetable+tutorial)
- [PPG Wave History](https://www.soundonsound.com/reviews/ppg-wave-22)
