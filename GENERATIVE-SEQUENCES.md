# Generative Music with Lazy Sequences

## Introduction

Lazy sequences are infinite data structures that compute values on-demand. For music, this means patterns that never end, algorithms that evolve forever, and compositions that emerge from simple rules - all without computing everything upfront.

**Why lazy sequences for music?**
- Infinite patterns without infinite memory
- Compose transformations without executing them
- Declarative - describe what you want, not how to compute it
- Elegant and expressive code
- Natural fit for music's temporal nature

## Lazy Evaluation Fundamentals

### Eager vs Lazy

```javascript
// Eager - computes everything immediately
const eager = Array(1000).fill(0).map((_, i) => i * 2);
// Memory: 1000 numbers stored

// Lazy - computes on demand
function* lazy() {
  let i = 0;
  while (true) {
    yield i * 2;
    i++;
  }
}
// Memory: just the current state
```

### Why This Matters for Music

Music is inherently infinite - a beat pattern could repeat forever, a melody could evolve endlessly. Lazy sequences let us work with infinity naturally.

```javascript
// This melody never ends
function* infiniteMelody() {
  const pattern = [0, 2, 4, 5, 7, 5, 4, 2];
  let i = 0;
  while (true) {
    yield pattern[i % pattern.length];
    i++;
  }
}
```

## Generator Functions: The Foundation

### Basic Generators

```javascript
// Infinite counter
function* counter(start = 0, step = 1) {
  let n = start;
  while (true) {
    yield n;
    n += step;
  }
}

// Infinite cycle
function* cycle(array) {
  let i = 0;
  while (true) {
    yield array[i % array.length];
    i++;
  }
}

// Infinite repeat
function* repeat(value) {
  while (true) {
    yield value;
  }
}

// Usage
const beats = cycle([1, 0, 1, 0]);
for (let i = 0; i < 8; i++) {
  console.log(beats.next().value);  // 1, 0, 1, 0, 1, 0, 1, 0
}
```

### Generator Combinators

Build complex patterns from simple ones:

```javascript
// Map - transform each value
function* map(gen, fn) {
  for (const value of gen) {
    yield fn(value);
  }
}

// Filter - keep only matching values
function* filter(gen, predicate) {
  for (const value of gen) {
    if (predicate(value)) {
      yield value;
    }
  }
}

// Take - limit to n values
function* take(gen, n) {
  let i = 0;
  for (const value of gen) {
    if (i++ >= n) break;
    yield value;
  }
}

// Skip - skip n values
function* skip(gen, n) {
  let i = 0;
  for (const value of gen) {
    if (i++ >= n) {
      yield value;
    }
  }
}

// Zip - combine two generators
function* zip(gen1, gen2) {
  while (true) {
    const a = gen1.next();
    const b = gen2.next();
    if (a.done || b.done) break;
    yield [a.value, b.value];
  }
}

// Chain - concatenate generators
function* chain(...generators) {
  for (const gen of generators) {
    yield* gen;
  }
}
```

### Composition Example

```javascript
const signal = require('@rolandnsharp/signal');
const { step, freq, scales, env } = signal;

// Start with infinite pattern
const pattern = cycle([0, 2, 4, 5, 7, 9, 11, 12]);

// Transform it
const transposed = map(pattern, n => n + 5);
const oddOnly = filter(transposed, n => n % 2 === 1);
const limited = take(oddOnly, 16);

// Convert to array for use
const melody = Array.from(limited);

signal('composed', t => {
  const { index, phase } = step(t, 100, 8);
  const degree = melody[index % melody.length];
  const f = freq(330, scales.major, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.18;
});
```

## Euclidean Rhythms

Distribute pulses evenly across steps - the Euclidean algorithm.

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

// Common patterns
const clave = euclidean(5, 8);   // Cuban clave
const shiko = euclidean(7, 12);  // West African bell pattern
const bossa = euclidean(5, 16);  // Bossa nova

signal('euclidean-drums', t => {
  const { index, phase } = step(t, 120, 16);

  const kick = euclidean(4, 16);
  const snare = euclidean(3, 16);
  const hihat = euclidean(7, 16);

  let sum = 0;

  // Advance generators to current position
  for (let i = 0; i <= index; i++) {
    if (i === Math.floor(index)) {
      if (kick.next().value && phase < 0.1) {
        const f = 50 + 80 * env.exp(phase * 10, 20);
        sum += Math.sin(2 * Math.PI * f * t) * env.exp(phase * 10, 8) * 0.5;
      }

      if (snare.next().value && phase < 0.15) {
        sum += (Math.random() * 2 - 1) * env.exp(phase * 7, 10) * 0.3;
      }

      if (hihat.next().value && phase < 0.05) {
        sum += (Math.random() * 2 - 1) * env.exp(phase * 20, 15) * 0.15;
      }
    }
  }

  return sum * 0.3;
});

// Rotate pattern
function* rotate(gen, amount) {
  const buffer = [];
  for (let i = 0; i < amount; i++) {
    buffer.push(gen.next().value);
  }

  let i = 0;
  while (true) {
    yield buffer[i % buffer.length];
    i++;
  }
}

const rotated = rotate(euclidean(5, 8), 3);
```

## Markov Chains

State machines for generative melodies.

```javascript
function* markovChain(transitions, start, random = Math.random) {
  let current = start;

  while (true) {
    yield current;

    const options = transitions[current];
    if (!options || options.length === 0) break;

    // Weighted random selection
    const totalWeight = options.reduce((sum, opt) =>
      sum + (opt.weight || 1), 0
    );
    let rand = random() * totalWeight;

    for (const option of options) {
      rand -= option.weight || 1;
      if (rand <= 0) {
        current = option.next;
        break;
      }
    }
  }
}

// First-order Markov chain (depends on current state)
const simpleTransitions = {
  0: [{ next: 0 }, { next: 2 }, { next: 4 }],
  2: [{ next: 0 }, { next: 4 }, { next: 7 }],
  4: [{ next: 2 }, { next: 5 }, { next: 7 }],
  5: [{ next: 4 }, { next: 7 }],
  7: [{ next: 0 }, { next: 5 }]
};

const melody = markovChain(simpleTransitions, 0);

// Weighted transitions
const weightedTransitions = {
  'C': [
    { next: 'C', weight: 2 },  // Stay on C
    { next: 'G', weight: 3 },  // Go to G (dominant)
    { next: 'F', weight: 2 },  // Go to F (subdominant)
    { next: 'Am', weight: 1 }  // Go to Am (relative minor)
  ],
  'G': [
    { next: 'C', weight: 4 },  // Strong pull to C
    { next: 'G', weight: 1 }
  ],
  'F': [
    { next: 'C', weight: 3 },
    { next: 'G', weight: 2 }
  ],
  'Am': [
    { next: 'F', weight: 2 },
    { next: 'G', weight: 2 }
  ]
};

const progression = markovChain(weightedTransitions, 'C');

// Second-order Markov (depends on last two states)
function* markov2(transitions, state1, state2) {
  let prev = state1;
  let current = state2;

  while (true) {
    yield current;

    const key = `${prev}-${current}`;
    const options = transitions[key] || [];
    if (options.length === 0) break;

    const next = options[Math.floor(Math.random() * options.length)];
    prev = current;
    current = next;
  }
}

const secondOrder = {
  '0-2': [4, 2, 7],
  '2-4': [5, 7, 2],
  '4-5': [7, 4],
  '5-7': [0, 5],
  '7-0': [2, 0]
};
```

## Random Walks

Stochastic melodies with boundaries.

```javascript
function* randomWalk(start = 0, stepSize = 1, min = -Infinity, max = Infinity) {
  let position = start;

  while (true) {
    yield position;

    const direction = Math.random() > 0.5 ? 1 : -1;
    position += direction * stepSize;
    position = Math.max(min, Math.min(max, position));
  }
}

// Bounded walk
const walk = randomWalk(0, 2, -12, 12);

// Biased walk (tendency upward)
function* biasedWalk(start, bias = 0.5, step = 1, min = -12, max = 12) {
  let position = start;

  while (true) {
    yield position;

    const direction = Math.random() > bias ? 1 : -1;
    position += direction * step;
    position = Math.max(min, Math.min(max, position));
  }
}

// Brownian motion (variable step size)
function* brownianWalk(start, variance = 1, min = -12, max = 12) {
  let position = start;

  while (true) {
    yield position;

    // Normal distribution approximation
    const step = (Math.random() + Math.random() + Math.random() - 1.5) * variance;
    position += step;
    position = Math.max(min, Math.min(max, position));
  }
}

signal('random-walk', t => {
  const { index, phase } = step(t, 90, 8);

  const walker = randomWalk(0, 1, -7, 7);

  // Advance to current position
  let degree;
  for (let i = 0; i <= index; i++) {
    degree = walker.next().value;
  }

  const f = freq(440, scales.minor, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.18;
});
```

## Cellular Automata

Patterns emerging from simple rules (like Conway's Game of Life).

```javascript
function* rule30(initial = [1]) {
  let state = initial;

  while (true) {
    yield state;

    const newState = new Array(state.length + 2).fill(0);

    for (let i = 0; i < state.length; i++) {
      const left = i > 0 ? state[i - 1] : 0;
      const center = state[i];
      const right = i < state.length - 1 ? state[i + 1] : 0;

      // Rule 30: 00011110 in binary
      const neighborhood = (left << 2) | (center << 1) | right;
      newState[i + 1] = (30 >> neighborhood) & 1;
    }

    state = newState;
  }
}

// Use cellular automaton for rhythm
const ca = rule30([0, 0, 0, 0, 1, 0, 0, 0, 0]);

signal('cellular', t => {
  const { index, phase } = step(t, 140, 16);

  // Get current generation
  let generation;
  for (let i = 0; i <= Math.floor(index / 8); i++) {
    generation = ca.next().value;
  }

  const trigger = generation[index % generation.length];
  if (!trigger || phase > 0.1) return 0;

  return Math.sin(2 * Math.PI * 200 * t) * env.exp(phase, 10) * 0.3;
});

// Game of Life rhythm
function* gameOfLife(initial) {
  let grid = initial;

  while (true) {
    yield grid;

    const next = grid.map((row, y) =>
      row.map((cell, x) => {
        const neighbors = countNeighbors(grid, x, y);
        if (cell === 1) {
          return neighbors === 2 || neighbors === 3 ? 1 : 0;
        } else {
          return neighbors === 3 ? 1 : 0;
        }
      })
    );

    grid = next;
  }
}

function countNeighbors(grid, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const ny = y + dy;
      const nx = x + dx;
      if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
        count += grid[ny][nx];
      }
    }
  }
  return count;
}
```

## Chaos and Strange Attractors

Deterministic chaos for organic patterns.

```javascript
// Logistic map
function* logisticMap(x0 = 0.1, r = 3.9) {
  let x = x0;

  while (true) {
    yield x;
    x = r * x * (1 - x);
  }
}

const chaos = logisticMap(0.1, 3.9);

signal('chaos', t => {
  const { index, phase } = step(t, 120, 16);

  // Map chaotic value to scale degree
  const chaosValue = Array.from(take(chaos, index + 1)).pop();
  const degree = Math.floor(chaosValue * 8);

  const f = freq(330, scales.minor, degree);
  return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.2;
});

// Henon attractor (2D)
function* henon(x0 = 0, y0 = 0, a = 1.4, b = 0.3) {
  let x = x0;
  let y = y0;

  while (true) {
    yield { x, y };
    const nextX = 1 - a * x * x + y;
    const nextY = b * x;
    x = nextX;
    y = nextY;
  }
}

const attractor = henon();

signal('attractor', {
  left: t => {
    const { index, phase } = step(t, 100, 16);
    const point = Array.from(take(attractor, index + 1)).pop();
    const f = 220 + point.x * 220;
    return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.15;
  },
  right: t => {
    const { index, phase } = step(t, 100, 16);
    const point = Array.from(take(attractor, index + 1)).pop();
    const f = 330 + point.y * 220;
    return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.15;
  }
});
```

## Sequences from Number Theory

Mathematical sequences for pitch and rhythm.

```javascript
// Prime numbers
function* primes() {
  yield 2;
  const sieve = new Set();
  let candidate = 3;

  while (true) {
    if (!sieve.has(candidate)) {
      yield candidate;
      for (let multiple = candidate * candidate; multiple < candidate * candidate + 10000; multiple += candidate * 2) {
        sieve.add(multiple);
      }
    }
    candidate += 2;
  }
}

// Fibonacci
function* fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Collatz conjecture
function* collatz(n) {
  while (n !== 1) {
    yield n;
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
  }
  yield 1;
}

// Perfect numbers
function* perfectNumbers() {
  let n = 2;
  while (true) {
    const divisors = [];
    for (let i = 1; i < n; i++) {
      if (n % i === 0) divisors.push(i);
    }
    if (divisors.reduce((a, b) => a + b, 0) === n) {
      yield n;
    }
    n++;
  }
}

// Use Fibonacci for rhythm
const fib = fibonacci();
const fibRhythm = Array.from(take(fib, 12));

signal('fibonacci', t => {
  const totalBeats = fibRhythm.reduce((a, b) => a + b, 0);
  const cycleTime = 8;
  const beatTime = ((t % cycleTime) / cycleTime) * totalBeats;

  let accumulated = 0;
  for (const duration of fibRhythm) {
    accumulated += duration;

    if (Math.abs(beatTime - accumulated) < 0.2) {
      const phase = Math.abs(beatTime - accumulated) / 0.2;
      return Math.sin(2 * Math.PI * 440 * t) * env.exp(phase, 8) * 0.25;
    }
  }

  return 0;
});
```

## L-Systems

Recursive pattern generation.

```javascript
function* lSystem(axiom, rules, maxDepth = Infinity) {
  let current = axiom;
  let depth = 0;

  while (depth < maxDepth) {
    yield current;

    current = current.split('').map(symbol =>
      rules[symbol] || symbol
    ).join('');

    depth++;
  }
}

// Algae L-system
const algae = lSystem('A', {
  'A': 'AB',
  'B': 'A'
}, 8);

// Generate sequence: A -> AB -> ABA -> ABAAB -> ABAABABA -> ...
for (const generation of algae) {
  console.log(generation);
}

// Musical L-system
const musicalRules = {
  'A': 'AB+',
  'B': 'A-B',
  '+': '++',
  '-': '--'
};

const musical = lSystem('A', musicalRules, 6);

signal('lsystem', t => {
  const { index, phase } = step(t, 100, 8);

  const generations = Array.from(musical);
  const current = generations[generations.length - 1];
  const symbol = current[index % current.length];

  const actions = {
    'A': () => {
      const f = freq(330, scales.minor, 0);
      return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5);
    },
    'B': () => {
      const f = freq(330, scales.minor, 4);
      return Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5);
    },
    '+': () => {
      return Math.sin(2 * Math.PI * 550 * t) * env.exp(phase, 3) * 0.5;
    },
    '-': () => {
      return Math.sin(2 * Math.PI * 220 * t) * env.exp(phase, 3) * 0.5;
    }
  };

  return (actions[symbol] || (() => 0))() * 0.15;
});
```

## Infinite Composition

Combine everything into an evolving composition.

```javascript
const signal = require('@rolandnsharp/signal');
const { step, freq, scales, env } = signal;

// Multiple generators running in parallel
function* compose(...generators) {
  while (true) {
    yield generators.map(gen => gen.next().value);
  }
}

// Create layers
const bassPattern = euclidean(3, 8);
const chordPattern = cycle([0, 4, 5, 7]);
const melodyPattern = markovChain({
  0: [{ next: 2 }, { next: 4 }],
  2: [{ next: 0 }, { next: 4 }, { next: 7 }],
  4: [{ next: 5 }, { next: 7 }],
  5: [{ next: 4 }, { next: 7 }],
  7: [{ next: 0 }]
}, 0);
const rhythmWalk = randomWalk(0, 1, -3, 3);

// Compose them
const composition = compose(bassPattern, chordPattern, melodyPattern, rhythmWalk);

signal('generative-piece', t => {
  const { index, phase } = step(t, 90, 8);

  const [bass, chord, melody, rhythmShift] = Array.from(
    take(composition, Math.floor(index) + 1)
  ).pop();

  let sum = 0;

  // Bass
  if (bass && phase < 0.2) {
    const f = freq(110, scales.minor, 0);
    sum += Math.sin(2 * Math.PI * f * t) * env.exp(phase, 5) * 0.3;
  }

  // Chord
  const chordNotes = [chord, chord + 3, chord + 7];
  chordNotes.forEach(degree => {
    const f = freq(220, scales.minor, degree);
    sum += Math.sin(2 * Math.PI * f * t) * 0.04;
  });

  // Melody (shifted by random walk)
  const adjustedMelody = melody + rhythmShift;
  const f = freq(440, scales.minor, adjustedMelody);
  sum += Math.sin(2 * Math.PI * f * t) * env.exp(phase, 6) * 0.15;

  return sum * 0.5;
});
```

## Performance Considerations

### Stateless Generators

Generators maintain state internally, but you can create stateless versions:

```javascript
// Stateful (generator maintains index)
function* stateful() {
  let i = 0;
  while (true) yield i++;
}

// Stateless (pure function of index)
const stateless = i => i;

// In Signal, use index from step()
signal('stateless', t => {
  const { index } = step(t, 120, 8);
  const value = stateless(Math.floor(index));
  // ...
});
```

### Memoization

Cache generator results for reuse:

```javascript
function memoize(generator, limit = 1000) {
  const cache = [];

  return {
    get(index) {
      while (cache.length <= index) {
        cache.push(generator.next().value);
        if (cache.length > limit) {
          cache.shift();  // Keep memory bounded
        }
      }
      return cache[index];
    }
  };
}

const pattern = memoize(markovChain(transitions, 0));
const note = pattern.get(index);
```

## Philosophy

Lazy sequences embody key principles of generative music:

1. **Infinite creativity** - patterns never exhaust
2. **Composability** - combine simple rules for complexity
3. **Emergence** - complex behavior from simple rules
4. **Efficiency** - compute only what you need
5. **Declarative** - describe what, not how

Signal + lazy sequences = a platform for algorithmic composition that's both powerful and elegant.

## Further Reading

- [Y-COMBINATOR-MUSIC.md](./Y-COMBINATOR-MUSIC.md) - Fixed-point combinators
- [JAVASCRIPT-FEATURES.md](./JAVASCRIPT-FEATURES.md) - All JS features for music
- [STATE-AND-RECURSION.md](./STATE-AND-RECURSION.md) - Functional approaches

## External Resources

- [Scribbletune](https://github.com/scribbletune/scribbletune) - Music with JavaScript arrays
- [Tidal Cycles](https://tidalcycles.org/) - Haskell live coding (inspiration)
- [Strudel](https://strudel.tidalcycles.org/) - Tidal Cycles in JavaScript
- Xenakis, Iannis - "Formalized Music" (algorithmic composition)
- Curtis Roads - "The Computer Music Tutorial"
