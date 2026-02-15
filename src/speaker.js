// Aither Speaker Adapter — pipes engine audio to system speakers.
// This is a platform-specific adapter. Future adapters (jack.js, webaudio.js)
// will replace this with their own output mechanism.

import Speaker from 'speaker';
import { Readable } from 'stream';
import { config } from './engine.js';

class AudioStream extends Readable {
    constructor(processFn, options) {
        super(options);
        this.processFn = processFn;
    }

    _read(size) {
        const buffer = this.processFn();
        this.push(Buffer.from(buffer.buffer));
    }
}

export function startStream(processFn) {
    const speaker = new Speaker({
        channels: config.CHANNELS,
        bitDepth: config.BIT_DEPTH,
        sampleRate: config.SAMPLE_RATE,
        float: true,
    });

    const audioStream = new AudioStream(processFn);
    audioStream.pipe(speaker);
    console.log('Audio transport initialized and stream started.');
}
