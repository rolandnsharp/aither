# Architecture Lesson 1: Push vs. Pull in Real-Time Audio

This document explains a fundamental issue we discovered and fixed in the `lel` audio engine: the difference between a "push" and a "pull" architecture and why the latter is essential for glitch-free, performant audio.

## The Problem: "Push" Architecture & Glitches

Our first attempt at building the audio engine used `setInterval` to generate audio. This is a **"push" architecture**. We are generating audio on a timer and pushing it to the audio hardware, hoping that we're doing it at the exact right time, which leads to timing conflicts and glitches.

## The Solution: A "Pull" Architecture with Streams

The correct solution is a **"pull" architecture"**, where the audio hardware *tells us* when it needs more data. We implemented this with a custom Node.js `Readable` stream that pipes directly into the `speaker` instance. Our `generateAudioChunk` function is passed directly to this stream, which calls it whenever the audio hardware needs another block of samples. This solves the primary glitching issue and is the foundation of our stable engine.

---

# Architecture Lesson 2: High-Performance State & The Garbage Collector

After fixing the timing, a new, infrequent glitch appeared. This is a classic symptom of **Garbage Collection (GC)** pauses.

## The Problem: "Stop-the-World" Pauses

Using plain JavaScript objects for state (`s.state = { phase: 0 }`) creates "garbage" that the JavaScript engine must periodically clean up. This cleanup pauses our program for a few milliseconds, and if that pause happens when the audio hardware needs data, a **glitch** occurs.

## The Solution: Pre-Allocation and Zero Garbage

The solution is to **create zero garbage in the real-time audio loop**.

1.  **Single Memory Block:** We pre-allocate one large `Float64Array` called `STATE` on `globalThis` when the engine starts.
2.  **Persistent Offsets:** Each signal is assigned a permanent, unique slice of this `STATE` array for its state.
3.  **Direct Memory Access:** Signals read and write directly to their slice of the `Float64Array` (e.g., `s.state[0] = ...`). This is incredibly fast and creates no garbage.

---

# Architecture Lesson 3: Instant, Pop-Free Hot-Reloading

Our final challenge was ensuring that hot-reloads were truly instantaneous, without any audio dropouts, clicks, or overlapping sounds.

## The Problem: Re-initializing the Audio Stream

Our initial hot-reloading mechanism (re-running the script via `bun --hot`) was tearing down the old audio stream and creating a new one on every save. This process is fast, but not instantaneous, causing a brief audio artifact.

## The Solution: A Global Singleton Guard

The correct pattern is to **never stop the audio stream once it has started**. The stream is a singleton.

1.  **Global State:** We moved all persistent state (`STATE`, `REGISTRY`, `OFFSETS`) to the `globalThis` object, allowing it to survive script re-runs.
2.  **Singleton Guard:** We added a guard at the very start of our engine. It checks if `globalThis.LEL_ENGINE_INSTANCE` exists.
    -   **On Cold Start:** The instance does *not* exist. The engine starts the audio stream, creates the instance on `globalThis`, and loads the session file.
    -   **On Hot-Reload:** The instance *does* exist. The `start` function **exits immediately**. The audio stream is never touched. The script continues, re-importing `live-session.js`.
3.  **Session-Managed Cleanup:** The `live-session.js` file is now responsible for calling `clear()` (non-destructive) at its top. This surgically removes the old signal functions from the `globalThis.LAL_REGISTRY` before registering the new ones.

The result is that the audio stream runs continuously, and on a hot-reload, the already-running loop seamlessly swaps out the old signal function for the new one on its very next sample, achieving truly instantaneous, pop-free updates.

---

# Architecture Lesson 4: Managing Complex State

While the `Float64Array` is perfect for high-performance numeric state, some generative art concepts (like L-Systems) use complex state like strings or nested objects. Putting this logic inside the real-time audio function would create garbage and cause glitches.

## The Best Practice: Separate Real-Time from Control-Time

The solution is to maintain a strict separation between the **real-time audio path** and **control-time logic**.

1.  **Real-Time (`register` function):** This is the "hot path." It runs 48,000 times per second. Logic inside this function **must not** allocate memory. It should only perform numeric calculations on the `s.state` (`Float64Array`) and other values in the `s` object.

2.  **Control-Time (`live-session.js`):** This is the "warm path." It runs once per hot-reload, or on timers you define (e.g., `setInterval`). This is the correct place to manage complex, slow-changing state.

### Example: L-System

```javascript
// live-session.js

// --- Control-Time Logic ---
// This state is managed outside the real-time function.
let lSystem = {
  string: 'A',
  rules: { 'A': 'AB', 'B': 'A' },
  // Evolve the L-System every second.
  intervalId: setInterval(() => {
    let next = '';
    for (const char of lSystem.string) {
      next += lSystem.rules[char] || char;
    }
    lSystem.string = next.slice(0, 1024); // Cap length for sanity
    console.log('L-System evolved:', lSystem.string.length);
  }, 1000)
};

// --- Real-Time Signal ---
// The real-time function is simple and GC-free. It CLOSES OVER
// the lSystem object to read the current state.
register('l-system-sine', s => {
  // Read the string length from the control-time object.
  const len = lSystem.string.length; 
  const freq = 110 + (len % 200); // Map length to frequency
  
  // Calculate the sine wave using performant, numeric-only operations.
  s.state[0] = (s.state[0] + freq / s.sr) % 1.0;
  return Math.sin(s.state[0] * 2 * Math.PI) * 0.5;
});
```

By keeping the complex state management at the "control" level, we ensure the "real-time" audio path remains pure, performant, and glitch-free.

---

# Architecture Lesson 5: Best Practices for State Management

The `s.state` object is a raw `Float64Array` slice for maximum performance. While powerful, using "magic numbers" for indices (e.g., `s.state[0]`, `s.state[1]`) can become confusing and error-prone, especially in complex signals or when multiple signals are running.

## The Best Practice: Enums and Constants

To maintain clarity, readability, and prevent state conflicts, **define the memory layout of your signal's state using constants or an enum-like object.**

This pattern turns "magic numbers" into named, self-documenting properties, making your signal code vastly easier to understand and maintain.

### Example: A Complex Drone Synth

Imagine a synth with two oscillators, a filter, and an envelope.

**Bad Practice (Magic Numbers):**
```javascript
register('drone', s => {
  // What is state[0]? What is state[1]?
  s.state[0] = (s.state[0] + 440 / s.sr) % 1.0; // osc1 phase
  s.state[1] = (s.state[1] + 442 / s.sr) % 1.0; // osc2 phase
  
  const osc1 = Math.sin(s.state[0] * 2 * Math.PI);
  const osc2 = Math.sin(s.state[1] * 2 * Math.PI);
  const mixed = (osc1 + osc2) * 0.5;

  // What is state[2]?
  const alpha = 800 / s.sr;
  s.state[2] = s.state[2] + alpha * (mixed - s.state[2]); // filter z1

  // What is state[3]?
  s.state[3] = (s.state[3] || 0) + 0.0001; // env level
  if (s.state[3] > 1) s.state[3] = 1;

  return s.state[2] * s.state[3];
});
```
This is confusing and brittle. If you want to add a new state variable in the middle, you have to re-number everything.

**Good Practice (Constants / Enum):**
```javascript
// Define the memory layout for this signal at the top.
const DRONE_STATE = {
  OSC1_PHASE: 0,
  OSC2_PHASE: 1,
  FILTER_Z1: 2,
  ENV_LEVEL: 3,
};

register('drone', s => {
  // Now the code is self-documenting.
  s.state[DRONE_STATE.OSC1_PHASE] = (s.state[DRONE_STATE.OSC1_PHASE] + 440 / s.sr) % 1.0;
  s.state[DRONE_STATE.OSC2_PHASE] = (s.state[DRONE_STATE.OSC2_PHASE] + 442 / s.sr) % 1.0;

  const osc1 = Math.sin(s.state[DRONE_STATE.OSC1_PHASE] * 2 * Math.PI);
  const osc2 = Math.sin(s.state[DRONE_STATE.OSC2_PHASE] * 2 * Math.PI);
  const mixed = (osc1 + osc2) * 0.5;
  
  const alpha = 800 / s.sr;
  s.state[DRONE_STATE.FILTER_Z1] = s.state[DRONE_STATE.FILTER_Z1] + alpha * (mixed - s.state[DRONE_STATE.FILTER_Z1]);

  s.state[DRONE_STATE.ENV_LEVEL] = (s.state[DRONE_STATE.ENV_LEVEL] || 0) + 0.0001;
  if (s.state[DRONE_STATE.ENV_LEVEL] > 1) s.state[DRONE_STATE.ENV_LEVEL] = 1;

  return s.state[DRONE_STATE.FILTER_Z1] * s.state[DRONE_STATE.ENV_LEVEL];
});
```
This approach has zero performance cost, as the constants are resolved at parse time, but the benefits to code clarity and maintainability are enormous. It is the recommended best practice for all stateful signals in `lel`.
