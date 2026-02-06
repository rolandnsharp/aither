# Live Coding Surgery Guide

## Philosophy

Kanon treats parameters like **surgical variables** - numbers you can change live to morph sound. The architecture makes this trivially simple: edit, save, hear.

## How It Works

```javascript
import { kanon, clear } from './kanon.js';
clear(); // Remove old signals on hot-reload

kanon('my-signal', (mem, idx) => {
  // --- SURGERY PARAMS (change these live!) ---
  const freq = 220.0;
  const intensity = 5.0;

  return {
    update: (sr) => {
      // ... use freq and intensity ...
    }
  };
});
```

**On every save:**
1. Bun reloads `signals.js`
2. `clear()` removes old signal definitions
3. New `kanon()` calls register fresh closures with updated parameters
4. Phase state persists in `globalThis.KANON_STATE` (no clicks!)

**Result:** Change `freq = 220.0` → `freq = 440.0`, save, and hear it morph instantly.

## Why Not import.meta.hot?

You might expect to need:
```javascript
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // complex disposal logic...
  });
}
```

**You don't.** The `clear()` pattern is simpler and more powerful:
- ✅ Every parameter is automatically live
- ✅ No per-signal boilerplate
- ✅ Clean slate prevents stale state bugs
- ✅ Works identically in all environments

## Surgical Parameters Best Practices

### 1. Group Parameters at the Top
```javascript
kanon('vortex', (mem, idx) => {
  // --- SURGERY PARAMS ---
  const baseFreq = 110.0;      // Deep G2
  const modRatio = 1.618;      // Golden ratio
  const morphSpeed = 0.2;      // Breathe rate (Hz)
  const intensity = 6.0;       // 0.0 = sine, 50.0 = chaos

  return { update: (sr) => { /* ... */ } };
});
```

**Why:** Easy to find and tweak without scrolling through DSP code.

### 2. Document Parameter Ranges
```javascript
// intensity: 0.1 (gentle) to 50.0 (aggressive chaos)
const intensity = 6.0;
```

**Why:** Helps you remember safe ranges during improvisation.

### 3. Comment Out Alternative Values
```javascript
const modRatio = 1.618;    // Golden Ratio (organic shimmer)
// const modRatio = 2.0;    // Octave (harmonic)
// const modRatio = 3.14;   // Pi (metallic)
```

**Why:** Quick to uncomment and test different aesthetic territories.

### 4. Use Descriptive Variable Names
```javascript
// ✅ Good
const breathingSpeed = 0.5; // Clear intent
const growlIntensity = 5.0; // Matches sonic character

// ❌ Avoid
const x = 0.5;  // What does this control?
const param1 = 5.0; // Meaningless
```

## Live Surgery Workflow

### Typical Session
1. Start kanon: `bun --hot index.js`
2. Open `signals.js` in vim/editor
3. Edit a parameter (e.g., `intensity = 6.0` → `intensity = 12.0`)
4. Save (`:w`)
5. **Hear it morph instantly**
6. Repeat until you find the sweet spot

### Pro Tips

**Morph gradually:**
```javascript
// Start conservative
const intensity = 2.0;  // Save, listen
// Increase slowly
const intensity = 5.0;  // Save, listen
const intensity = 10.0; // Save, listen
// Find the edge
const intensity = 20.0; // Too much? Roll back
```

**Use comments as presets:**
```javascript
kanon('vortex', (mem, idx) => {
  // Preset: Gentle Cello
  // const baseFreq = 110.0, intensity = 3.0, morphSpeed = 0.1;

  // Preset: Aggressive Growl
  const baseFreq = 55.0, intensity = 15.0, morphSpeed = 0.5;

  return { /* ... */ };
});
```

**Test extremes to understand boundaries:**
```javascript
// What happens at the limits?
const intensity = 0.0;   // Probably just a sine wave
const intensity = 100.0; // Probably harsh noise

// Then dial back to musical territory
const intensity = 6.0;   // Ah, the sweet spot
```

## Multiple Signals

Run several signals simultaneously:
```javascript
clear();

kanon('bass', (mem, idx) => {
  const freq = 55.0; // Low A
  // ...
});

kanon('lead', (mem, idx) => {
  const freq = 440.0; // Concert A
  // ...
});
```

All signals auto-mix via `Math.tanh()` soft-clipping in `kanon.js:updateAll()`.

**To silence one:** Comment it out and save.
```javascript
// kanon('bass', ...)
// ^ Bass disappears on save
```

## State Slots

Each signal gets persistent state via the `idx` parameter:
```javascript
kanon('my-signal', (mem, idx) => {
  // You have 3-4 slots typically (depends on hash collision)
  // mem[idx]     - First state variable (e.g., oscillator phase)
  // mem[idx + 1] - Second state variable (e.g., LFO phase)
  // mem[idx + 2] - Third state variable (e.g., envelope)

  return {
    update: (sr) => {
      // Read-modify-write pattern
      let phase = mem[idx];
      phase = (phase + freq / sr) % 1.0;
      mem[idx] = phase; // Commit back

      return [Math.sin(phase * 2 * Math.PI) * 0.5];
    }
  };
});
```

**Critical:** State survives hot-reload! This is why your oscillators don't click or reset phase when you change parameters.

## Common Surgical Parameters

### Frequency Parameters
```javascript
const baseFreq = 110.0;     // Hz (A2 = 110, A3 = 220, A4 = 440)
const modRatio = 1.618;     // Multiplier (1.0-5.0 typical)
```

**Range guide:**
- 55 Hz: Deep sub-bass
- 110 Hz: Bass/cello territory
- 220 Hz: Low melody range
- 440 Hz: Concert A (reference pitch)
- 880 Hz+: Bright/piercing

### Modulation Parameters
```javascript
const intensity = 5.0;      // Modulation depth (0.0-50.0)
const morphSpeed = 0.2;     // LFO rate in Hz (0.1-10.0)
```

**Range guide:**
- Intensity 0-1: Subtle shimmer
- Intensity 1-5: Musical modulation
- Intensity 5-20: Aggressive character
- Intensity 20+: Chaotic/noise territory

- morphSpeed 0.1-0.5: Slow breathing
- morphSpeed 0.5-2.0: Rhythmic pulse
- morphSpeed 2.0+: Audio-rate (creates harmonics)

### Dynamics Parameters
```javascript
const amplitude = 0.5;      // Output level (0.0-1.0)
const attackTime = 0.1;     // Envelope attack (seconds)
```

## Avoiding Clicks/Pops

**The architecture handles this automatically** via phase continuity:
- State persists in `globalThis.KANON_STATE`
- Changing `freq` doesn't reset oscillator phases
- Transitions are smooth even with dramatic parameter changes

**Exception:** Changing the DSP algorithm itself (e.g., `Math.sin` → `Math.tanh`) will cause a discontinuity. This is expected and often musically interesting!

## Future: Vim Integration

Currently: Edit signals.js, save, hear changes.

**Coming soon** (see TODO-LIVE-CODING-EVAL.md):
- Visual-select code in vim
- Press `<Leader>e`
- Code evaluates without saving file
- SuperCollider/TidalCycles-style workflow

## Example Surgical Session

```javascript
// Starting point: Gentle sine wave
kanon('morph', (mem, idx) => {
  const freq = 220.0;
  const intensity = 0.0; // Pure sine

  return {
    update: (sr) => {
      mem[idx] = (mem[idx] + freq / sr) % 1.0;
      return [Math.sin(mem[idx] * 2 * Math.PI) * 0.5];
    }
  };
});
// Save: Hear pure tone ✓

// Add gentle modulation
const intensity = 2.0;
// Save: Slight shimmer ✓

// Increase intensity
const intensity = 8.0;
// Save: Rich, organic movement ✓

// Push to edge
const intensity = 25.0;
// Save: Aggressive growl ✓

// Too much, dial back
const intensity = 12.0;
// Save: Found the sweet spot ✓
```

## Summary

The `clear()` pattern gives you **instant parameter morphing** with zero boilerplate. Every number in your signal definition is a surgical variable. Change it, save, hear it. That's the entire workflow.

**Key insight:** By rebuilding closures on each hot-reload while preserving state memory, we get the best of both worlds: total flexibility with phase continuity.

Now go make some weird sounds. 🎛️
