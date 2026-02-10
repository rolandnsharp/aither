// src/arche/rhythmos/helpers.js - Rhythmos Paradigm Helper Functions
// ============================================================================
// Functional helpers for building signals with pipe/compose within the Rhythmos paradigm.
// All signal processors are dimension-agnostic (work with mono, stereo, etc.)
// ============================================================================

// ============================================================================
// COMPOSITION
// ============================================================================

// Left-to-right function composition
export const pipe = (...fns) => fns.reduce((acc, fn) => fn(acc));

// Right-to-left function composition
export const compose = (...fns) => pipe(...fns.reverse());

// ============================================================================
// OSCILLATORS (Stateful - need state slots)
// ============================================================================

// Sine wave oscillator
export const sin = (freq) => (state, idx, sampleRate) => {
  const phaseIncrement = freq / sampleRate; // Pre-compute phase increment
  return {
    update: () => {
      state[idx] = ((state[idx] || 0) + phaseIncrement) % 1.0;
      return [Math.sin(state[idx] * 2 * Math.PI)];
    }
  };
};

// Sawtooth wave oscillator
export const saw = (freq) => (state, idx, sampleRate) => {
  const phaseIncrement = freq / sampleRate; // Pre-compute phase increment
  return {
    update: () => {
      state[idx] = ((state[idx] || 0) + phaseIncrement) % 1.0;
      return [state[idx] * 2 - 1]; // Range: -1 to 1
    }
  };
};

// Square wave oscillator
export const square = (freq) => (state, idx, sampleRate) => {
  const phaseIncrement = freq / sampleRate; // Pre-compute phase increment
  return {
    update: () => {
      state[idx] = ((state[idx] || 0) + phaseIncrement) % 1.0;
      return [state[idx] < 0.5 ? -1 : 1];
    }
  };
};

// Triangle wave oscillator
export const tri = (freq) => (state, idx, sampleRate) => {
  const phaseIncrement = freq / sampleRate; // Pre-compute phase increment
  return {
    update: () => {
      state[idx] = ((state[idx] || 0) + phaseIncrement) % 1.0;
      const phase = state[idx];
      return [phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4];
    }
  };
};

// Low-frequency oscillator (returns unipolar 0-1)
export const lfo = (freq) => (state, idx, sampleRate) => {
  const phaseIncrement = freq / sampleRate; // Pre-compute phase increment
  return {
    update: () => {
      state[idx] = ((state[idx] || 0) + phaseIncrement) % 1.0;
      return [(Math.sin(state[idx] * 2 * Math.PI) + 1) * 0.5];
    }
  };
};

// ============================================================================
// SIGNAL PROCESSORS (Stateless - dimension-agnostic)
// ============================================================================

// Multiply signal by a constant (amplitude/gain)
export const gain = (amount) => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => up.update().map(s => s * amount)
  };
};

// Add a constant offset to signal
export const offset = (amount) => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => up.update().map(s => s + amount)
  };
};

// Hard clip signal to range [-1, 1]
export const clip = () => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => up.update().map(s => Math.max(-1, Math.min(1, s)))
  };
};

// Soft clip using tanh
export const softClip = () => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => up.update().map(s => Math.tanh(s))
  };
};

// ============================================================================
// MIXING & COMBINING
// ============================================================================

// Mix multiple signals together (sum)
export const mix = (...signals) => (state, idx, sampleRate) => {
  // Allocate state slots for each signal
  const sources = signals.map((sig, i) => sig(state, idx + i, sampleRate));

  return {
    update: () => {
      const outputs = sources.map(src => src.update());
      const maxLen = Math.max(...outputs.map(o => o.length));

      // Sum all signals
      const result = [];
      for (let i = 0; i < maxLen; i++) {
        result[i] = outputs.reduce((sum, out) => sum + (out[i] || 0), 0);
      }
      return result;
    }
  };
};

// Add two signals (alias for mixing two signals)
export const add = (signalA, signalB) => mix(signalA, signalB);

// ============================================================================
// STEREO UTILITIES
// ============================================================================

// Pan a mono signal to stereo (pan: 0=left, 0.5=center, 1=right)
export const pan = (panPos) => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => {
      const [mono] = up.update();
      const left = mono * Math.cos(panPos * Math.PI * 0.5);
      const right = mono * Math.sin(panPos * Math.PI * 0.5);
      return [left, right];
    }
  };
};

// Combine two mono signals into stereo
export const stereo = (leftSig, rightSig) => (state, idx, sampleRate) => {
  const left = leftSig(state, idx, sampleRate);
  const right = rightSig(state, idx + 1, sampleRate);

  return {
    update: () => {
      const l = left.update()[0];
      const r = right.update()[0];
      return [l, r];
    }
  };
};

// Convert stereo to mono (mix down)
export const mono = () => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => {
      const signal = up.update();
      if (signal.length === 1) return signal; // Already mono
      // Average all channels
      const sum = signal.reduce((acc, s) => acc + s, 0);
      return [sum / signal.length];
    }
  };
};

// Duplicate mono to stereo
export const spread = () => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  return {
    update: () => {
      const [mono] = up.update();
      return [mono, mono];
    }
  };
};

// ============================================================================
// MODULATION
// ============================================================================

// Amplitude modulation (multiply two signals)
export const am = (modulator) => (carrier) => (state, idx, sampleRate) => {
  const mod = modulator(state, idx, sampleRate);
  const car = carrier(state, idx + 1, sampleRate);

  return {
    update: () => {
      const modSignal = mod.update()[0];
      const carSignal = car.update();
      return carSignal.map(s => s * modSignal);
    }
  };
};

// ============================================================================
// TIME-BASED EFFECTS
// ============================================================================

// Simple delay (feedback echo)
// delayTime in seconds, feedbackAmt 0-1 (how much signal feeds back)
export const feedback = (delayTime, feedbackAmt) => (upstream) => (state, idx, sampleRate) => {
  const up = upstream(state, idx, sampleRate);
  const bufferSize = Math.ceil(delayTime * sampleRate);
  const stateOffset = idx + 1; // Reserve idx for write position

  return {
    update: () => {
      const input = up.update();
      const writePos = (state[idx] || 0) % bufferSize;

      return input.map((sample, ch) => {
        const readPos = (writePos - bufferSize + bufferSize) % bufferSize;
        const delayedSample = state[stateOffset + readPos * input.length + ch] || 0;
        const output = sample + delayedSample * feedbackAmt;

        // Write output to delay buffer
        state[stateOffset + writePos * input.length + ch] = output;

        return output;
      });

      // Note: This increments write position after processing all channels
      state[idx] = writePos + 1;
    }
  };
};

// ============================================================================
// UTILITIES
// ============================================================================

// Constant signal (useful for testing/modulation)
export const constant = (value) => () => ({
  update: () => [value]
});

// Silence
export const silence = () => constant(0);
