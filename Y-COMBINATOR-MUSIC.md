# Y Combinator and Fixed-Point Combinators for Music Generation

## Introduction

The Y combinator is a higher-order function from lambda calculus that enables recursion without explicit self-reference. In music generation, this creates elegant self-similar structures, fractals, and algorithmic compositions that emerge naturally from pure functional transformations.

**Why this matters for Kanon:**
- Pure functional - no state or mutation
- Mathematical elegance - lambda calculus meets music theory
- Self-similar structures - fractals emerge naturally
- Teaches fundamental computer science concepts through music

## The Y Combinator

### Mathematical Definition

In lambda calculus:
```
Y = λf.(λx.f(x x))(λx.f(x x))
```

### JavaScript Implementation

```javascript
// Classic Y combinator
const Y = f => (x => f(v => x(x)(v)))(x => f(v => x(x)(v)));

// More readable version
const Y = makeRecursive => {
  const wrapper = recursiveFunc => makeRecursive(
    (...args) => recursiveFunc(recursiveFunc)(...args)
  );
  return wrapper(wrapper);
};

// Usage - factorial without self-reference
const factorial = Y(recurse => n =>
  n === 0 ? 1 : n * recurse(n - 1)
);

console.log(factorial(5));  // 120
```

### Z Combinator (Strict Evaluation)

JavaScript uses strict evaluation, so the Z combinator works better:

```javascript
// Z combinator for strict languages
const Z = f => (x => f(v => x(x)(v)))(x => f(v => x(x)(v)));

// Or with explicit laziness
const Z = f => (
  (x => a => f(x(x))(a))
  (x => a => f(x(x))(a))
);
```

## 1. Fractal Melodies

Self-similar melodic structures that repeat at different scales.

```javascript
const signal = require('@rolandnsharp/kanon');
const { freq, scales, env, step } = signal;

// Fractal melody generator
const fractalMelody = Y(recurse => (depth, intervals, root = 0) => {
  if (depth === 0) return [root];

  const subPattern = recurse(depth - 1, intervals, root);
  return intervals.flatMap(interval =>
    subPattern.map(note => note + interval)
  );
});

// Generate: [0] -> [0,2,4] -> [0,2,4,2,4,6,4,6,8] -> ...
const pattern = fractalMelody(3, [0, 2, 4], 0);

signal('fractal', t => {
  const { index, phase } = step(t, 120, 16);
  const degree = pattern[index % pattern.length];
  const f = freq(220, scales.major, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.15;
});
```

### Variations

```javascript
// Golden ratio fractal
const goldenFractal = Y(recurse => (depth, ratio = 1.618) => {
  if (depth === 0) return [0];

  const prev = recurse(depth - 1, ratio);
  return prev.flatMap(note => [note, note + Math.log2(ratio) * 12]);
});

// Harmonic fractal (overtone series)
const harmonicFractal = Y(recurse => (depth, fundamental = 110) => {
  if (depth === 0) return [fundamental];

  const prev = recurse(depth - 1, fundamental);
  return prev.flatMap(f => [f, f * 2, f * 3]);
});
```

## 2. L-Systems (Lindenmayer Systems)

Formal grammars for generating self-similar structures.

```javascript
// L-System generator with Y combinator
const lSystem = Y(recurse => (rules, axiom, depth) => {
  if (depth === 0) return axiom;

  const expanded = axiom.split('').map(symbol =>
    rules[symbol] || symbol
  ).join('');

  return recurse(rules, expanded, depth - 1);
});

// Algae L-System: A → AB, B → A
const algae = lSystem({ A: 'AB', B: 'A' }, 'A', 6);
// Generates: "ABAABABAABAABABAABABAABAAB"

// Musical interpretation
const symbolToNote = { A: 0, B: 4, C: 7 };

signal('lsystem-melody', t => {
  const { index, phase } = step(t, 100, 8);
  const symbol = algae[index % algae.length];
  const degree = symbolToNote[symbol] || 0;
  const f = freq(330, scales.minor, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.2;
});

// Dragon curve rhythm
const dragon = lSystem({
  L: 'L+R+',
  R: '-L-R'
}, 'L', 8);

signal('dragon-rhythm', t => {
  const { index, phase } = step(t, 140, 16);
  const symbol = dragon[index % dragon.length];

  // '+' = hit, '-' = rest, 'L'/'R' = timbral variations
  if (symbol === '+') {
    const f = 200;
    return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 10) * 0.3;
  } else if (symbol === 'L' && Math.random() > 0.7) {
    const f = 150;
    return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 8) * 0.2;
  }

  return 0;
});

// Plant L-System for complex structures
const plant = lSystem({
  X: 'F+[[X]-X]-F[-FX]+X',
  F: 'FF'
}, 'X', 4);

// Interpret as pitch and rhythm
signal('plant-music', t => {
  const { index, phase } = step(t, 90, 16);
  const symbol = plant[index % plant.length];

  const actions = {
    F: () => Math.sin(2 * Math.PI * 440 * t) * env.exp(phase, 5),
    '+': () => Math.sin(2 * Math.PI * 550 * t) * env.exp(phase, 5),
    '-': () => Math.sin(2 * Math.PI * 330 * t) * env.exp(phase, 5),
    '[': () => 0,
    ']': () => 0,
    X: () => Math.sin(2 * Math.PI * 660 * t) * env.exp(phase, 3)
  };

  const action = actions[symbol] || (() => 0);
  return action() * 0.15;
});
```

## 3. Recursive Rhythm Subdivision

Hierarchical rhythm structures.

```javascript
// Subdivide rhythm tree
const subdivideRhythm = Y(recurse => (depth, pattern) => {
  if (depth === 0) return pattern;

  return pattern.flatMap(beat =>
    beat === 1
      ? recurse(depth - 1, [1, 0, 1, 0])  // Subdivide hits
      : [0, 0, 0, 0]                       // Keep rests
  );
});

const rhythm = subdivideRhythm(2, [1, 0, 1, 0]);
// [1,0,1,0] -> [1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0] -> ...

signal('recursive-rhythm', t => {
  const { index, phase } = step(t, 140, 32);
  const trigger = rhythm[index % rhythm.length];

  if (!trigger || phase > 0.1) return 0;

  const pitchEnv = 50 + 80 * env.exp(phase * 10, 20);
  return Math.sin(2 * Math.PI * pitchEnv * t) * env.exp(phase * 10, 8) * 0.4;
});

// Binary tree subdivision
const binaryRhythm = Y(recurse => (depth, density = 0.7) => {
  if (depth === 0) return Math.random() < density ? 1 : 0;

  return [
    recurse(depth - 1, density * 0.9),
    recurse(depth - 1, density * 0.9)
  ];
});

const flattenRhythm = Y(recurse => arr => {
  if (typeof arr === 'number') return [arr];
  return arr.flatMap(item => recurse(item));
});

const treeRhythm = flattenRhythm(binaryRhythm(5, 0.6));
```

## 4. Canonic Imitation

Multiple voices in canon (like "Row, Row, Row Your Boat").

```javascript
// Generate canonic voices
const canon = Y(recurse => (melody, voices, delay) => {
  if (voices === 1) return [melody];

  const previousVoices = recurse(melody, voices - 1, delay);
  const newVoice = melody.map(note => ({
    ...note,
    time: note.time + delay * (voices - 1)
  }));

  return [...previousVoices, newVoice];
});

// Create 4-voice canon
const melody = [
  { degree: 0, duration: 0.5 },
  { degree: 2, duration: 0.5 },
  { degree: 4, duration: 0.5 },
  { degree: 5, duration: 0.5 },
  { degree: 7, duration: 1.0 }
];

const voices = canon(
  melody.map((n, i) => ({ ...n, time: i * 0.5 })),
  4,
  1.0
);

// Render each voice
voices.forEach((voice, i) => {
  signal(`canon-${i}`, t => {
    const currentNote = voice.find(note =>
      t >= note.time && t < note.time + note.duration
    );

    if (!currentNote) return 0;

    const notePhase = (t - currentNote.time) / currentNote.duration;
    const f = freq(220 * (i * 0.5 + 1), scales.major, currentNote.degree);

    return Math.sin(2 * Math.PI * f * t) * env.exp(notePhase, 5) * 0.08;
  });
});

// Retrograde canon (crab canon)
const retrograde = Y(recurse => (melody, voices) => {
  if (voices === 0) return [];

  const forward = melody;
  const backward = [...melody].reverse().map((n, i) => ({
    ...n,
    time: i * 0.5
  }));

  return [forward, backward, ...recurse(melody, voices - 2)];
});
```

## 5. Recursive Harmonic Series

Additive synthesis with recursive overtone generation.

```javascript
// Generate harmonic series
const harmonics = Y(recurse => (fundamental, n, max) => {
  if (n > max) return [];

  const amplitude = 1 / n;  // Natural decay
  const freq = fundamental * n;

  return [
    { freq, amp: amplitude },
    ...recurse(fundamental, n + 1, max)
  ];
});

// Additive synthesis
signal('additive', t => {
  const partials = harmonics(110, 1, 16);

  return partials.reduce((sum, partial) => {
    return sum + Math.sin(2 * Math.PI * partial.freq * t) * partial.amp;
  }, 0) * 0.12;
});

// Inharmonic series (spectral)
const inharmonics = Y(recurse => (fundamental, n, max, stretch = 1.02) => {
  if (n > max) return [];

  const freq = fundamental * Math.pow(n, stretch);
  const amp = 1 / Math.pow(n, 1.5);

  return [
    { freq, amp },
    ...recurse(fundamental, n + 1, max, stretch)
  ];
});

signal('bell', t => {
  const partials = inharmonics(200, 1, 12, 1.05);
  const decay = Math.exp(-t * 0.5);

  return partials.reduce((sum, partial) => {
    return sum + Math.sin(2 * Math.PI * partial.freq * t) * partial.amp;
  }, 0) * decay * 0.15;
});
```

## 6. Mutually Recursive Voices

Two or more voices that respond to each other.

```javascript
// Musical conversation without explicit mutual reference
const conversation = Y(recurse => state => {
  const { t, lastA, lastB, history } = state;

  if (history.length > 32) return history;

  // Voice A responds to B (inverse motion)
  const noteA = (7 - lastB) % 7;

  // Voice B responds to A (parallel motion up)
  const noteB = (lastA + 2) % 7;

  return recurse({
    t: t + 0.5,
    lastA: noteA,
    lastB: noteB,
    history: [...history, { time: t, voiceA: noteA, voiceB: noteB }]
  });
});

const dialogue = conversation({ t: 0, lastA: 0, lastB: 4, history: [] });

signal('voice-a', t => {
  const event = dialogue.find(e =>
    Math.floor(t / 0.5) === Math.floor(e.time / 0.5)
  );

  if (!event) return 0;

  const phase = (t % 0.5) / 0.5;
  const f = freq(330, scales.minor, event.voiceA);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.12;
});

signal('voice-b', t => {
  const event = dialogue.find(e =>
    Math.floor(t / 0.5) === Math.floor(e.time / 0.5)
  );

  if (!event) return 0;

  const phase = (t % 0.5) / 0.5;
  const f = freq(220, scales.minor, event.voiceB);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.12;
});

// Three-way conversation
const trialogue = Y(recurse => state => {
  const { t, a, b, c, history } = state;

  if (history.length > 24) return history;

  // A responds to B+C
  const nextA = ((b + c) / 2) % 7;
  // B responds to C+A
  const nextB = ((c + a) / 2) % 7;
  // C responds to A+B
  const nextC = ((a + b) / 2) % 7;

  return recurse({
    t: t + 0.33,
    a: Math.round(nextA),
    b: Math.round(nextB),
    c: Math.round(nextC),
    history: [...history, { time: t, a, b, c }]
  });
});
```

## 7. Fibonacci and Mathematical Sequences

Classic number sequences for rhythm and pitch.

```javascript
// Fibonacci with Y combinator
const fib = Y(recurse => n => {
  if (n <= 1) return n;
  return recurse(n - 1) + recurse(n - 2);
});

// Generate sequence
const fibSeq = Array(12).fill().map((_, i) => fib(i));
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// Fibonacci rhythm
signal('fibonacci-rhythm', t => {
  const cycleTime = 8;  // 8 second cycle
  const progress = (t % cycleTime) / cycleTime;
  const totalBeats = fibSeq.reduce((a, b) => a + b, 0);
  const beatTime = progress * totalBeats;

  let accumulated = 0;
  for (let i = 0; i < fibSeq.length; i++) {
    accumulated += fibSeq[i];

    const distance = Math.abs(beatTime - accumulated);
    if (distance < 0.2) {
      const phase = distance / 0.2;
      return Math.sin(2 * Math.PI * 440 * t) * env.exp(phase, 8) * 0.25;
    }
  }

  return 0;
});

// Fibonacci melody (map to scale degrees)
signal('fibonacci-melody', t => {
  const { index, phase } = step(t, 100, 8);
  const degree = fibSeq[index % fibSeq.length] % 7;
  const f = freq(220, scales.major, degree);

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.18;
});

// Collatz conjecture rhythm (3n+1 problem)
const collatz = Y(recurse => n => {
  if (n === 1) return [1];
  if (n % 2 === 0) return [n, ...recurse(n / 2)];
  return [n, ...recurse(3 * n + 1)];
});

const collatzSeq = collatz(27);  // [27, 82, 41, 124, 62, 31, ...]
```

## 8. Tree Structures and Hierarchies

Musical phrase trees and nested structures.

```javascript
// Binary tree of musical phrases
const phraseTree = Y(recurse => (depth, notePool) => {
  if (depth === 0) {
    return notePool[Math.floor(Math.random() * notePool.length)];
  }

  return {
    left: recurse(depth - 1, notePool),
    right: recurse(depth - 1, notePool),
    value: notePool[Math.floor(Math.random() * notePool.length)]
  };
});

// Traverse tree in different orders
const inorder = Y(recurse => node => {
  if (typeof node === 'number') return [node];
  return [
    ...recurse(node.left),
    node.value,
    ...recurse(node.right)
  ];
});

const preorder = Y(recurse => node => {
  if (typeof node === 'number') return [node];
  return [
    node.value,
    ...recurse(node.left),
    ...recurse(node.right)
  ];
});

const postorder = Y(recurse => node => {
  if (typeof node === 'number') return [node];
  return [
    ...recurse(node.left),
    ...recurse(node.right),
    node.value
  ];
});

// Generate and play different traversals
const tree = phraseTree(3, [0, 2, 4, 5, 7]);

const inorderMelody = inorder(tree);
const preorderMelody = preorder(tree);
const postorderMelody = postorder(tree);

signal('tree-inorder', t => {
  const { index, phase } = step(t, 100, 8);
  const degree = inorderMelody[index % inorderMelody.length];
  const f = freq(220, scales.major, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
});
```

## 9. Chaos and Strange Attractors

Deterministic chaos for organic-sounding patterns.

```javascript
// Logistic map (chaotic)
const logisticMap = Y(recurse => (x, r, n) => {
  if (n === 0) return [];
  const next = r * x * (1 - x);
  return [next, ...recurse(next, r, n - 1)];
});

// Generate chaotic sequence
const chaos = logisticMap(0.1, 3.9, 100);

// Map to musical parameters
signal('chaos-melody', t => {
  const { index, phase } = step(t, 120, 16);
  const chaosValue = chaos[index % chaos.length];

  // Map [0,1] to scale degree [0,7]
  const degree = Math.floor(chaosValue * 7);
  const f = freq(330, scales.minor, degree);

  // Also use for dynamics
  const amplitude = 0.1 + chaosValue * 0.2;

  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * amplitude;
});

// Hénon map (2D attractor)
const henon = Y(recurse => (state, n) => {
  if (n === 0) return [];

  const { x, y } = state;
  const nextX = 1 - 1.4 * x * x + y;
  const nextY = 0.3 * x;

  return [
    { x: nextX, y: nextY },
    ...recurse({ x: nextX, y: nextY }, n - 1)
  ];
});

const attractor = henon({ x: 0, y: 0 }, 200);

signal('attractor-stereo', {
  left: t => {
    const { index, phase } = step(t, 90, 16);
    const point = attractor[index % attractor.length];
    const freq = 220 + point.x * 220;  // Map x to frequency
    return Math.sin(2 * Math.PI * freq * t) * env.exp(phase, 6) * 0.15;
  },
  right: t => {
    const { index, phase } = step(t, 90, 16);
    const point = attractor[index % attractor.length];
    const freq = 330 + point.y * 220;  // Map y to frequency
    return Math.sin(2 * Math.PI * freq * t) * env.exp(phase, 6) * 0.15;
  }
});
```

## 10. Recursive Phase Accumulation

Even FM synthesis can use Y combinator (though memoization is better in practice).

```javascript
// Recursive phase with Y combinator (educational example)
const recursivePhase = Y(recurse => (t, freq, dt = 1/48000) => {
  if (t <= dt) return 0;
  return recurse(t - dt, freq, dt) + (freq * dt);
});

// This would be too slow in practice without memoization,
// but shows the mathematical purity

// More practical: use Y combinator for frequency function generation
const frequencyEnvelope = Y(recurse => (type, params) => {
  const envelopes = {
    exponential: (t) => {
      const { f0, f1, decay } = params;
      return f1 + (f0 - f1) * Math.exp(-decay * t);
    },
    linear: (t) => {
      const { f0, f1, duration } = params;
      const progress = Math.min(t / duration, 1);
      return f0 + (f1 - f0) * progress;
    },
    recursive: (t) => {
      if (t <= 0) return params.f0;
      return params.f0 + recurse('linear', {
        f0: 0,
        f1: params.f1 - params.f0,
        duration: params.duration
      })(t);
    }
  };

  return envelopes[type];
});
```

## Practical Utilities

Helper functions for musical Y combinator usage:

```javascript
// Memoized Y combinator (for performance)
const memoY = f => {
  const cache = new Map();
  const recurse = (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = f(recurse)(...args);
    cache.set(key, result);
    return result;
  };
  return recurse;
};

// Trampolined Y combinator (avoids stack overflow)
const trampolineY = f => {
  const recurse = (...args) => ({ bounce: true, fn: f(recurse), args });

  return (...initialArgs) => {
    let result = recurse(...initialArgs);
    while (result && result.bounce) {
      result = result.fn(...result.args);
    }
    return result;
  };
};

// Usage
const deepFib = trampolineY(recurse => n => {
  if (n <= 1) return n;
  return recurse(n - 1) + recurse(n - 2);
});
```

## Complete Musical Examples

### Example 1: Self-Similar Composition

```javascript
const signal = require('@rolandnsharp/kanon');
const { freq, scales, env, step } = signal;

// Multi-level fractal composition
const fractalComposition = Y(recurse => (depth, motif) => {
  if (depth === 0) return motif;

  const expanded = motif.flatMap(note => [
    note,
    { ...note, degree: note.degree + 2, duration: note.duration / 2 },
    { ...note, degree: note.degree + 4, duration: note.duration / 2 }
  ]);

  return recurse(depth - 1, expanded);
});

const motif = [
  { degree: 0, duration: 1 },
  { degree: 2, duration: 1 }
];

const piece = fractalComposition(2, motif);

// Play with proper timing
let currentTime = 0;
piece.forEach(note => {
  setTimeout(() => {
    signal(`note-${currentTime}`, t => {
      const elapsed = t - currentTime;
      if (elapsed > note.duration || elapsed < 0) return 0;

      const phase = elapsed / note.duration;
      const f = freq(330, scales.major, note.degree);
      return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
    });
  }, currentTime * 1000);

  currentTime += note.duration;
});
```

### Example 2: Recursive Counterpoint

```javascript
// Generate counterpoint using species rules
const counterpoint = Y(recurse => (cantusFirmus, index = 0) => {
  if (index >= cantusFirmus.length) return [];

  const cf = cantusFirmus[index];

  // First species: note against note
  // Prefer consonant intervals (P1, P5, P8, M3, m3, M6, m6)
  const consonances = [0, 3, 4, 7, 8, 9, 12];
  const cp = consonances[Math.floor(Math.random() * consonances.length)];

  return [cf + cp, ...recurse(cantusFirmus, index + 1)];
});

const cf = [0, 2, 4, 5, 4, 2, 0];  // Cantus firmus
const cp = counterpoint(cf);        // Counter melody

// Play both voices
signal('cantus', t => {
  const { index, phase } = step(t, 80, 4);
  const degree = cf[index % cf.length];
  const f = freq(220, scales.major, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
});

signal('counter', t => {
  const { index, phase } = step(t, 80, 4);
  const degree = cp[index % cp.length];
  const f = freq(220, scales.major, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.15;
});
```

## Philosophical Notes

**Why Y combinators for music?**

1. **Mathematical Beauty**: Music and mathematics are deeply connected. The Y combinator shows this elegance.

2. **Structural Self-Similarity**: Real music often has self-similar structures - themes, variations, fractals.

3. **Pure Functional**: No state, no mutation - just transformations. Aligns with Signal's philosophy.

4. **Educational**: Teaches lambda calculus, recursion theory, and computer science fundamentals through creative output.

5. **Generative**: Small rules create complex emergent behavior - the essence of algorithmic composition.

**Historical Context**: Composers have used recursive structures for centuries - canons, fugues, and variations are all recursive transformations. The Y combinator gives us a formal tool for these ancient techniques.

## Further Reading

- Lambda calculus and fixed-point combinators
- Fractal geometry in music (Xenakis, Ligeti)
- L-Systems in algorithmic composition
- Self-similar structures in Bach's music
- Chaos theory and music generation

## Related Documentation

- [JAVASCRIPT-FEATURES.md](./JAVASCRIPT-FEATURES.md) - Other JS features for music
- [GENERATIVE-SEQUENCES.md](./GENERATIVE-SEQUENCES.md) - Lazy sequences and generators
- [STATE-AND-RECURSION.md](./STATE-AND-RECURSION.md) - Pure functional approaches
