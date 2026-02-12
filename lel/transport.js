// lel/transport.js - The "Consumer"
// This module's job is to read audio from a generation function
// on demand and send it to the audio hardware.

import Speaker from 'speaker';
import { Readable } from 'stream';

export const config = {
  SAMPLE_RATE: 48000,
  CHANNELS: 2, // Stereo
  BIT_DEPTH: 32,
  BUFFER_SIZE: 1024, // The size of the audio chunks we process
  STRIDE: 2,
};

// A custom Readable stream that generates audio on demand
class AudioStream extends Readable {
  constructor(processFn, options) {
    super(options);
    this.processFn = processFn;
  }

  _read(size) {
    // The speaker library will call _read when it needs more data.
    const buffer = this.processFn();
    // Push a Node.js Buffer, not a Float32Array
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
  console.log('Audio transport initialized and stream started.');

  const audioStream = new AudioStream(processFn);
  audioStream.pipe(speaker);
}
