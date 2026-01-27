# KANON - Headless Live-Coding Audio Environment

A minimal live-coding environment for audio synthesis. Edit JavaScript in Vim, save the file, hear the changes instantly with **zero clicks or phase resets**.

## Quick Start

```bash
# Install dependencies
bun install

# Start the engine
bun run host.ts

# In another terminal: Edit with your favorite editor
vim signal.js
# Make changes, save (:w), hear them instantly!
```

## Architecture

KANON uses a simple architecture for hot-reloading audio code:

```
Vim/Editor → signal.js → File Watcher → WebSocket → AudioWorklet → Audio Output
                                                    ↓
                                              Persistent STATE survives reloads
```

### Files

- **`host.ts`**: Bun server that launches headless Chromium and watches `signal.js`
- **`client/engine.js`**: Browser audio engine using Web Audio API + AudioWorklet
- **`client/worklet.js`**: AudioWorklet processor (audio thread)
- **`wave-dsp.js`**: DSP library wrapping genish.js with clean API
- **`signal.js`**: **YOUR CODE** - edit this file to make sounds!

### How It Works

1. **Edit** `signal.js` in your editor
2. **Save** the file
3. File watcher detects change
4. Full file contents sent to AudioWorklet via WebSocket
5. Code is `eval()`'d in worklet context
6. Audio updates **instantly** with state preserved

## Two API Patterns

### Pattern 1: SIMPLE (Pure genish - fast, compiled)

Return a genish graph directly. Best for effects, filters, and simple patches.

```javascript
// 440Hz sine wave
kanon('sine', (t) => mul(cycle(440), 0.5));

// FM synthesis
kanon('fm', (t) => {
  const modulator = mul(cycle(5), 100);
  const carrier = cycle(add(440, modulator));
  return mul(carrier, 0.5);
});

// Filtered sawtooth
kanon('bass', (t) => lp(mul(phasor(110), 0.8), 0.1));
```

**Pros:** Fast (compiled by genish), clean syntax
**Cons:** State resets on code changes (phase discontinuities)

### Pattern 2: STATEFUL (JavaScript state - enables live surgery!)

Return `{graph, update}` where `update()` manages persistent state.

```javascript
kanon('drone', (t, state) => {
  return {
    graph: mul(0, t),  // Dummy graph (or use genish for effects)
    update: () => {
      // Manage state in plain JavaScript
      let phase = state[0] || 0;

      // Change 220 to 440 while playing - NO CLICKS!
      phase = (phase + 220 / 44100) % 1.0;
      state[0] = phase;

      // Return sample value
      return Math.sin(phase * 2 * Math.PI) * 0.7;
    }
  };
});
```

**Pros:** Phase/state persists across code changes (true live surgery!)
**Cons:** Slower (JavaScript per-sample), more verbose

### When to Use Each Pattern

- **Simple pattern** → Effects, filters, static sounds
- **Stateful pattern** → Live-coded evolving textures, parameter morphing

## Available Functions

### Oscillators
- `cycle(freq)` - Sine wave
- `phasor(freq)` - Sawtooth ramp (0-1)
- `noise()` - White noise
- `sin(phase)`, `cos(phase)` - Trig functions

### Math
- `add(...args)`, `mul(...args)` - Variadic math
- `sub(a, b)`, `div(a, b)` - Binary math
- `mod(a, b)`, `pow(a, b)` - Modulo, power
- `abs(x)`, `min(a, b)`, `max(a, b)` - Utilities

### Filters
- `lp(input, cutoff)` - One-pole lowpass (cutoff: 0-1)
- `hp(input, cutoff)` - One-pole highpass
- `smooth(target, amount)` - Exponential smoother (amount: 0.9-0.999)

### Effects
- `echo(input, time, feedback)` - Simple delay
- `dub(input, time, feedback, darkening)` - Dub-style delay with lowpass
- `reverb(input, size, damping)` - Simple reverb
- `saturate(input, drive)` - Soft saturation (drive: 1-10)
- `fold(input, amount)` - Wavefolding (amount: 1-4)
- `crush(input, bits)` - Bitcrusher (bits: 4-16)
- `comb(input, time, feedback)` - Comb filter
- `karplus(impulse, freq, damping)` - Karplus-Strong plucked string

### Utilities
- `gain(amount, signal)` - Multiply signal by gain
- `smoothGain(amount, signal)` - Smooth gain changes
- `bass(freq)` - Quick bass tone (sine + sub-octave)
- `wobble(freq, rate)` - Wobble bass with LFO

## Live Surgery Example

The power of KANON is that you can change parameters **while audio is playing** with zero artifacts:

```javascript
// Start with this:
kanon('drone', (t, state) => {
  return {
    graph: mul(0, t),
    update: () => {
      const freq = 110;  // <- Change this to 220, save, NO CLICKS!

      let phase = state[0] || 0;
      phase = (phase + freq / 44100) % 1.0;
      state[0] = phase;

      return Math.sin(phase * 2 * Math.PI) * 0.5;
    }
  };
});

// Edit freq from 110 → 220 → 440
// Save each time
// Phase continues seamlessly = live surgery!
```

## State Buffer Organization

The `state` parameter is a `Float32Array[128]` that persists across all reloads.

**Recommended slot allocation:**
- `0-19`: Oscillator phases
- `20-39`: LFO phases
- `40-59`: Envelopes, smoothers
- `60-69`: Beat clocks
- `70-89`: Filter history
- `90-109`: Delay buffers
- `110-127`: User experiments

Example:
```javascript
state[0]  = carrier phase
state[10] = LFO phase
state[70] = lowpass y[n-1]
```

## Rebuilding the Bundle

If you modify `wave-dsp.js` or `client/worklet.js`:

```bash
cat genish-patched.js wave-dsp.js client/worklet.js > client/worklet-bundled.js
```

## Technical Details

- **Audio**: Web Audio API, AudioWorklet (44.1kHz)
- **Browser**: Playwright (headless Chromium)
- **Server**: Bun with file watcher
- **DSP**: genish.js for compiled graphs + plain JavaScript for state
- **Communication**: WebSocket for file change notifications + code delivery

## Why This Architecture?

1. **File system as communication channel** - Simpler than complex WebSocket protocols
2. **String eval() for hot-reload** - Standard pattern for AudioWorklet updates
3. **Global state buffer** - Persistent Float32Array survives all reloads
4. **Headless browser** - Reliable, cross-platform, automation-friendly
5. **Zero build step** - Just bundle pre-existing files

## Philosophy

**Simplicity is divinity.** KANON embraces:
- Edit with any editor (Vim, VSCode, nano)
- Save file → Instant audio update
- No complex state management
- Two simple patterns: fast or stateful
- ~900 lines of code (excluding genish.js)

## Examples

Check `signal.js` for examples of:
- Simple sine/FM/filtered patches
- Stateful live surgery drone
- Beat-synced kick drum
- Effects chains

## License

MIT

## Credits

- Built with [genish.js](https://github.com/charlieroberts/genish.js) by Charlie Roberts
- Powered by [Bun](https://bun.sh) and [Playwright](https://playwright.dev)
