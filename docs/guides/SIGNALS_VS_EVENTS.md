# Signals vs Events: Why Aither Looks Different

## Two Models of Sound

Most live coding environments are **event-based**: you schedule discrete notes
over time. Aither is **signal-based**: you describe the continuous shape of
sound at every sample.

### Sonic Pi (Events)

```ruby
loop do
  play :c4, release: 0.2
  sleep 0.5
end
```

"Play a note, wait, repeat." The engine handles the sound between events.

### SuperCollider (Events)

```supercollider
Pbind(\freq, 261, \dur, 0.5).play;
```

Same idea — a pattern emits events, synths handle the audio.

### Aither (Signals)

```javascript
play('pulse', s => {
  const period = 0.5;
  const phase = (s.t % period) / period;
  return phase < 0.1 ? Math.sin(2 * Math.PI * 261 * s.t) * 0.3 : 0;
})
```

"At every sample, what is the amplitude?" There are no events, no scheduler,
no note-on/note-off. The function IS the instrument, the score, and the clock.

## The Trade-Off

**Event-based** code is concise for note-like music. One line per note.
**Signal-based** code is verbose for simple patterns but powerful for
continuous textures, smooth transitions, and audio-rate modulation.

| | Events (Sonic Pi) | Signals (Aither) |
|---|---|---|
| Simple melody | 3 lines | 5-8 lines |
| Drone + filter sweep | Awkward | Natural |
| Audio-rate FM | Not possible | Just multiply |
| Glitch / granular | Library required | Math on `s.t` |
| Cross-signal modulation | Routing buses | Just call another fn |

Aither trades brevity on simple patterns for power on everything else.

## Closing the Gap with Helpers

The verbosity shrinks as your DSP vocabulary grows. Helpers are composable
building blocks that wrap common patterns:

### Without helpers

```javascript
play('kick', s => {
  const bps = 130 / 60;
  const phase = (s.t * bps) % 1;
  const env = phase < 0.05 ? 1 - (phase / 0.05) : 0;
  const freq = 60 + 200 * env;
  return Math.sin(2 * Math.PI * freq * s.t) * env * 0.8;
})
```

### With helpers

```javascript
play('kick', s => {
  const env = decay(gate(130/60, 0.05, s), 0.05, s);
  return sin(60 + 200 * env, s) * env * 0.8;
})
```

The helpers don't add new concepts — they're just shorthand for patterns you
use repeatedly. `gate()` is a square wave mapped to 0/1. `decay()` is an
exponential ramp down. `sin()` is a phase-continuous oscillator. Each one is
still a signal, composable with everything else.

## FM Synthesis Through Composition

FM synthesis is a perfect example of composability. There's no dedicated FM
function — you just use one oscillator to modulate another's frequency:

```javascript
// The modulator: a sine wave at 280 Hz
const mod = sin(280);

// The carrier: its frequency is 440 ± 200 Hz, driven by the modulator
const carrier = sin(s => 440 + mod(s) * 200);

play('bell', carrier)
```

Because oscillators accept functions as frequency arguments, FM is free.
And because any signal can modulate any other, you're not limited to
sine-on-sine:

```javascript
// Sawtooth modulator for harsher timbre
const mod = saw(280);
const carrier = sin(s => 440 + mod(s) * 200);

// Modulate the modulator (FM feedback / cascaded operators)
const lfo = tri(0.5);
const mod = sin(s => 280 + lfo(s) * 50);
const carrier = sin(s => 440 + mod(s) * 200);

// Evolving depth — modulation intensity changes over time
const mod = sin(280);
const carrier = sin(s => 440 + mod(s) * Math.sin(s.t * 0.3) * 500);
```

This is the DX7 in three lines — no special API, just signals modulating
signals.

## The Key Insight

In Aither, there is no distinction between:
- A clock and an oscillator
- An envelope and a signal
- A sequencer and a function
- A trigger and a fast envelope

They're all `f(s) -> sample`. This is why you don't need `loop`, `sleep`,
`Pbind`, or a scheduler. Time is `s.t`. Repetition is modulo. Memory is
`s.state`. Everything else emerges from composition.

See [The Aither Philosophy of Rhythm](RHYTHM_PHILOSOPHY.md) for building
complex rhythmic structures from signals.
