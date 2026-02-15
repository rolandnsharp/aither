// Aither DSP — Stateful effects (stride-agnostic via expand).

import { expand } from './state.js';

// --- Tremolo ---
const tremolo_mono = (s, input, mem, addr, chan, rate, depth) => {
    if (chan === 0) {
        mem[addr] = (mem[addr] + rate / s.sr) % 1.0;
    }
    const lfo = (Math.sin(mem[addr] * 2 * Math.PI) + 1) * 0.5;
    const mod = 1 - depth + lfo * depth;
    return input * mod;
};
export const tremolo = expand(tremolo_mono, 'tremolo', 1);

// --- Lowpass Filter ---
const lowpass_mono = (s, input, mem, addr, _chan, cutoff) => {
    const cutoffFn = typeof cutoff === 'function' ? cutoff : () => cutoff;
    const alpha = Math.min(1, Math.max(0, cutoffFn(s) / s.sr));
    const z1 = mem[addr] || 0;
    const output = z1 + alpha * (input - z1);
    mem[addr] = output;
    return output;
};
export const lowpass = expand(lowpass_mono, 'lowpass', 1);

// --- Delay ---
const delay_mono = (s, input, mem, addr, _chan, maxTime, time) => {
    const bufferLength = Math.floor(maxTime * s.sr);
    const cursorSlot = addr;
    const bufferStart = addr + 1;

    const timeFn = typeof time === 'function' ? time : () => time;
    const delaySamples = Math.min(bufferLength - 1, Math.floor(timeFn(s) * s.sr));

    let writeCursor = Math.floor(mem[cursorSlot]);
    if (isNaN(writeCursor) || writeCursor < 0 || writeCursor >= bufferLength) writeCursor = 0;

    mem[bufferStart + writeCursor] = input;

    const readCursor = (writeCursor - delaySamples + bufferLength) % bufferLength;
    const output = mem[bufferStart + readCursor];

    mem[cursorSlot] = (writeCursor + 1) % bufferLength;
    return output;
};
export const delay = expand(delay_mono, 'delay', (maxTime) => 1 + Math.floor(maxTime * 48000));

// --- Feedback Delay ---
const feedback_mono = (s, input, mem, addr, _chan, maxTime, time, feedbackAmt) => {
    const bufferLength = Math.floor(maxTime * s.sr);
    const cursorSlot = addr;
    const bufferStart = addr + 1;

    const timeFn = typeof time === 'function' ? time : () => time;
    const feedbackFn = typeof feedbackAmt === 'function' ? feedbackAmt : () => feedbackAmt;

    const delaySamples = Math.min(bufferLength - 1, Math.floor(timeFn(s) * s.sr));
    const fbAmt = feedbackFn(s);

    let writeCursor = Math.floor(mem[cursorSlot]);
    if (isNaN(writeCursor) || writeCursor < 0 || writeCursor >= bufferLength) writeCursor = 0;

    const readCursor = (writeCursor - delaySamples + bufferLength) % bufferLength;
    const delayedSample = mem[bufferStart + readCursor] || 0;

    const output = input + delayedSample * fbAmt;
    mem[bufferStart + writeCursor] = output;

    mem[cursorSlot] = (writeCursor + 1) % bufferLength;
    return output;
};
export const feedback = expand(feedback_mono, 'feedback', (maxTime) => 1 + Math.floor(maxTime * 48000));
