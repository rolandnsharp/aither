# JavaScript Language Features for Music Generation

## Introduction

Signal showcases JavaScript's full power for creative audio programming. This document explores advanced JavaScript features that enable expressive, elegant music generation - from generators and proxies to symbols and template literals.

**Why this matters:**
- JavaScript is a complete programming language, not just for web dev
- Modern JS features enable new musical paradigms
- Learn advanced programming through creative output
- Signal becomes a platform for exploring computer science

## 1. Generators

Generators enable lazy evaluation of infinite sequences - perfect for musical patterns.

### Basic Generator Syntax

```javascript
function* countUp() {
  let i = 0;
  while (true) {
    yield i++;
  }
}

const counter = countUp();
console.log(counter.next().value);  // 0
console.log(counter.next().value);  // 1
console.log(counter.next().value);  // 2
```

### Infinite Euclidean Rhythms

```javascript
function* euclidean(pulses, steps) {
  let bucket = 0;
  while (true) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      yield 1;
    } else {
      yield 0;
    }
  }
}

// Usage with Signal
const signal = require('@rolandnsharp/signal');
const { step, env } = signal;

const pattern = euclidean(5, 16);

signal('euclid-kick', t => {
  const { index, phase } = step(t, 120, 16);

  if (index !== Math.floor(index)) return 0;  // Only on beat changes

  const trigger = pattern.next().value;
  if (!trigger || phase > 0.1) return 0;

  const f = 50 + 80 * env.exp(phase * 10, 20);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase * 10, 8) * 0.4;
});
```

### Melodic Sequences

```javascript
function* melody(scale, pattern) {
  let i = 0;
  while (true) {
    yield scale[pattern[i % pattern.length]];
    i++;
  }
}

const { freq, scales } = signal;
const notes = melody(scales.minor, [0, 2, 3, 5, 7, 5, 3, 2]);

signal('melody', t => {
  const { index, phase } = step(t, 100, 8);

  const degree = notes.next().value;
  const f = freq(330, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.2;
});
```

### Markov Chains

```javascript
function* markovChain(transitions, current) {
  while (true) {
    yield current;
    const options = transitions[current];
    current = options[Math.floor(Math.random() * options.length)];
  }
}

// Chord progression transitions
const transitions = {
  'I': ['I', 'ii', 'IV', 'V'],
  'ii': ['V', 'IV'],
  'IV': ['I', 'V', 'ii'],
  'V': ['I', 'vi'],
  'vi': ['ii', 'IV']
};

const progression = markovChain(transitions, 'I');

// Play progression
signal('progression', t => {
  const beatTime = Math.floor(t / 2);  // Change every 2 seconds

  const chord = progression.next().value;
  const chords = {
    'I': [0, 4, 7],
    'ii': [2, 5, 9],
    'IV': [5, 9, 0],
    'V': [7, 11, 2],
    'vi': [9, 0, 4]
  };

  const notes = chords[chord];
  return notes.reduce((sum, degree) => {
    const f = freq(220, scales.major, degree);
    return sum + Math.sin(2 * Math.PI * f * t);
  }, 0) * 0.06;
});
```

### Random Walks

```javascript
function* randomWalk(start = 0, step = 1, min = -12, max = 12) {
  let position = start;
  while (true) {
    yield position;
    position += (Math.random() > 0.5 ? step : -step);
    position = Math.max(min, Math.min(max, position));
  }
}

const walk = randomWalk(0, 2, -7, 7);

signal('random-walk', t => {
  const { index, phase } = step(t, 90, 8);

  const degree = walk.next().value;
  const f = freq(440, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.18;
});
```

### Generator Composition

```javascript
// Higher-order generator functions
function* map(generator, fn) {
  for (const value of generator) {
    yield fn(value);
  }
}

function* filter(generator, predicate) {
  for (const value of generator) {
    if (predicate(value)) {
      yield value;
    }
  }
}

function* take(generator, n) {
  let i = 0;
  for (const value of generator) {
    if (i++ >= n) break;
    yield value;
  }
}

function* cycle(array) {
  let i = 0;
  while (true) {
    yield array[i % array.length];
    i++;
  }
}

// Compose patterns
const pattern = cycle([0, 2, 4, 5, 7]);
const transposed = map(pattern, n => n + 12);
const limited = take(transposed, 16);

for (const note of limited) {
  console.log(note);  // 12, 14, 16, 17, 19, ...
}
```

## 2. Proxies

Proxies enable metaprogramming - intercept and redefine operations.

### Auto-Generating Oscillators

```javascript
// Create oscillators on-demand
const osc = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string' && !isNaN(prop)) {
      if (!target[prop]) {
        target[prop] = signal.sin(parseFloat(prop));
      }
      return target[prop];
    }
    return target[prop];
  }
});

// Oscillators spring into existence!
signal('chord', t => {
  return (
    osc[220].eval(t) +
    osc[277].eval(t) +
    osc[330].eval(t)
  ) * 0.1;
});
```

### Reactive Parameters

```javascript
function reactiveSignal(initialFreq, initialGain = 0.5) {
  const state = { freq: initialFreq, gain: initialGain };

  const params = new Proxy(state, {
    set(target, prop, value) {
      console.log(`🎵 Changed ${prop} from ${target[prop]} to ${value}`);
      target[prop] = value;
      return true;
    }
  });

  return {
    params,
    eval: t => Math.sin(2 * Math.PI * params.freq * t) * params.gain
  };
}

const synth = reactiveSignal(440);
signal('reactive', synth.eval);

// Live parameter changes
setTimeout(() => synth.params.freq = 880, 2000);
setTimeout(() => synth.params.gain = 0.8, 4000);
```

### Scale Objects with Magic Access

```javascript
const createScale = (root, intervals) => {
  return new Proxy({}, {
    get(target, prop) {
      const degree = parseInt(prop);
      if (!isNaN(degree)) {
        const octave = Math.floor(degree / intervals.length);
        const index = degree % intervals.length;
        return root * Math.pow(2, (intervals[index] + octave * 12) / 12);
      }
      return target[prop];
    }
  });
};

const C_major = createScale(261.63, [0, 2, 4, 5, 7, 9, 11, 12]);

console.log(C_major[0]);   // 261.63 Hz (C4)
console.log(C_major[2]);   // E4
console.log(C_major[7]);   // C5
console.log(C_major[14]);  // E6
```

### Method Missing Pattern

```javascript
const synth = new Proxy({
  osc: (freq) => signal.sin(freq),
  gain: (sig, amount) => sig.gain(amount)
}, {
  get(target, prop) {
    if (target[prop]) {
      return target[prop];
    }

    // Generate method on the fly
    console.log(`Creating method: ${prop}`);
    return (...args) => {
      console.log(`Called ${prop} with`, args);
      return signal.sin(args[0] || 440);
    };
  }
});

// Methods that don't exist get created!
const tone = synth.mystery(550);
```

## 3. Async Generators

Combine generators with promises for time-based sequences.

### Scheduled Events

```javascript
async function* timeline() {
  yield { time: 0, note: 60, duration: 0.5 };
  await new Promise(r => setTimeout(r, 500));

  yield { time: 0.5, note: 64, duration: 0.5 };
  await new Promise(r => setTimeout(r, 500));

  yield { time: 1.0, note: 67, duration: 1.0 };
  await new Promise(r => setTimeout(r, 1000));

  yield { time: 2.0, note: 72, duration: 2.0 };
}

// Play sequence
(async () => {
  for await (const event of timeline()) {
    const freq = signal.mtof(event.note);
    signal(`note-${event.time}`, t => {
      const elapsed = t - event.time;
      if (elapsed < 0 || elapsed > event.duration) return 0;

      const phase = elapsed / event.duration;
      return Math.sin(2 * Math.PI * freq * t) * signal.env.exp(phase, 5) * 0.2;
    });
  }
})();
```

### Async Pattern Loading

```javascript
async function* loadPatterns() {
  // Could fetch from server, filesystem, etc.
  const patterns = [
    [0, 2, 4, 5],
    [0, 3, 7, 10],
    [0, 4, 7, 11]
  ];

  for (const pattern of patterns) {
    yield pattern;
    await new Promise(r => setTimeout(r, 4000));  // Switch every 4 seconds
  }
}

(async () => {
  for await (const pattern of loadPatterns()) {
    signal('evolving', t => {
      const { index, phase } = step(t, 110, 8);
      const degree = pattern[index % pattern.length];
      const f = freq(330, scales.major, degree);
      return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
    });
  }
})();
```

## 4. Symbols

Unique identifiers for custom protocols.

### Custom Iteration Protocol

```javascript
const scale = {
  root: 440,
  intervals: [0, 2, 4, 5, 7, 9, 11, 12],

  [Symbol.iterator]: function* () {
    let octave = 0;
    while (true) {
      for (const interval of this.intervals) {
        yield this.root * Math.pow(2, (interval + octave * 12) / 12);
      }
      octave++;
    }
  }
};

// Iterate through frequencies infinitely
let i = 0;
for (const freq of scale) {
  console.log(freq);
  if (i++ > 16) break;  // First two octaves
}
```

### Private State

```javascript
const _state = Symbol('state');

class Sequencer {
  constructor(pattern) {
    this[_state] = {
      pattern,
      index: 0
    };
  }

  next() {
    const state = this[_state];
    const value = state.pattern[state.index % state.pattern.length];
    state.index++;
    return value;
  }
}

const seq = new Sequencer([0, 2, 4, 5, 7]);
console.log(seq.next());  // 0
console.log(seq.next());  // 2
// Can't access seq[_state] from outside
```

### Well-Known Symbols

```javascript
const rhythmPattern = {
  pattern: [1, 0, 1, 0, 1, 0, 0, 1],

  [Symbol.iterator]: function* () {
    let i = 0;
    while (true) {
      yield this.pattern[i % this.pattern.length];
      i++;
    }
  },

  [Symbol.toPrimitive]: function(hint) {
    if (hint === 'number') {
      return this.pattern.reduce((a, b) => a + b, 0);
    }
    return this.pattern.join('');
  }
};

console.log(+rhythmPattern);      // 4 (sum)
console.log(`${rhythmPattern}`);  // "10101001"
```

## 5. Tagged Template Literals

Create DSLs (Domain-Specific Languages) for music notation.

### Simple Music Notation

```javascript
function music(strings, ...values) {
  const notes = strings[0].trim().split(/\s+/);

  return notes.map(note => {
    const [pitch, duration = '4'] = note.split(':');
    return {
      freq: noteToFreq(pitch),
      duration: 4 / parseInt(duration)
    };
  });
}

function noteToFreq(note) {
  const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const match = note.match(/([A-G])([#b]?)(\d)/);

  let midi = notes[match[1]] + parseInt(match[3]) * 12 + 12;
  if (match[2] === '#') midi++;
  if (match[2] === 'b') midi--;

  return signal.mtof(midi);
}

// Beautiful notation!
const melody = music`C4:4 E4:4 G4:4 C5:2 G4:4 E4:4 C4:2`;

// Play sequence
melody.forEach((note, i) => {
  const startTime = melody.slice(0, i).reduce((sum, n) => sum + n.duration, 0);

  setTimeout(() => {
    signal(`melody-${i}`, t => {
      const elapsed = t - startTime;
      if (elapsed < 0 || elapsed > note.duration) return 0;

      const phase = elapsed / note.duration;
      return Math.sin(2 * Math.PI * note.freq * t) * signal.env.exp(phase, 5) * 0.2;
    });
  }, startTime * 1000);
});
```

### Rhythm Notation

```javascript
function rhythm(strings) {
  const pattern = strings[0].replace(/\s/g, '');

  return {
    pattern: pattern.split('').map(c => c === 'x' ? 1 : 0),
    length: pattern.length,

    [Symbol.iterator]: function* () {
      let i = 0;
      while (true) {
        yield this.pattern[i % this.pattern.length];
        i++;
      }
    }
  };
}

// Ascii rhythm notation!
const kick = rhythm`x . . . x . . .`;
const snare = rhythm`. . x . . . x .`;
const hihat = rhythm`x x x x x x x x`;

signal('drums', t => {
  const { index, phase } = step(t, 120, 8);

  const k = kick.pattern[index % kick.length];
  const s = snare.pattern[index % snare.length];
  const h = hihat.pattern[index % hihat.length];

  let sum = 0;

  if (k && phase < 0.1) {
    const f = 50 + 80 * env.exp(phase * 10, 20);
    sum += Math.sin(2 * Math.PI * f * t) * env.exp(phase * 10, 8);
  }

  if (s && phase < 0.15) {
    sum += (Math.random() * 2 - 1) * env.exp(phase * 6, 10) * 0.3;
  }

  if (h && phase < 0.05) {
    sum += (Math.random() * 2 - 1) * env.exp(phase * 20, 15) * 0.15;
  }

  return sum * 0.3;
});
```

### Scale DSL

```javascript
function scale(strings, ...values) {
  const [root, ...intervals] = values;
  const scaleName = strings[0].trim();

  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    pentatonic: [0, 2, 4, 7, 9, 12]
  };

  return {
    root,
    intervals: scales[scaleName],
    freq: (degree) => {
      const octave = Math.floor(degree / intervals.length);
      const index = degree % intervals.length;
      return root * Math.pow(2, (intervals[index] + octave * 12) / 12);
    }
  };
}

const myScale = scale`major ${440}`;
console.log(myScale.freq(0));  // 440 Hz
console.log(myScale.freq(2));  // E
```

## 6. WeakMap / WeakSet

Efficient caching and metadata without memory leaks.

### Sample Caching

```javascript
const sampleCache = new WeakMap();

function cachedSignal(sig) {
  if (!sampleCache.has(sig)) {
    sampleCache.set(sig, new Map());
  }

  const cache = sampleCache.get(sig);

  return {
    eval: t => {
      const key = Math.round(t * 48000);
      if (cache.has(key)) {
        return cache.get(key);
      }

      const value = sig.eval(t);
      cache.set(key, value);
      return value;
    }
  };
}

// Expensive computation cached per-signal
const expensive = signal.sin(440);
const cached = cachedSignal(expensive);
```

### Signal Metadata

```javascript
const metadata = new WeakMap();

function annotate(signal, info) {
  metadata.set(signal, info);
  return signal;
}

function getInfo(signal) {
  return metadata.get(signal) || {};
}

// Attach metadata without modifying signal
const bass = annotate(
  signal.sin(110),
  { name: 'bass', color: '#FF0000', volume: 0.8 }
);

console.log(getInfo(bass));  // { name: 'bass', ... }
```

## 7. Reflect

Metaprogramming and introspection.

### Dynamic Signal Construction

```javascript
const SignalFactory = {
  create(spec) {
    const { type, freq, effects = [] } = spec;

    let sig = signal[type](freq);

    effects.forEach(effect => {
      sig = Reflect.apply(sig[effect.name], sig, effect.args);
    });

    return sig;
  }
};

// Build from data
const spec = {
  type: 'sin',
  freq: 440,
  effects: [
    { name: 'gain', args: [0.5] },
    { name: 'clip', args: [0.8] }
  ]
};

const dynamic = SignalFactory.create(spec);
signal('dynamic', dynamic.fn);
```

### Property Validation

```javascript
class ValidatedSignal {
  constructor(freq) {
    return new Proxy(this, {
      set(target, prop, value) {
        if (prop === 'freq' && (value < 20 || value > 20000)) {
          throw new Error('Frequency out of audible range');
        }
        return Reflect.set(target, prop, value);
      }
    });
  }
}
```

## 8. Destructuring and Spread

Elegant pattern matching and data manipulation.

### Pattern Matching

```javascript
function playChord({ root, type = 'major', octave = 4 }) {
  const chords = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dim: [0, 3, 6]
  };

  const intervals = chords[type];
  const baseFreq = signal.mtof(root + octave * 12);

  return intervals.map(interval => {
    const freq = baseFreq * Math.pow(2, interval / 12);
    return signal.sin(freq);
  });
}

const chord = playChord({ root: 60, type: 'minor' });
```

### Voice Leading

```javascript
function voiceLead(...chords) {
  return chords.reduce((result, chord, i) => {
    if (i === 0) return [chord];

    const prev = result[i - 1];
    const optimized = chord.sort((a, b) => {
      const distA = Math.min(...prev.map(p => Math.abs(p - a)));
      const distB = Math.min(...prev.map(p => Math.abs(p - b)));
      return distA - distB;
    });

    return [...result, optimized];
  }, []);
}

const progression = voiceLead(
  [60, 64, 67],  // C major
  [62, 65, 69],  // D minor
  [65, 69, 72]   // F major
);
```

## 9. Optional Chaining and Nullish Coalescing

Safe property access for data-driven music.

### Safe MIDI Processing

```javascript
function processMidiEvent(event) {
  const velocity = event?.data?.[2] ?? 100;
  const note = event?.data?.[1] ?? 60;
  const channel = event?.data?.[0] & 0x0F;

  if (channel === 0) {
    const freq = signal.mtof(note);
    const gain = velocity / 127;

    signal(`midi-${note}`, t => {
      return Math.sin(2 * Math.PI * freq * t) * gain * 0.3;
    });
  }
}
```

## 10. BigInt

Precise timing and rhythm calculations.

```javascript
// Exact beat calculations without floating point errors
const PPQN = 960n;  // Pulses Per Quarter Note

function beatToTicks(beat, ppqn = PPQN) {
  return BigInt(Math.floor(beat * Number(ppqn)));
}

function ticksToBeat(ticks, ppqn = PPQN) {
  return Number(ticks) / Number(ppqn);
}

// Precise rhythm grid
const sixteenthNote = PPQN / 4n;
const timeline = Array(16).fill(0).map((_, i) =>
  ticksToBeat(BigInt(i) * sixteenthNote)
);
```

## Complete Example: Combining Features

```javascript
const signal = require('@rolandnsharp/signal');
const { step, freq, scales, env } = signal;

// 1. Generator for pattern
function* markovMelody() {
  const transitions = {
    0: [0, 2, 4],
    2: [0, 4, 7],
    4: [2, 5, 7],
    5: [4, 7],
    7: [0, 5]
  };

  let current = 0;
  while (true) {
    yield current;
    const options = transitions[current];
    current = options[Math.floor(Math.random() * options.length)];
  }
}

// 2. Proxy for auto-oscillators
const osc = new Proxy({}, {
  get(target, prop) {
    if (!target[prop]) {
      target[prop] = signal.sin(parseFloat(prop));
    }
    return target[prop];
  }
});

// 3. Tagged template for rhythm
function beat(strings) {
  return strings[0].split('').map(c => c === 'x' ? 1 : 0);
}

const pattern = beat`x.x.x..x`;

// 4. Put it all together
const melody = markovMelody();

signal('advanced', t => {
  const { index, phase } = step(t, 120, 8);

  // Get next note from generator
  const degree = melody.next().value;
  const f = freq(330, scales.minor, degree);

  // Check rhythm pattern
  const trigger = pattern[index % pattern.length];
  if (!trigger) return 0;

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.2;
});
```

## Philosophy

Signal is more than an audio library - it's a showcase of JavaScript's expressiveness. Every language feature becomes a musical tool:

- **Generators** → Infinite patterns
- **Proxies** → Reactive synthesis
- **Symbols** → Custom protocols
- **Templates** → Music DSLs
- **Async** → Timeline control
- **WeakMaps** → Efficient caching
- **Reflect** → Metaprogramming

This makes Signal both:
1. A creative music tool
2. An advanced JavaScript course

Learn computer science by making music!

## Further Reading

- [Y-COMBINATOR-MUSIC.md](./Y-COMBINATOR-MUSIC.md) - Lambda calculus for music
- [GENERATIVE-SEQUENCES.md](./GENERATIVE-SEQUENCES.md) - Lazy evaluation patterns
- [STATE-AND-RECURSION.md](./STATE-AND-RECURSION.md) - Functional approaches

## External Resources

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Scribbletune](https://github.com/scribbletune/scribbletune) - Music with arrays and strings
- [Flocking](https://flockingjs.org/) - Declarative audio synthesis
