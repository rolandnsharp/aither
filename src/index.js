const Speaker = require('speaker');

// Signal registry for named signals (hot reload support)
const activeSignals = new Map();

// Audio configuration
const SAMPLE_RATE = 48000;
const CHANNELS = 2;  // Stereo
const BIT_DEPTH = 16;

// Global time tracker
let currentTime = 0;

// ============================================================================
// SIGNAL CLASS
// ============================================================================

class Signal {
  constructor(fn, registryName = null) {
    this.fn = fn;
    this.isActive = true;  // Auto-start by default
    this.isFading = false;
    this.fadeStartTime = 0;
    this.fadeDuration = 0;
    this._registryName = registryName;  // Track name for re-registration
  }

  // Evaluate signal at time t
  eval(t) {
    return this.fn(t);
  }

  // Play/stop signal
  play() {
    this.isActive = true;
    this.isFading = false;
    return this;
  }

  stop(fadeTime) {
    if (fadeTime === undefined || fadeTime <= 0) {
      // Instant stop
      this.isActive = false;
      this.isFading = false;
    } else {
      // Fade out over fadeTime seconds
      this.isFading = true;
      this.fadeStartTime = currentTime;
      this.fadeDuration = fadeTime;
    }
    return this;
  }

  // ============================================================================
  // CHAINABLE METHODS
  // ============================================================================

  gain(amount) {
    const original = this.fn;
    const newSignal = new Signal(t => original(t) * amount, this._registryName);
    // Update registry if this signal has a name
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  offset(amount) {
    const original = this.fn;
    const newSignal = new Signal(t => original(t) + amount, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  clip(threshold) {
    const original = this.fn;
    const newSignal = new Signal(t => {
      const sample = original(t);
      return Math.max(-threshold, Math.min(threshold, sample));
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  fold(threshold) {
    const original = this.fn;
    const newSignal = new Signal(t => {
      let sample = original(t);
      // Wavefolder algorithm
      while (sample > threshold) sample = 2 * threshold - sample;
      while (sample < -threshold) sample = -2 * threshold - sample;
      return sample;
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  modulate(other) {
    const original = this.fn;
    const newSignal = new Signal(t => original(t) * other.fn(t), this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  fx(effectFn) {
    const original = this.fn;
    const newSignal = new Signal(t => {
      const sample = original(t);
      // Support both (sample) and (sample, t) signatures
      return effectFn.length === 1 ? effectFn(sample) : effectFn(sample, t);
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  mix(...signals) {
    const original = this.fn;
    const newSignal = new Signal(t => {
      let sum = original(t);
      for (const sig of signals) {
        sum += sig.fn(t);
      }
      return sum;
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  delay(delayTime) {
    const original = this.fn;
    const newSignal = new Signal(t => {
      // Pure functional delay - just look backwards in time
      if (t < delayTime) return 0;
      return original(t - delayTime);
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  feedback(delayTime, feedbackAmount) {
    const original = this.fn;
    const cache = new Map();

    // Recursive feedback with memoization
    const output = t => {
      // Check cache first (for performance)
      const key = Math.round(t * SAMPLE_RATE);
      if (cache.has(key)) return cache.get(key);

      // Base case: before delay starts
      if (t < delayTime) {
        const result = original(t);
        cache.set(key, result);
        return result;
      }

      // Recursive case: include delayed feedback
      const dry = original(t);
      const wet = output(t - delayTime) * feedbackAmount;
      const result = dry + wet;

      cache.set(key, result);
      return result;
    };

    const newSignal = new Signal(output, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  reverb(roomSize = 0.5, decay = 0.5, mix = 0.3) {
    const original = this.fn;

    // Reverb delay times based on room size (in seconds)
    // Using prime number ratios for naturalsounding reflections
    const baseTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0050, 0.0017];
    const delayTimes = baseTimes.map(t => t * (0.5 + roomSize * 1.5));

    // Create caches for each delay line
    const caches = delayTimes.map(() => new Map());

    // Create recursive comb filters (delay + feedback)
    const combFilters = delayTimes.map((delayTime, idx) => {
      const cache = caches[idx];
      const feedback = decay * 0.7; // Scale decay for stability

      return t => {
        const key = Math.round(t * SAMPLE_RATE);
        if (cache.has(key)) return cache.get(key);

        if (t < delayTime) {
          const result = original(t);
          cache.set(key, result);
          return result;
        }

        const input = original(t);
        const delayed = combFilters[idx](t - delayTime) * feedback;
        const result = input + delayed;
        cache.set(key, result);
        return result;
      };
    });

    // Mix all comb filters together
    const newSignal = new Signal(t => {
      const dry = original(t);
      let wet = 0;
      for (const filter of combFilters) {
        wet += filter(t);
      }
      wet = wet / combFilters.length; // Average the filters
      return dry * (1 - mix) + wet * mix;
    }, this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  stereo(right) {
    const stereoSig = new StereoSignal(this, right, this._registryName);
    // If this signal was registered with a name, update the registry with stereo version
    if (this._registryName) {
      activeSignals.set(this._registryName, stereoSig);
    }
    return stereoSig;
  }
}

// ============================================================================
// SIGNAL BUILDER CLASS
// ============================================================================

class SignalBuilder {
  constructor(name) {
    this.name = name;
  }

  // Custom function
  fn(signalFn) {
    const sig = new Signal(signalFn);
    activeSignals.set(this.name, sig);
    return sig;
  }

  // Helper generators
  sin(freq) {
    const sig = new Signal(t => Math.sin(2 * Math.PI * freq * t), this.name);
    activeSignals.set(this.name, sig);
    return sig;
  }

  square(freq) {
    const sig = new Signal(t => {
      const phase = (freq * t) % 1;
      return phase < 0.5 ? 1 : -1;
    }, this.name);
    activeSignals.set(this.name, sig);
    return sig;
  }

  saw(freq) {
    const sig = new Signal(t => {
      const phase = (freq * t) % 1;
      return 2 * phase - 1;
    }, this.name);
    activeSignals.set(this.name, sig);
    return sig;
  }

  tri(freq) {
    const sig = new Signal(t => {
      const phase = (freq * t) % 1;
      return 2 * Math.abs(2 * phase - 1) - 1;
    }, this.name);
    activeSignals.set(this.name, sig);
    return sig;
  }

  noise() {
    const sig = new Signal(() => Math.random() * 2 - 1, this.name);
    activeSignals.set(this.name, sig);
    return sig;
  }
}

// ============================================================================
// STEREO SIGNAL CLASS
// ============================================================================

class StereoSignal {
  constructor(left, right, registryName = null) {
    this.left = left;
    this.right = right;
    this.isStereo = true;
    this.isActive = true;  // Auto-start by default
    this.isFading = false;
    this.fadeStartTime = 0;
    this.fadeDuration = 0;
    this._registryName = registryName;  // Track name for re-registration
  }

  eval(t) {
    return {
      left: this.left.fn(t),
      right: this.right.fn(t)
    };
  }

  // Play/stop signal
  play() {
    this.isActive = true;
    this.isFading = false;
    return this;
  }

  stop(fadeTime) {
    if (fadeTime === undefined || fadeTime <= 0) {
      // Instant stop
      this.isActive = false;
      this.isFading = false;
    } else {
      // Fade out over fadeTime seconds
      this.isFading = true;
      this.fadeStartTime = currentTime;
      this.fadeDuration = fadeTime;
    }
    return this;
  }

  // ============================================================================
  // CHAINABLE METHODS (apply to both channels)
  // ============================================================================

  gain(amount) {
    const newSignal = new StereoSignal(
      new Signal(t => this.left.fn(t) * amount),
      new Signal(t => this.right.fn(t) * amount),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  offset(amount) {
    const newSignal = new StereoSignal(
      new Signal(t => this.left.fn(t) + amount),
      new Signal(t => this.right.fn(t) + amount),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  clip(threshold) {
    const newSignal = new StereoSignal(
      new Signal(t => {
        const sample = this.left.fn(t);
        return Math.max(-threshold, Math.min(threshold, sample));
      }),
      new Signal(t => {
        const sample = this.right.fn(t);
        return Math.max(-threshold, Math.min(threshold, sample));
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  fold(threshold) {
    const newSignal = new StereoSignal(
      new Signal(t => {
        let sample = this.left.fn(t);
        while (sample > threshold) sample = 2 * threshold - sample;
        while (sample < -threshold) sample = -2 * threshold - sample;
        return sample;
      }),
      new Signal(t => {
        let sample = this.right.fn(t);
        while (sample > threshold) sample = 2 * threshold - sample;
        while (sample < -threshold) sample = -2 * threshold - sample;
        return sample;
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  fx(effectFn) {
    const newSignal = new StereoSignal(
      new Signal(t => {
        const sample = this.left.fn(t);
        return effectFn.length === 1 ? effectFn(sample) : effectFn(sample, t);
      }),
      new Signal(t => {
        const sample = this.right.fn(t);
        return effectFn.length === 1 ? effectFn(sample) : effectFn(sample, t);
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  mix(...signals) {
    const newSignal = new StereoSignal(
      new Signal(t => {
        let sum = this.left.fn(t);
        for (const sig of signals) {
          if (sig.isStereo) {
            sum += sig.left.fn(t);
          } else {
            sum += sig.fn(t);
          }
        }
        return sum;
      }),
      new Signal(t => {
        let sum = this.right.fn(t);
        for (const sig of signals) {
          if (sig.isStereo) {
            sum += sig.right.fn(t);
          } else {
            sum += sig.fn(t);
          }
        }
        return sum;
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  delay(delayTime) {
    const newSignal = new StereoSignal(
      new Signal(t => {
        if (t < delayTime) return 0;
        return this.left.fn(t - delayTime);
      }),
      new Signal(t => {
        if (t < delayTime) return 0;
        return this.right.fn(t - delayTime);
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  feedback(delayTime, feedbackAmount) {
    const leftCache = new Map();
    const rightCache = new Map();

    const leftOutput = t => {
      const key = Math.round(t * SAMPLE_RATE);
      if (leftCache.has(key)) return leftCache.get(key);

      if (t < delayTime) {
        const result = this.left.fn(t);
        leftCache.set(key, result);
        return result;
      }

      const dry = this.left.fn(t);
      const wet = leftOutput(t - delayTime) * feedbackAmount;
      const result = dry + wet;
      leftCache.set(key, result);
      return result;
    };

    const rightOutput = t => {
      const key = Math.round(t * SAMPLE_RATE);
      if (rightCache.has(key)) return rightCache.get(key);

      if (t < delayTime) {
        const result = this.right.fn(t);
        rightCache.set(key, result);
        return result;
      }

      const dry = this.right.fn(t);
      const wet = rightOutput(t - delayTime) * feedbackAmount;
      const result = dry + wet;
      rightCache.set(key, result);
      return result;
    };

    const newSignal = new StereoSignal(new Signal(leftOutput), new Signal(rightOutput), this._registryName);
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }

  reverb(roomSize = 0.5, decay = 0.5, mix = 0.3) {
    // Reverb delay times (in seconds)
    const baseTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0050, 0.0017];
    const delayTimes = baseTimes.map(t => t * (0.5 + roomSize * 1.5));

    // Create separate caches for left and right channels
    const leftCaches = delayTimes.map(() => new Map());
    const rightCaches = delayTimes.map(() => new Map());

    // Create comb filters for left channel
    const leftFilters = delayTimes.map((delayTime, idx) => {
      const cache = leftCaches[idx];
      const feedback = decay * 0.7;

      return t => {
        const key = Math.round(t * SAMPLE_RATE);
        if (cache.has(key)) return cache.get(key);

        if (t < delayTime) {
          const result = this.left.fn(t);
          cache.set(key, result);
          return result;
        }

        const input = this.left.fn(t);
        const delayed = leftFilters[idx](t - delayTime) * feedback;
        const result = input + delayed;
        cache.set(key, result);
        return result;
      };
    });

    // Create comb filters for right channel (slightly different times for stereo width)
    const rightFilters = delayTimes.map((delayTime, idx) => {
      const cache = rightCaches[idx];
      const feedback = decay * 0.7;
      // Slightly offset delay times for stereo effect
      const offsetTime = delayTime * 1.03;

      return t => {
        const key = Math.round(t * SAMPLE_RATE);
        if (cache.has(key)) return cache.get(key);

        if (t < offsetTime) {
          const result = this.right.fn(t);
          cache.set(key, result);
          return result;
        }

        const input = this.right.fn(t);
        const delayed = rightFilters[idx](t - offsetTime) * feedback;
        const result = input + delayed;
        cache.set(key, result);
        return result;
      };
    });

    const newSignal = new StereoSignal(
      new Signal(t => {
        const dry = this.left.fn(t);
        let wet = 0;
        for (const filter of leftFilters) {
          wet += filter(t);
        }
        wet = wet / leftFilters.length;
        return dry * (1 - mix) + wet * mix;
      }),
      new Signal(t => {
        const dry = this.right.fn(t);
        let wet = 0;
        for (const filter of rightFilters) {
          wet += filter(t);
        }
        wet = wet / rightFilters.length;
        return dry * (1 - mix) + wet * mix;
      }),
      this._registryName
    );
    if (this._registryName) {
      activeSignals.set(this._registryName, newSignal);
    }
    return newSignal;
  }
}

// ============================================================================
// MAIN SIGNAL FUNCTION
// ============================================================================

function signal(nameOrFn, fn) {
  // signal('name') - returns SignalBuilder for chaining
  if (typeof nameOrFn === 'string' && fn === undefined) {
    // Auto-start audio on first signal
    if (!isPlaying) {
      startAudio();
    }
    return new SignalBuilder(nameOrFn);
  }

  // Auto-start audio on first signal (for other signatures)
  if (!isPlaying) {
    startAudio();
  }

  // signal('name', Signal) - accepts Signal objects directly
  if (typeof nameOrFn === 'string' && fn instanceof Signal) {
    activeSignals.set(nameOrFn, fn);
    return fn;
  }

  // signal('name', StereoSignal) - accepts StereoSignal objects directly
  if (typeof nameOrFn === 'string' && fn instanceof StereoSignal) {
    activeSignals.set(nameOrFn, fn);
    return fn;
  }

  // signal('name', t => ...)
  if (typeof nameOrFn === 'string' && typeof fn === 'function') {
    const sig = new Signal(fn);
    activeSignals.set(nameOrFn, sig);
    return sig;
  }

  // signal('name', { left: ..., right: ... })
  if (typeof nameOrFn === 'string' && typeof fn === 'object' && fn.left && fn.right) {
    const stereoSig = new StereoSignal(new Signal(fn.left), new Signal(fn.right));
    activeSignals.set(nameOrFn, stereoSig);
    return stereoSig;
  }

  // signal(t => ...) - unnamed signal
  if (typeof nameOrFn === 'function') {
    return new Signal(nameOrFn);
  }

  throw new Error('Invalid signal() arguments');
}

// ============================================================================
// HELPER GENERATORS
// ============================================================================

signal.sin = function(freq) {
  return new Signal(t => Math.sin(2 * Math.PI * freq * t));
};

signal.square = function(freq) {
  return new Signal(t => {
    const phase = (freq * t) % 1;
    return phase < 0.5 ? 1 : -1;
  });
};

signal.saw = function(freq) {
  return new Signal(t => {
    const phase = (freq * t) % 1;
    return 2 * phase - 1;
  });
};

signal.tri = function(freq) {
  return new Signal(t => {
    const phase = (freq * t) % 1;
    return 2 * Math.abs(2 * phase - 1) - 1;
  });
};

signal.noise = function() {
  return new Signal(() => Math.random() * 2 - 1);
};

// ============================================================================
// MODULE-LEVEL FUNCTIONS
// ============================================================================

signal.mix = function(...signals) {
  return new Signal(t => {
    let sum = 0;
    for (const sig of signals) {
      sum += sig.fn(t);
    }
    return sum;
  });
};

signal.stereo = function(left, right) {
  return new StereoSignal(left, right);
};

// ============================================================================
// AUDIO OUTPUT
// ============================================================================

let speaker = null;
let isPlaying = false;

function startAudio() {
  if (isPlaying) return;

  speaker = new Speaker({
    channels: CHANNELS,
    bitDepth: BIT_DEPTH,
    sampleRate: SAMPLE_RATE
  });

  isPlaying = true;
  currentTime = 0;

  // Generate audio in chunks
  const BUFFER_SIZE = 4096;
  const buffer = Buffer.alloc(BUFFER_SIZE * CHANNELS * (BIT_DEPTH / 8));

  function writeNextBuffer() {
    if (!isPlaying) return;

    fillBuffer(buffer, currentTime);
    currentTime += BUFFER_SIZE / SAMPLE_RATE;

    speaker.write(buffer, writeNextBuffer);
  }

  writeNextBuffer();
}

function fillBuffer(buffer, startTime) {
  const samplesPerChannel = buffer.length / CHANNELS / (BIT_DEPTH / 8);

  for (let i = 0; i < samplesPerChannel; i++) {
    const t = startTime + (i / SAMPLE_RATE);

    // Mix all active signals
    let leftSample = 0;
    let rightSample = 0;

    for (const sig of activeSignals.values()) {
      // Skip if signal is stopped
      if (!sig.isActive && !sig.isFading) continue;

      // Calculate fade envelope if fading
      let fadeGain = 1.0;
      if (sig.isFading) {
        const fadeElapsed = t - sig.fadeStartTime;
        if (fadeElapsed >= sig.fadeDuration) {
          // Fade complete - stop the signal
          sig.isActive = false;
          sig.isFading = false;
          continue;
        }
        // Linear fade from 1 to 0
        fadeGain = 1.0 - (fadeElapsed / sig.fadeDuration);
      }

      if (sig.isStereo) {
        const stereo = sig.eval(t);
        leftSample += stereo.left * fadeGain;
        rightSample += stereo.right * fadeGain;
      } else {
        const mono = sig.eval(t);
        leftSample += mono * fadeGain;
        rightSample += mono * fadeGain;
      }
    }

    // Clamp to [-1, 1]
    leftSample = Math.max(-1, Math.min(1, leftSample));
    rightSample = Math.max(-1, Math.min(1, rightSample));

    // Convert to 16-bit integer
    const leftInt = Math.floor(leftSample * 32767);
    const rightInt = Math.floor(rightSample * 32767);

    // Write to buffer (little-endian)
    const offset = i * CHANNELS * (BIT_DEPTH / 8);
    buffer.writeInt16LE(leftInt, offset);
    buffer.writeInt16LE(rightInt, offset + 2);
  }
}

function stopAudio() {
  isPlaying = false;
  if (speaker) {
    speaker.end();
    speaker = null;
  }
}

// ============================================================================
// REGISTRY MANAGEMENT
// ============================================================================

signal.clear = function() {
  activeSignals.clear();
};

signal.remove = function(name) {
  activeSignals.delete(name);
};

signal.list = function() {
  return Array.from(activeSignals.keys());
};


// ============================================================================
// EXPORTS
// ============================================================================

const rhythm = require('./rhythm');
const melody = require('./melody');
const envelopes = require('./envelopes');
const scales = require('./scales');
const functional = require('./functional');

module.exports = signal;
module.exports.Signal = Signal;
module.exports.SignalBuilder = SignalBuilder;
module.exports.StereoSignal = StereoSignal;
module.exports.startAudio = startAudio;
module.exports.stopAudio = stopAudio;

// Export rhythm utilities
module.exports.step = rhythm.step;
module.exports.euclidean = rhythm.euclidean;

// Export melody utilities
module.exports.freq = melody.freq;
module.exports.mtof = melody.mtof;
module.exports.ftom = melody.ftom;

// Export envelope utilities
module.exports.env = envelopes.env;

// Export scales
module.exports.scales = scales;

// Export functional utilities (Y-combinator, pipe, compose, etc.)
module.exports.Y = functional.Y;
module.exports.pipe = functional.pipe;
module.exports.compose = functional.compose;
module.exports.curry = functional.curry;
module.exports.fp = functional;  // Export all functional utilities
