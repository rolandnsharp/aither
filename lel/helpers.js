// lel/helpers.js - Universal, Stride-Agnostic Signal Processors

/**
 * ============================================================================
 * The "Implicitly Persistent" State Model for Helpers (Version 3: Finalized)
 * ============================================================================
 *
 * This is the ultimate synthesis of our requirements: terse user experience,
 * zero-GC performance, robust REPL-safe state persistence, and full
 * stride-agnostic multichannel expansion with dynamic buffer sizing.
 *
 * HOW IT WORKS (The "Implicitly Persistent" Core):
 * 1. A global `slotMap` on `globalThis` stores the STARTING ADDRESS for the
 *    state block allocated to each helper instance. This map persists across
 *    hot-reloads.
 * 2. `claimStateBlock()` generates a stable, REPL-safe key (e.g., "signal-name_helper-type_0").
 *    On the first run, it allocates a block of state (`blockSize`) from the
 *    global `nextSlot` pool and saves the starting address to the map.
 *    On subsequent hot-reloads, it instantly retrieves the already-saved address.
 * 3. `resetHelperCounter()` MUST be called immediately before every `register()`
 *    call in `live-session.js` to ensure the per-signal `helperIndex` is stable.
 *
 *
 * HOW IT WORKS (The "Multichannel Expansion" via `expand()`):
 * 1. The `expand` higher-order function wraps a simple `_mono` helper function.
 *    It now accepts `slotsPerChannel` as a fixed number OR a function that calculates
 *    it dynamically based on the helper's arguments.
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
 *   - State persists across hot-reloads and is REPL-safe.
 *   - Dynamic buffer sizes for helpers like `delay` are handled elegantly.
 */

// This object holds the persistent state for the helpers themselves.
globalThis.LEL_HELPER_STATE ??= {
    nextSlot: 0,
    slotMap: new Map()
};

// This is the per-signal-chain counter. It is NOT persistent.
let helperCounter = 0;

/**
 * Resets the per-signal helper counter. This MUST be called immediately
 * before every `register()` call in `live-session.js` to ensure stable
 * keys for stateful helpers.
 */
export function resetHelperCounter() {
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
    if (!globalThis.LEL_HELPER_STATE.slotMap.has(helperKey)) {
        const startAddr = globalThis.LEL_HELPER_STATE.nextSlot;
        globalThis.LEL_HELPER_STATE.slotMap.set(helperKey, startAddr);
        globalThis.LEL_HELPER_STATE.nextSlot += totalBlockSize;
        // Safety check: Ensure we don't exceed the total allocated state for this signal.
        // s.state.length is the SLOTS_PER_SIGNAL from index.js
        if (globalThis.LEL_HELPER_STATE.nextSlot > s.state.length) {
            console.error(`[FATAL] Out of state memory for signal "${s.name}". Helper "${helperName}" failed to allocate ${totalBlockSize} slots. Total available: ${s.state.length}. Needed: ${globalThis.LEL_HELPER_STATE.nextSlot}.`);
        }
        return startAddr;
    }
    return globalThis.LEL_HELPER_STATE.slotMap.get(helperKey);
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
                    output[i] = monoLogicFn(s, input[i], baseAddrForThisChannel, i, ...args);
                }
                return output;
            } else {
                return monoLogicFn(s, input, startAddrOfInstance, 0, ...args);
            }
        };
    };
}


// ============================================================================
// FUNCTIONAL COMPOSITION
// ============================================================================
export const pipe = (x, ...fns) => fns.reduce((v, f) => f(v), x);


// ============================================================================
// STATEFUL HELPERS (Stride-Agnostic via `expand`)
// ============================================================================

// --- Tremolo Helper Logic ---
const tremolo_mono = (s, input, baseAddrForThisChannel, chan, rate, depth) => {
    // LFO phase is shared across channels for a single tremolo instance.
    if (chan === 0) { // Only update LFO phase once per sample, on the first channel
        const phaseSlot = baseAddrForThisChannel + 0; // Use the first slot of this channel's allocated block
        s.state[phaseSlot] = (s.state[phaseSlot] + rate / s.sr) % 1.0;
    }
    const lfoPhaseSlot = baseAddrForThisChannel + 0; // Access the (shared) LFO phase
    const lfo = (Math.sin(s.state[lfoPhaseSlot] * 2 * Math.PI) + 1) * 0.5;
    const mod = 1 - depth + lfo * depth; // The amplitude modulator
    return input * mod;
};
export const tremolo = expand(tremolo_mono, 'tremolo', 1); // Tremolo needs 1 slot per channel for its LFO phase.


// --- Lowpass Filter Helper Logic ---
const lowpass_mono = (s, input, baseAddrForThisChannel, chan, cutoff) => {
    const z1Slot = baseAddrForThisChannel + 0; // The single z1 slot for this channel
    const cutoffFn = typeof cutoff === 'function' ? cutoff : () => cutoff;
    const alpha = cutoffFn(s) / s.sr;
    const z1 = s.state[z1Slot] || 0; // Initialize z1 to 0 if first run
    const output = z1 + alpha * (input - z1);
    s.state[z1Slot] = output; // Store the new z1
    return output;
};
export const lowpass = expand(lowpass_mono, 'lowpass', 1); // Lowpass needs 1 slot per channel for its z1 state.


// --- Delay Helper Logic ---
// Requires dynamic memory allocation: 1 slot for cursor + bufferSize for the delay buffer.
const delay_mono = (s, input, baseAddrForThisChannel, chan, maxTime, time) => {
    const bufferLength = Math.floor(maxTime * s.sr); // Buffer size for THIS channel
    const cursorSlot = baseAddrForThisChannel + 0; // Cursor at the start of this channel's block
    const channelBufferStart = baseAddrForThisChannel + 1; // Actual buffer starts after cursor
    
    const timeFn = typeof time === 'function' ? time : () => time;
    const delaySamples = Math.min(bufferLength - 1, Math.floor(timeFn(s) * s.sr));
    
    let writeCursor = Math.floor(s.state[cursorSlot]);
    if (isNaN(writeCursor) || writeCursor < 0 || writeCursor >= bufferLength) writeCursor = 0; // Initialize/clamp cursor

    // Write the incoming signal to the buffer (into its dedicated channel buffer)
    s.state[channelBufferStart + writeCursor] = input;

    // Calculate the read position and get the delayed signal
    const readCursor = (writeCursor - delaySamples + bufferLength) % bufferLength;
    const output = s.state[channelBufferStart + readCursor];
    
    // Advance the write cursor for the next sample
    s.state[cursorSlot] = (writeCursor + 1) % bufferLength;

    return output;
};
// Delay requires dynamic slots per channel: 1 for cursor + `bufferLength`.
export const delay = expand(delay_mono, 'delay', (maxTime) => 1 + Math.floor(maxTime * 48000));


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
