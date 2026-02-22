// Aither AudioWorklet Processor — runs engine in the audio thread.

import { config, generateAudioChunk, api } from '../src/engine.js';

// Match AudioWorklet sample rate and quantum size
config.SAMPLE_RATE = sampleRate;
config.BUFFER_SIZE = 128;

// Build eval scope from engine API
const scopeKeys = Object.keys(api);
const scopeValues = Object.values(api);

// Forward console to main thread
const _log = console.log;
const _error = console.error;
let _port = null;

console.log = (...args) => {
    _log(...args);
    if (_port) _port.postMessage({ type: 'console', level: 'log', args: args.map(String) });
};
console.error = (...args) => {
    _error(...args);
    if (_port) _port.postMessage({ type: 'console', level: 'error', args: args.map(String) });
};

class AitherProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        _port = this.port;
        this.port.onmessage = (e) => this.handleMessage(e);
    }

    handleMessage(e) {
        if (e.data.type === 'eval') {
            try {
                const fn = new Function(...scopeKeys, e.data.code);
                fn(...scopeValues);
                this.port.postMessage({ type: 'result', ok: true });
            } catch (err) {
                this.port.postMessage({ type: 'result', ok: false, error: err.message });
            }
        }
    }

    process(inputs, outputs) {
        const chunk = generateAudioChunk();
        const out = outputs[0];
        const left = out[0];
        const right = out[1];
        if (left && right) {
            for (let i = 0; i < left.length; i++) {
                left[i] = chunk[i * 2];
                right[i] = chunk[i * 2 + 1];
            }
        }
        return true;
    }
}

registerProcessor('aither-processor', AitherProcessor);
