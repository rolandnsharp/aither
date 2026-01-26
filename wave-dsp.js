// wave-dsp.js
// A functional DSP library wrapping genish.js

// Check if genish is loaded
if (typeof genish === 'undefined') {
  throw new Error('genish.js is not loaded. Make sure it is included before wave-dsp.js');
}

// Re-export genish functions for convenience
const sin = (freq) => genish.cycle(freq);

const gain = (amount) => (input) => {
  return genish.mul(input, amount);
};

const clip = (limit) => (input) => {
  const absLimit = Math.abs(limit);
  return genish.clamp(input, -absLimit, absLimit);
};

const reverb = (drywet = 0.5, room = 0.8, damping = 0.5) => (input) => {
    return genish.freeverb(input, drywet, room, damping);
};

const pipe = (...fns) => (initialValue) => {
  return fns.reduce((acc, fn) => fn(acc), initialValue);
};

// Make functions available globally in the browser context
window.sin = sin;
window.gain = gain;
window.clip = clip;
window.reverb = reverb;
window.pipe = pipe;
