# Kanon Developer Notes: The Path to "Performance-Grade"

This document outlines the roadmap for evolving Kanon from a functional prototype into a "Performance-Grade" live-coding instrument. The primary goal is to add computational safety rails and performance guarantees to prevent glitches, clicks, and pops during a live performance.

## Core Problem: The Perils of Live JIT

While the Phase 2 Symbolic JIT is powerful, live performance introduces risks that can cause audio glitches:
1.  **Garbage Collection (GC)**: Even though our engine is low-allocation, complex user recipes might inadvertently trigger GC.
2.  **Mathematical Singularities**: User error can lead to operations like `div(1, 0)`, which produce `Infinity` or `NaN` and can poison the entire audio buffer, causing silence.
3.  **Discontinuities**: Instantly changing a parameter (e.g., frequency from 440 to 880) creates a discontinuity in the waveform's derivative, resulting in an audible "thump" or "click", even with phase alignment.

## The Roadmap: Computational Safety Rails

To mitigate these risks, we will implement the following upgrades:

### 1. Fast Lookup Tables (LUTs)
-   **Problem**: Calling `Math.sin` or `Math.cos` thousands of times per second adds up and performance can vary across platforms.
-   **Upgrade**: Implement pre-calculated `Float64Array` lookup tables for `sin` and `cos` (e.g., 8192 points).
-   **Benefit**: Array access is significantly faster and more deterministic than transcendental function calls. The JIT compiler will be updated to generate code that reads from these tables.

### 2. Safeguarded Operators
-   **Problem**: A single `NaN` or `Infinity` can permanently silence the audio engine.
-   **Upgrade**: Implement "Surgical" versions of operators that can produce singularities.
    -   `div(a, b)`: If `b` is `0`, return `0` instead of `Infinity`.
    -   `pow(a, b)` / `log(a)`: Add similar guards for common edge cases.
-   **Benefit**: Makes the engine resilient to user error during live performance.

### 3. "The Slew" - Parameter Smoothing
-   **Problem**: Instantaneous parameter changes cause audible clicks.
-   **Upgrade**: Add a `slew(target, speed)` symbolic helper.
-   **Benefit**: The JIT will generate code to create an "Elastic" transition, smoothly interpolating the parameter from its old value to the new one over a short period (e.g., 5-10ms), resulting in a natural-sounding morph.

### 4. Noise Primitives
-   **Problem**: `Math.random()` is too slow and non-deterministic for high-performance audio.
-   **Upgrade**: Add `noise()` primitives (e.g., `white`, `pink`, `brown`) to the symbolic library.
-   **Benefit**: The JIT will generate code for a fast, deterministic pseudo-random number generator (e.g., `Xorshift`), adding efficient entropy for modeling natural fields and textures.

### 5. Essential Morphing & Control Functions
-   `lerp(a, b, t)`: Essential for morphing between two mathematical states.
-   `clamp(val, min, max)`: Keeps chaotic attractors and other generative processes from exceeding safe audio limits.

## Developer Feedback

-   **Complexity Meter**: To provide real-time feedback during a performance, we should add a "Complexity Meter" to the terminal. This will measure and display the microseconds each `update` cycle takes, showing the user how much CPU headroom they have left before risking audio glitches.

## Final Goal

By implementing these features, the JIT-generated function will become a self-contained, highly optimized, and "safe" block of code. It will not reach out to the slower or more dangerous parts of the JavaScript runtime, guaranteeing smooth, reliable performance in a live setting.
