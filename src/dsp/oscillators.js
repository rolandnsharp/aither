// Aither DSP — Phase-continuous oscillators.
//
// All oscillators use a phase accumulator in helper memory for
// continuity across hot-reloads. Frequency args accept a number
// or a function of s for modulation.
//
// Usage: oscillators are signal sources, not processors.
//   play('tone', sin(440))
//   play('vibrato', sin(s => 440 + Math.sin(s.t * 5) * 10))

import { expand } from './state.js';

const TAU = 2 * Math.PI;

// Oscillators are sources (no input signal), but expand() expects one.
// We use a dummy signal that returns 0 and ignore the input in the mono fn.
const _dummy = _s => 0;

// --- Sine ---
const sin_mono = (s, _input, mem, addr, _ch, freq) => {
    const f = typeof freq === 'function' ? freq(s) : freq;
    mem[addr] = (mem[addr] + f / s.sr) % 1.0;
    return Math.sin(mem[addr] * TAU);
};
const _sin = expand(sin_mono, 'sin', 1);
export const sin = (freq) => _sin(_dummy, freq);

// --- Sawtooth ---
const saw_mono = (s, _input, mem, addr, _ch, freq) => {
    const f = typeof freq === 'function' ? freq(s) : freq;
    mem[addr] = (mem[addr] + f / s.sr) % 1.0;
    return mem[addr] * 2 - 1;
};
const _saw = expand(saw_mono, 'saw', 1);
export const saw = (freq) => _saw(_dummy, freq);

// --- Triangle ---
const tri_mono = (s, _input, mem, addr, _ch, freq) => {
    const f = typeof freq === 'function' ? freq(s) : freq;
    mem[addr] = (mem[addr] + f / s.sr) % 1.0;
    return Math.abs(mem[addr] * 4 - 2) - 1;
};
const _tri = expand(tri_mono, 'tri', 1);
export const tri = (freq) => _tri(_dummy, freq);

// --- Square ---
const square_mono = (s, _input, mem, addr, _ch, freq) => {
    const f = typeof freq === 'function' ? freq(s) : freq;
    mem[addr] = (mem[addr] + f / s.sr) % 1.0;
    return mem[addr] < 0.5 ? 1 : -1;
};
const _square = expand(square_mono, 'square', 1);
export const square = (freq) => _square(_dummy, freq);

// --- Pulse (variable duty cycle) ---
const pulse_mono = (s, _input, mem, addr, _ch, freq, width) => {
    const f = typeof freq === 'function' ? freq(s) : freq;
    const w = typeof width === 'function' ? width(s) : width;
    mem[addr] = (mem[addr] + f / s.sr) % 1.0;
    return mem[addr] < w ? 1 : -1;
};
const _pulse = expand(pulse_mono, 'pulse', 1);
export const pulse = (freq, width) => _pulse(_dummy, freq, width);

// --- White Noise (stateless) ---
export const noise = () => _s => Math.random() * 2 - 1;
