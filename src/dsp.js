// Aither DSP - Universal, Stride-Agnostic Signal Processors

/**
 * ============================================================================
 * The "Implicitly Persistent" State Model for DSP (Version 3: Finalized)
 * ============================================================================
 *
 * This is the ultimate synthesis of our requirements: terse user experience,
 * zero-GC performance, robust REPL-safe state persistence, and full
 * stride-agnostic multichannel expansion with dynamic buffer sizing.
 *
 * HOW IT WORKS (The "Implicitly Persistent" Core):
 * 1. A global `slotMap` on `globalThis` stores the STARTING ADDRESS for the
 *    state block allocated to each helper instance. This map persists across
 *    hot-reloads (or rather, is explicitly managed by the REPL commands).
 * 2. `claimStateBlock()` generates a stable, REPL-safe key (e.g., "signal-name_helper-type_0").
 *    On the first call for a given helper instance, it allocates a block of
 *    state (`totalBlockSize`) from the global `nextSlot` pool and saves the
 *    starting address to the map.
 *    On subsequent calls, it instantly retrieves the already-saved address.
 * 3. The `helperCounter` (used to generate the stable key) is managed by the
 *    `register` function in `index.js`, which calls `resetHelperCounterInternal()`
 *    before processing each new signal chain.
 *
 *
 * HOW IT WORKS (The "Multichannel Expansion" via `expand()`):
 * 1. The `expand` higher-order function wraps a simple `_mono` helper function.
 *    It now accepts `slotsPerChannel` as a fixed number OR a function that calculates
 *    it dynamically based on the helper's arguments (`(...args) => numSlots`).
 * 2. When an `expand()`ed helper is called (e.g., `lowpass(osc, 800)`),
 *    `expand` first runs its input signal to determine `numChannels` (stride).
 * 3. It then calculates the total `blockSize` required (`numChannels * currentSlotsPerChannel`).
 * 4. It calls `claimStateBlock()` to get the starting address for this entire block.
 * 5. It then iterates `numChannels` times, calling the original `_mono` helper
 *    once for each channel. Each call to `_mono` receives the correct single
 *    channel's input, and the correct `baseAddrForThisChannel` within the block.
 *
 * THE RESULT:
 *   - `live-session.js` code is beautifully terse.
 *   - Helpers are fully composable and automatically adapt to mono/stereo/etc.
 *   - Performance is maximal (zero-GC in hot path).
 *   - State persists for the lifetime of the registered signal.
 *   - Dynamic buffer sizes for helpers like `delay` are handled elegantly.
 */

// Global helper memory pool. Size is set by server.js (1MB), this is a fallback.
globalThis.LEL_HELPER_MEMORY ??= new Float64Array(1048576);
globalThis.LEL_HELPER_SLOT_MAP ??= new Map();
globalThis.LEL_HELPER_NEXT_SLOT ??= 0;
// Free list for recycling memory blocks from unregistered signals.
// Each entry is { offset, size }. Populated by garbageCollectHelpers() in server.js.
globalThis.LEL_HELPER_FREE_LIST ??= [];

// This is the per-signal-chain counter. It is NOT persistent.
let helperCounter = 0;

/**
 * Internally resets the per-signal helper counter. Called by `register` in `index.js`.
 */
export function resetHelperCounterInternal() {
    helperCounter = 0;
}

/**
 * The core state management function for helpers.
 * Generates a stable key and allocates a block of state slots.
 * @param {object} s - The "universe" state object from the engine.
 * @param {string} helperName - The name of the helper (e.g., 'tremolo').
 * @param {number} helperIndex - The helper's stable index in the chain.
 * @param {number} totalBlockSize - The TOTAL number of state slots this helper instance requires across all channels.
 * @returns {number} The starting address of the claimed state block.
 */
function claimStateBlock(s, helperName, helperIndex, totalBlockSize) {
    const helperKey = `${s.name}_${helperName}_${helperIndex}`;

    // Already allocated? Return the existing offset.
    if (globalThis.LEL_HELPER_SLOT_MAP.has(helperKey)) {
        return globalThis.LEL_HELPER_SLOT_MAP.get(helperKey).offset;
    }

    // Try to recycle a block from the free list (populated by garbageCollectHelpers
    // in server.js when a signal is unregistered). The list is sorted by size,
    // so this is a "first-fit" search that minimizes fragmentation.
    const freeList = globalThis.LEL_HELPER_FREE_LIST;
    for (let i = 0; i < freeList.length; i++) {
        const block = freeList[i];
        if (block.size >= totalBlockSize) {
            const startAddr = block.offset;
            freeList.splice(i, 1);
            globalThis.LEL_HELPER_SLOT_MAP.set(helperKey, { offset: startAddr, size: totalBlockSize });
            // Return any leftover space to the free list.
            const leftover = block.size - totalBlockSize;
            if (leftover > 0) {
                freeList.push({ offset: startAddr + totalBlockSize, size: leftover });
                freeList.sort((a, b) => a.size - b.size);
            }
            return startAddr;
        }
    }

    // Bump allocator fallback: allocate from the end of the pool.
    const startAddr = globalThis.LEL_HELPER_NEXT_SLOT;
    globalThis.LEL_HELPER_SLOT_MAP.set(helperKey, { offset: startAddr, size: totalBlockSize });
    globalThis.LEL_HELPER_NEXT_SLOT += totalBlockSize;
    if (globalThis.LEL_HELPER_NEXT_SLOT > globalThis.LEL_HELPER_MEMORY.length) {
        console.error(`[FATAL] Out of HELPER state memory for signal "${s.name}". Helper "${helperName}" failed to allocate ${totalBlockSize} slots. Total available: ${globalThis.LEL_HELPER_MEMORY.length}. Needed: ${globalThis.LEL_HELPER_NEXT_SLOT}.`);
    }
    return startAddr;
}

/**
 * Higher-order function to enable multichannel expansion for stateful helpers.
 * It takes a pure mono DSP function and "upgrades" it to be stride-agnostic.
 * @param {Function} monoLogicFn - A pure function: (s, input, baseAddrForThisChannel, channelIdx, ...args) => output
 * @param {string} helperName - A unique identifier for the helper (e.g., 'lowpass').
 * @param {number|Function} [slotsPerChannelSpecifier=1] - Number of state slots this helper needs PER CHANNEL.
 *                                                       Can be a number or a function: (...args) => numSlots.
 * @returns {Function} A new, stride-agnostic helper function.
 */
function expand(monoLogicFn, helperName, slotsPerChannelSpecifier = 1) {
    return (signal, ...args) => { // This is the function the user calls (e.g., lowpass(osc, 800))
        const helperIndex = helperCounter++; // Claim index in the composition chain

        // Calculate slotsPerChannel dynamically if `slotsPerChannelSpecifier` is a function.
        const currentSlotsPerChannel = typeof slotsPerChannelSpecifier === 'function' 
            ? slotsPerChannelSpecifier(...args) 
            : slotsPerChannelSpecifier;

        return s => { // This is the real-time audio function
            const input = signal(s); // Get the incoming signal (mono or array)
            const numChannels = Array.isArray(input) ? input.length : 1;
            
            const totalBlockSize = numChannels * currentSlotsPerChannel;
            const startAddrOfInstance = claimStateBlock(s, helperName, helperIndex, totalBlockSize);
            
            if (numChannels > 1) {
                const output = [];
                for (let i = 0; i < numChannels; i++) {
                    const baseAddrForThisChannel = startAddrOfInstance + (i * currentSlotsPerChannel);
                    output[i] = monoLogicFn(s, input[i], globalThis.LEL_HELPER_MEMORY, baseAddrForThisChannel, i, ...args);
                }
                return output;
            } else {
                return monoLogicFn(s, input, globalThis.LEL_HELPER_MEMORY, startAddrOfInstance, 0, ...args);
            }
        };
    };
}


// ============================================================================
// FUNCTIONAL COMPOSITION
// ============================================================================
export const pipe = (x, ...fns) => fns.reduce((v, f) => f(v), x);

/**
 * Mix multiple signals together (sum them).
 * Fully stride-agnostic: handles mono, stereo, or N-channel signals.
 * Normalizes output by number of input signals to prevent clipping.
 * @param {...Function} signals - Signal functions to mix
 * @returns {Function} Mixed signal function
 */
export const mix = (...signals) => {
  return s => {
    if (signals.length === 0) return 0;
    if (signals.length === 1) return signals[0](s);

    // Evaluate all signals
    const results = signals.map(sig => sig(s));

    // Determine maximum stride (number of channels)
    let maxStride = 1;
    for (const result of results) {
      if (Array.isArray(result)) {
        maxStride = Math.max(maxStride, result.length);
      }
    }

    // If all mono, return mono sum
    if (maxStride === 1) {
      let sum = 0;
      for (const result of results) {
        sum += (Array.isArray(result) ? result[0] : result) || 0;
      }
      return sum / signals.length;
    }

    // Multi-channel mix
    const output = new Array(maxStride).fill(0);
    for (const result of results) {
      if (Array.isArray(result)) {
        // Multi-channel signal
        for (let i = 0; i < result.length; i++) {
          output[i] += result[i] || 0;
        }
      } else {
        // Mono signal - add to all channels
        for (let i = 0; i < maxStride; i++) {
          output[i] += result || 0;
        }
      }
    }

    // Normalize by number of signals
    for (let i = 0; i < maxStride; i++) {
      output[i] /= signals.length;
    }

    return output;
  };
};


// ============================================================================
// STATEFUL HELPERS (Stride-Agnostic via `expand`)
// ============================================================================

// --- Tremolo Helper Logic ---
const tremolo_mono = (s, input, helperMemory, baseAddrForThisChannel, chan, rate, depth) => {
    // LFO phase is shared across channels for a single tremolo instance.
    if (chan === 0) { // Only update LFO phase once per sample, on the first channel
        const phaseSlot = baseAddrForThisChannel + 0; // Use the first slot of this channel's allocated block
        helperMemory[phaseSlot] = (helperMemory[phaseSlot] + rate / s.sr) % 1.0;
    }
    const lfoPhaseSlot = baseAddrForThisChannel + 0; // Access the (shared) LFO phase
    const lfo = (Math.sin(helperMemory[lfoPhaseSlot] * 2 * Math.PI) + 1) * 0.5;
    const mod = 1 - depth + lfo * depth; // The amplitude modulator
    return input * mod;
};
export const tremolo = expand(tremolo_mono, 'tremolo', 1); // Tremolo needs 1 slot per instance.


// --- Lowpass Filter Helper Logic ---
const lowpass_mono = (s, input, helperMemory, baseAddrForThisChannel, chan, cutoff) => {
    const z1Slot = baseAddrForThisChannel + 0; // The single z1 slot for this channel
    const cutoffFn = typeof cutoff === 'function' ? cutoff : () => cutoff;
    const alpha = cutoffFn(s) / s.sr;
    const z1 = helperMemory[z1Slot] || 0; // Initialize z1 to 0 if first run
    const output = z1 + alpha * (input - z1);
    helperMemory[z1Slot] = output; // Store the new z1
    return output;
};
export const lowpass = expand(lowpass_mono, 'lowpass', 1); // Lowpass needs 1 slot per channel for its z1 state.


// --- Delay Helper Logic ---
// Requires dynamic memory allocation: 1 slot for cursor + bufferSize for the delay buffer.
const delay_mono = (s, input, helperMemory, baseAddrForThisChannel, chan, maxTime, time) => {
    const bufferLength = Math.floor(maxTime * s.sr); // Buffer size for THIS channel
    const cursorSlot = baseAddrForThisChannel + 0; // Cursor at the start of this channel's block
    const channelBufferStart = baseAddrForThisChannel + 1; // Actual buffer starts after cursor
    
    const timeFn = typeof time === 'function' ? time : () => time;
    const delaySamples = Math.min(bufferLength - 1, Math.floor(timeFn(s) * s.sr));
    
    let writeCursor = Math.floor(helperMemory[cursorSlot]);
    if (isNaN(writeCursor) || writeCursor < 0 || writeCursor >= bufferLength) writeCursor = 0; // Initialize/clamp cursor

    // Write the incoming signal to the buffer (into its dedicated channel buffer)
    helperMemory[channelBufferStart + writeCursor] = input;

    // Calculate the read position and get the delayed signal
    const readCursor = (writeCursor - delaySamples + bufferLength) % bufferLength;
    const output = helperMemory[channelBufferStart + readCursor];
    
    // Advance the write cursor for the next sample
    helperMemory[cursorSlot] = (writeCursor + 1) % bufferLength;

    return output;
};
// Delay requires dynamic slots per channel: 1 for cursor + `bufferLength`.
export const delay = expand(delay_mono, 'delay', (maxTime) => 1 + Math.floor(maxTime * 48000));


// --- Feedback Delay Helper Logic ---
// Like delay, but feeds the output back into the buffer (creates regenerating echoes).
// Formula: output = input + delayed_output * feedbackAmount
const feedback_mono = (s, input, helperMemory, baseAddrForThisChannel, chan, maxTime, time, feedbackAmt) => {
    const bufferLength = Math.floor(maxTime * s.sr);
    const cursorSlot = baseAddrForThisChannel + 0;
    const channelBufferStart = baseAddrForThisChannel + 1;

    const timeFn = typeof time === 'function' ? time : () => time;
    const feedbackFn = typeof feedbackAmt === 'function' ? feedbackAmt : () => feedbackAmt;

    const delaySamples = Math.min(bufferLength - 1, Math.floor(timeFn(s) * s.sr));
    const fbAmt = feedbackFn(s);

    let writeCursor = Math.floor(helperMemory[cursorSlot]);
    if (isNaN(writeCursor) || writeCursor < 0 || writeCursor >= bufferLength) writeCursor = 0;

    // Calculate read position and get delayed sample
    const readCursor = (writeCursor - delaySamples + bufferLength) % bufferLength;
    const delayedSample = helperMemory[channelBufferStart + readCursor] || 0;

    // Feedback: output = input + delayed_output * feedbackAmount
    const output = input + delayedSample * fbAmt;

    // Write OUTPUT (with feedback) back to buffer - this is the key difference from delay!
    helperMemory[channelBufferStart + writeCursor] = output;

    // Advance cursor
    helperMemory[cursorSlot] = (writeCursor + 1) % bufferLength;

    return output;
};
// Feedback requires same dynamic slots as delay: 1 for cursor + `bufferLength`.
export const feedback = expand(feedback_mono, 'feedback', (maxTime) => 1 + Math.floor(maxTime * 48000));


// ============================================================================
// STATELESS HELPERS (Stride-Agnostic)
// ============================================================================

export const gain = (signal, amount) => {
  const gainFn = typeof amount === 'function' ? amount : () => amount;
  return s => {
    const value = signal(s);
    const g = gainFn(s);
    if (Array.isArray(value)) {
        return value.map(sample => sample * g);
    }
    return value * g;
  };
};

export const pan = (signal, position) => {
  const posFn = typeof position === 'function' ? position : () => position;
  return s => {
    let value = signal(s);
    // This helper explicitly expects a mono signal and will warn if not.
    if (Array.isArray(value)) {
        console.warn("The 'pan' helper expects a mono signal but received an array. Using the first channel.");
        value = value[0];
    }
    const pos = Math.max(-1, Math.min(1, posFn(s)));
    const angle = (pos * Math.PI) / 4; 
    return [
      value * Math.cos(angle + Math.PI / 4),
      value * Math.sin(angle + Math.PI / 4)
    ];
  };
};
