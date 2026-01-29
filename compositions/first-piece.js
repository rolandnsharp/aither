// compositions/first-piece.js
// ============================================================================
// A stereo composition to test circular panning using `sin` and `cos`.
// ============================================================================

const kanon = require('../src/index');
const { t, sin, cos, mul } = kanon;

// --- Stereo Circle Recipe ---
// This recipe creates a simple oscillator and pans it in a circle.
// The `cos` and `sin` of a low-frequency oscillator (LFO) are used to
// control the left and right channel amplitudes, creating smooth circular motion.
const lfo = mul(t, 0.5); // 0.5 Hz LFO for panning
const signal = sin(mul(t, 440)); // 440Hz tone

const circlePan = t => [
  mul(signal, cos(lfo)), // Left channel = signal * cos(lfo)
  mul(signal, sin(lfo))  // Right channel = signal * sin(lfo)
];
kanon('circle-pan', circlePan);

console.log("Registered 'circle-pan' (stereo).");
console.log("You should hear a 440Hz tone panning in a circle.");
