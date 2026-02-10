// engine.js - Main Audio Engine Loop
// ============================================================================
// "The Heart" - High-speed sample generation loop
// ============================================================================

import { ringBuffer } from './storage.js';
import { updateAll } from './aether.js';
import { createTransport } from './transport.js';

// ============================================================================
// Configuration
// ============================================================================

// 48kHz - Pro audio standard, 9% higher resolution than CD quality
export const SAMPLE_RATE = 48000;

// ============================================================================
// Engine State
// ============================================================================

let transport = null;
let isRunning = false;
let fillBufferHandle = null;

// ============================================================================
// Producer Loop (Filling the Well) - setImmediate for maximum throughput
// ============================================================================

function fillBuffer() {
  if (!isRunning) return;

  // Fill aggressively - up to 2048 samples per cycle
  const space = ringBuffer.availableSpace();
  const toFill = Math.min(2048, space);

  for (let i = 0; i < toFill; i++) {
    const vector = updateAll(SAMPLE_RATE);
    if (!ringBuffer.write(vector)) break;
  }

  // Yield to event loop, then immediately continue
  fillBufferHandle = setImmediate(fillBuffer);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the audio engine
 */
export function start() {
  // Singleton Guard: If an engine is already running, do nothing.
  // The hot-reload will have updated the registry, and the existing loop
  // will pick up the changes seamlessly.
  if (globalThis.AETHER_ENGINE_INSTANCE) {
    console.log('[Engine] Hot-reload: Engine already running.');
    return;
  }

  console.log('[Engine] Starting audio engine...');

  // Pre-fill buffer before starting transport
  console.log('[Engine] Pre-filling buffer...');
  const preFillTarget = ringBuffer.size * 0.75; // Fill to 75%
  let preFilled = 0;
  while (preFilled < preFillTarget) {
    const vector = updateAll(SAMPLE_RATE);
    if (!ringBuffer.write(vector)) break;
    preFilled++;
  }
  console.log(`[Engine] Pre-filled ${preFilled} frames`);

  // Create transport (speaker.js for now)
  transport = createTransport('PUSH', ringBuffer, SAMPLE_RATE);

  // Start producer loop (setImmediate for saturation)
  isRunning = true;
  fillBufferHandle = setImmediate(fillBuffer);

  // Store this instance globally
  globalThis.AETHER_ENGINE_INSTANCE = { stop };

  console.log(`[Engine] Running at ${SAMPLE_RATE}Hz, STRIDE=${ringBuffer.stride}`);
}

/**
 * Stop the audio engine
 */
export function stop() {
  if (!isRunning) return;

  console.log('[Engine] Stopping audio engine...');

  if (fillBufferHandle) {
    clearImmediate(fillBufferHandle);
    fillBufferHandle = null;
  }
  isRunning = false;

  if (transport) {
    transport.stop();
    transport = null;
  }

  globalThis.AETHER_ENGINE_INSTANCE = null;
  console.log('[Engine] Stopped');
}

/**
 * Get engine status
 */
export function status() {
  return {
    running: isRunning,
    sampleRate: SAMPLE_RATE,
    stride: ringBuffer.stride,
    bufferSize: ringBuffer.size,
    bufferFill: ringBuffer.availableData(),
    bufferSpace: ringBuffer.availableSpace(),
  };
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\n[Engine] Received SIGINT, shutting down...');
  stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Engine] Received SIGTERM, shutting down...');
  stop();
  process.exit(0);
});
