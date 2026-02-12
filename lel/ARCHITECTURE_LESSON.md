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
3.  **Session-Managed Cleanup:** The `live-session.js` file is now responsible for calling `clear()` (non-destructive) at its top. This surgically removes the old signal functions from the `globalThis.LEL_REGISTRY` before registering the new ones.

The result is that the audio stream runs continuously, and on a hot-reload, the already-running loop seamlessly swaps out the old signal function for the new one on its very next sample, achieving truly instantaneous, pop-free updates.
