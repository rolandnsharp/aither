# MIDI Controller Integration

Connect hardware MIDI controllers to Aither for real-time parameter control.

## Quick Start

### 1. Install MIDI Library

```bash
bun add easymidi
```

### 2. Create `src/midi.js`

```javascript
// src/midi.js - MIDI Controller Input
import easymidi from 'easymidi';

// Global MIDI arrays
globalThis.MIDI = new Float64Array(128);       // CC 0-127 (knobs/faders)
globalThis.MIDI_NOTES = new Float64Array(128); // Notes 0-127 (keyboard)
globalThis.MIDI.fill(0.5); // Initialize CCs to middle position

export function initMIDI() {
  try {
    // List available MIDI devices
    const inputs = easymidi.getInputs();
    console.log('[MIDI] Available inputs:', inputs);

    if (inputs.length === 0) {
      console.log('[MIDI] No MIDI devices found');
      return;
    }

    // Connect to first available device
    // (or specify by name: new easymidi.Input('Your Controller'))
    const input = new easymidi.Input(inputs[0]);

    console.log(`[MIDI] Connected to: ${inputs[0]}`);

    // Listen for Control Change messages (knobs/faders)
    input.on('cc', (msg) => {
      const { controller, value } = msg;
      globalThis.MIDI[controller] = value / 127; // Normalize to 0-1
      console.log(`[MIDI] CC${controller}: ${(value/127).toFixed(3)}`);
    });

    // Listen for Note On (key press)
    input.on('noteon', (msg) => {
      const { note, velocity } = msg;
      globalThis.MIDI_NOTES[note] = velocity / 127; // Normalize to 0-1
      console.log(`[MIDI] Note ON: ${note} vel: ${velocity}`);
    });

    // Listen for Note Off (key release)
    input.on('noteoff', (msg) => {
      globalThis.MIDI_NOTES[msg.note] = 0;
      console.log(`[MIDI] Note OFF: ${msg.note}`);
    });

  } catch (e) {
    console.error('[MIDI] Error:', e.message);
    console.log('[MIDI] Running without MIDI input');
  }
}
```

### 3. Initialize in `src/server.js`

Add near the top:

```javascript
import { initMIDI } from './midi.js';
```

Add in the `start()` function, before loading live-session.js:

```javascript
async function start() {
  // ... existing code ...

  initMIDI(); // Initialize MIDI

  // ... load live-session.js ...
}
```

### 4. Use in Your Signals

Access any MIDI CC number directly:

```javascript
register('kick', s => {
  // Map CC 1 to decay rate (5-20 range)
  const decayRate = 5 + globalThis.MIDI[1] * 15;

  // Map CC 2 to pitch (30-80 Hz range)
  const baseFreq = 30 + globalThis.MIDI[2] * 50;

  // Map CC 3 to tempo (1-4 Hz = 60-240 BPM)
  const tempo = 1 + globalThis.MIDI[3] * 3;

  // Use the values...
  s.state[0] = (s.state[0] || 0) + tempo / s.sr;
  // ...
});
```

## How It Works

**No REPL messages needed!** MIDI values update directly in memory:

```
MIDI Controller → MIDI Handler → globalThis.MIDI[1] = 0.73
                                          ↓
                       Signal reads it every sample
                       (48,000 times per second)
```

1. Turn a knob on your MIDI controller
2. MIDI handler updates `globalThis.MIDI[cc_number]`
3. Signal reads the new value on the next audio sample
4. Sound changes **instantly**

## Scaling MIDI Values

MIDI values are normalized to 0.0-1.0. Scale them to your desired range:

### Linear Scaling

```javascript
// Formula: min + midi * (max - min)
const decay = 5 + globalThis.MIDI[1] * 15;  // 5-20
const freq = 30 + globalThis.MIDI[2] * 50;  // 30-80
const volume = globalThis.MIDI[3];          // 0-1 (already scaled)
```

### Exponential Scaling (Better for Frequency)

```javascript
// Formula: min * (max/min)^midi
const freq = 20 * Math.pow(20000/20, globalThis.MIDI[1]); // 20Hz-20kHz
```

### Inverse Scaling (for Decay Times)

```javascript
// Formula: max - midi * (max - min)
const decayTime = 2 - globalThis.MIDI[1] * 1.9; // 2.0-0.1 seconds
```

### Helper Function

```javascript
const scale = (cc, min, max) => min + globalThis.MIDI[cc] * (max - min);

register('synth', s => {
  const freq = scale(1, 100, 800);
  const decay = scale(2, 5, 20);
  const volume = scale(3, 0, 1);
  // ...
});
```

## Finding Your MIDI Device

List available MIDI inputs:

```bash
bun -e "import easymidi from 'easymidi'; console.log(easymidi.getInputs())"
```

Connect to specific device:

```javascript
// Instead of: const input = new easymidi.Input(inputs[0]);
const input = new easymidi.Input('Akai MPK Mini');
```

## Example: Tweakable Kick Drum

```javascript
register('kick', s => {
  // CC 1: Tempo (60-240 BPM)
  const tempo = 1 + globalThis.MIDI[1] * 3;

  // CC 2: Decay (5-20)
  const decayRate = 5 + globalThis.MIDI[2] * 15;

  // CC 3: Pitch (30-80 Hz)
  const baseFreq = 30 + globalThis.MIDI[3] * 50;

  // CC 4: Pitch drop amount (2-5)
  const pitchEnvAmt = 2 + globalThis.MIDI[4] * 3;

  // CC 5: Volume (0-1)
  const volume = globalThis.MIDI[5];

  // Trigger
  s.state[0] = (s.state[0] || 0) + tempo / s.sr;
  s.state[0] %= 1.0;
  const trigger = s.state[0] < 0.5 ? 1 : 0;
  const prevTrigger = s.state[1] || 0;

  // Envelope
  if (trigger > prevTrigger) {
    s.state[2] = 1.0;
  }
  s.state[1] = trigger;
  s.state[2] *= Math.exp(-decayRate * s.dt);
  const env = s.state[2];

  // Kick sound with pitch envelope
  const freq = baseFreq * (1 + env * pitchEnvAmt);
  s.state[3] = (s.state[3] || 0) + freq / s.sr;
  s.state[3] %= 1.0;

  return Math.sin(s.state[3] * 2 * Math.PI) * env * volume;
});
```

Now you can tweak all parameters in real-time with your MIDI controller!

## MIDI Keyboard Notes

Playing notes on a MIDI keyboard is different from turning knobs. Notes use `globalThis.MIDI_NOTES[]` where the value is velocity (0 = off, >0 = on with velocity).

### Convert MIDI Note to Frequency

```javascript
// MIDI note 69 = A4 = 440 Hz
// Formula: 440 * 2^((note - 69) / 12)
const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

// Examples:
// midiToFreq(60) = 261.6 Hz (Middle C)
// midiToFreq(69) = 440.0 Hz (A4)
// midiToFreq(72) = 523.3 Hz (C5)
```

### MIDI Note Reference

```
C3 = 48
C4 = 60  (Middle C)
A4 = 69  (Concert A = 440 Hz)
C5 = 72
C6 = 84
```

### Example 1: Monophonic Synth (One Note at a Time)

Plays the most recently pressed key:

```javascript
register('mono-synth', s => {
  // Find the highest active note (most recent)
  let activeNote = -1;
  for (let i = 127; i >= 0; i--) {
    if (globalThis.MIDI_NOTES[i] > 0) {
      activeNote = i;
      break;
    }
  }

  if (activeNote < 0) return 0; // No notes playing

  // Convert MIDI note to frequency
  const freq = 440 * Math.pow(2, (activeNote - 69) / 12);
  const velocity = globalThis.MIDI_NOTES[activeNote];

  // Simple oscillator
  s.state[0] = (s.state[0] || 0) + freq / s.sr;
  s.state[0] %= 1.0;

  return Math.sin(s.state[0] * 2 * Math.PI) * velocity * 0.5;
});
```

### Example 2: Polyphonic Synth (All Notes at Once)

Plays multiple notes simultaneously:

```javascript
register('poly-synth', s => {
  let output = 0;
  let noteCount = 0;

  // Play all active notes
  for (let note = 0; note < 128; note++) {
    const velocity = globalThis.MIDI_NOTES[note];
    if (velocity > 0) {
      const freq = 440 * Math.pow(2, (note - 69) / 12);

      // Each note gets its own phase slot
      s.state[note] = (s.state[note] || 0) + freq / s.sr;
      s.state[note] %= 1.0;

      output += Math.sin(s.state[note] * 2 * Math.PI) * velocity;
      noteCount++;
    }
  }

  // Normalize by note count to prevent clipping
  return noteCount > 0 ? output / noteCount * 0.5 : 0;
});
```

### Example 3: Tesla Coil Organ

Rich harmonic content for an electric/tesla coil sound:

```javascript
register('tesla-coil', s => {
  let output = 0;
  let noteCount = 0;

  for (let note = 0; note < 128; note++) {
    const velocity = globalThis.MIDI_NOTES[note];
    if (velocity <= 0) continue;

    const freq = 440 * Math.pow(2, (note - 69) / 12);

    // Each note uses 3 state slots (for 3 harmonics)
    const baseSlot = note * 3;

    // Fundamental
    s.state[baseSlot] = (s.state[baseSlot] || 0) + freq / s.sr;
    s.state[baseSlot] %= 1.0;
    const fund = Math.sin(s.state[baseSlot] * 2 * Math.PI);

    // 2nd harmonic (octave)
    s.state[baseSlot + 1] = (s.state[baseSlot + 1] || 0) + freq * 2 / s.sr;
    s.state[baseSlot + 1] %= 1.0;
    const harm2 = Math.sin(s.state[baseSlot + 1] * 2 * Math.PI) * 0.5;

    // 3rd harmonic (octave + fifth)
    s.state[baseSlot + 2] = (s.state[baseSlot + 2] || 0) + freq * 3 / s.sr;
    s.state[baseSlot + 2] %= 1.0;
    const harm3 = Math.sin(s.state[baseSlot + 2] * 2 * Math.PI) * 0.3;

    output += (fund + harm2 + harm3) * velocity;
    noteCount++;
  }

  return noteCount > 0 ? output / noteCount * 0.3 : 0;
});
```

### Example 4: Keyboard + Knobs

Combine MIDI notes with CC knobs for expressive control:

```javascript
register('expressive-synth', s => {
  // CC 1: Filter cutoff
  const cutoff = 200 + globalThis.MIDI[1] * 3800; // 200-4000 Hz

  // CC 2: Resonance
  const resonance = globalThis.MIDI[2];

  // CC 3: Volume
  const volume = globalThis.MIDI[3];

  let output = 0;
  let noteCount = 0;

  // Generate polyphonic sound
  for (let note = 0; note < 128; note++) {
    const velocity = globalThis.MIDI_NOTES[note];
    if (velocity > 0) {
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      s.state[note] = (s.state[note] || 0) + freq / s.sr;
      s.state[note] %= 1.0;
      output += Math.sin(s.state[note] * 2 * Math.PI) * velocity;
      noteCount++;
    }
  }

  if (noteCount === 0) return 0;
  output /= noteCount;

  // Apply filter (simple lowpass)
  const alpha = cutoff / s.sr;
  s.state[128] = s.state[128] || 0;
  s.state[128] += alpha * (output - s.state[128]);

  return s.state[128] * volume * 0.5;
});
```

## Tips

- **Start with middle values**: MIDI array initializes to 0.5 (middle position)
- **Log CC numbers**: Turn knobs to see which CC numbers they send
- **Use consistent mappings**: Keep a note of which CC controls what
- **Test incrementally**: Add one MIDI mapping at a time
- **No REPL needed**: MIDI values update automatically in background

## Troubleshooting

**No MIDI devices found:**
- Check your MIDI controller is connected
- On Linux, you may need to install `libasound2-dev`
- Verify with: `aconnect -l` (ALSA) or `aseqdump` to see MIDI events

**Values not updating:**
- Check console for `[MIDI] CC#: value` messages
- Verify your controller sends CC messages (not notes)
- Try a different CC number

**Glitchy sound:**
- MIDI updates happen independently of audio rate
- This is normal and shouldn't cause issues
- If problems persist, add smoothing in your signal

## Advanced: Smoothing MIDI Values

For ultra-smooth parameter changes, add low-pass filtering:

```javascript
register('smoothed', s => {
  const target = 30 + globalThis.MIDI[1] * 50;
  const smoothing = 0.999; // Higher = smoother but slower

  s.state[0] = s.state[0] || target;
  s.state[0] = s.state[0] * smoothing + target * (1 - smoothing);

  const freq = s.state[0];
  // Use smoothed freq...
});
```

---

*MIDI + Aither = Real-time sonic exploration* 🎛️
