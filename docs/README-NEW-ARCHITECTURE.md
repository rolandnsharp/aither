# Kanon Architecture (2026)

## Migration from Genish/Browser Architecture

**Previous architecture (deprecated):**
- genish.js peek/poke abstractions
- Browser-based AudioWorklet
- WebSocket eval server
- File watcher for hot-reload

**Current architecture:**
- Closure-based FRP with persistent state
- Native Bun audio via speaker.js
- Bun `--hot` flag for module reloading
- Zero abstractions, direct Float64Array access

## Core Layers

```
┌─────────────────────────────────────────┐
│  signals.js - Live Coding Interface     │  ← Edit this while running!
├─────────────────────────────────────────┤
│  flux.js - Signal Registry (FRP)        │  ← Pure functional state transformers
├─────────────────────────────────────────┤
│  storage.js - Ring Buffer (The Well)    │  ← SharedArrayBuffer, survives hot-reload
├─────────────────────────────────────────┤
│  transport.js - Audio Sink              │  ← Speaker.js now, JACK FFI later
├─────────────────────────────────────────┤
│  engine.js - Producer Loop              │  ← Fills buffer, manages lifecycle
└─────────────────────────────────────────┘
```

## Key Improvements

### 1. Direct State Access

**Before (genish.js):**
```javascript
const phase = peek(globalThis.STATE, 0, { mode: 'samples' });
const newPhase = mod(add(phase, 440/44100), 1.0);
poke(globalThis.STATE, newPhase, 0);
return peek(globalThis.SINE_TABLE, newPhase);
```

**After (Flux):**
```javascript
mem[idx] = (mem[idx] + 440/44100) % 1.0;
return [Math.sin(mem[idx] * 2 * Math.PI) * 0.5];
```

### 2. Phase Continuity

State persists in `globalThis.KANON_STATE` during hot-reload:

```javascript
globalThis.KANON_STATE ??= new Float64Array(1024);
```

When you change a parameter and save, Bun reloads the module but the Float64Array remains untouched, preserving oscillator phases.

### 3. Soft Clipping

All signals auto-clip with `Math.tanh()` in `flux.js:updateAll()`:

```javascript
for (let i = 0; i < STRIDE; i++) {
  mixedVector[i] = Math.tanh(mixedVector[i]);
}
```

No more speaker-destroying clipping!

### 4. Native Float Audio

48kHz @ 32-bit float (no int16 quantization):

```javascript
const speaker = new Speaker({
  channels: STRIDE,
  bitDepth: 32,
  sampleRate: 48000,
  float: true,  // Native float format
});
```

### 5. Zero-Copy Optimization

Reusable buffer with `subarray()` eliminates GC pauses:

```javascript
const reusableBuffer = Buffer.alloc(maxBufferSize);
// ...
this.push(reusableBuffer.subarray(0, samples * STRIDE * bytesPerSample));
```

### 6. Dimension Agnostic (STRIDE)

Current: STRIDE=1 (mono)
Future: STRIDE=2 (stereo), STRIDE=4 (XYZW for 3D oscilloscope)

```javascript
export const STRIDE = 1; // Easy to change later
```

## File Structure

- **index.js** - Entry point
- **engine.js** - Producer loop & lifecycle
- **flux.js** - Signal registry & mixing (renamed from kanon.js)
- **storage.js** - Ring buffer (SharedArrayBuffer)
- **transport.js** - Audio output (speaker.js)
- **signals.js** - **LIVE CODE HERE!** User-facing signal definitions
- **math-helpers.js** - Vector math utilities (optional)

## Deleted Files (No Longer Needed)

- `genish.js` - Abstraction layer eliminated
- `genish-patched.js` - No longer needed
- `wave-dsp.js`, `wave-dsp-old.js` - Replaced by direct Float64 math
- `client/` directory - Browser architecture removed
- `eval.ts`, `host.ts` - Old WebSocket system
- `signal-old.js` - Old API

## Migration Guide

### Old API → New API

**1. Simple oscillator**
```javascript
// Old
kanon('sine', (t) => mul(cycle(440), 0.5));

// New
kanon('sine', (mem, idx) => ({
  update: (sr) => {
    mem[idx] = (mem[idx] + 440 / sr) % 1.0;
    return [Math.sin(mem[idx] * 2 * Math.PI) * 0.5];
  }
}));
```

**2. State management**
```javascript
// Old
kanon('drone', (t, state) => {
  return {
    graph: mul(0, t),
    update: () => {
      let phase = state[0] || 0;
      phase = (phase + 220 / 44100) % 1.0;
      state[0] = phase;
      return Math.sin(phase * 2 * Math.PI) * 0.7;
    }
  };
});

// New
kanon('drone', (mem, idx) => ({
  update: (sr) => {
    mem[idx] = (mem[idx] + 220 / sr) % 1.0;
    return [Math.sin(mem[idx] * 2 * Math.PI) * 0.7];
  }
}));
```

**3. No more graph vs. update dichotomy**

Everything is `update(sr)` returning `[sample]`. Clean and simple.

## Running

```bash
# Old way (no longer works)
bun run host.ts

# New way
bun --hot index.js
```

## Performance Improvements

| Feature | Old | New |
|---------|-----|-----|
| State Access | peek/poke overhead | Direct array access |
| Audio Format | 44.1kHz 16-bit | 48kHz 32-bit float |
| GC Pressure | High (Buffer.alloc) | Zero (reusable buffer) |
| Buffer Size | Small | 2x larger (32K frames) |
| Fill Strategy | setInterval | setImmediate saturation |
| Clipping | Manual | Automatic tanh() |

## Future Transport: JACK FFI

Current: Speaker.js (PUSH mode)
Future: JACK FFI (PULL mode)

```javascript
// Future implementation
createTransport('PULL', ringBuffer, sampleRate);
// C callback directly reads from ringBuffer
// <10ms latency possible
```

## Philosophy

The new architecture embraces:

1. **Direct access over abstraction**: Float64Array vs peek/poke
2. **State over time**: `f(state)` vs `f(t)`
3. **Closure power**: Lexical scope for state encapsulation
4. **Native performance**: No browser sandboxing
5. **Scientific precision**: Float64 state, Float32 output

This is the **post-genish** era of DSP in JavaScript.

## Roadmap

- [x] Core FRP architecture
- [x] Phase-continuous hot-swapping
- [x] 48kHz @ 32-bit float
- [x] Zero-copy optimization
- [x] Renamed to Flux
- [ ] Stereo support (STRIDE=2)
- [ ] JACK FFI transport
- [ ] 3D oscilloscope integration
- [ ] Vim eval integration

## Credits

Migration inspired by:
- Incudine (state-based Lisp DSP)
- SuperCollider (live coding)
- Modern FRP principles

Previous architecture built with genish.js by Charlie Roberts.
