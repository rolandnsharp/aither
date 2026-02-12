// Aither Audio Engine (REPL-Driven)

import { startStream, config } from './speaker.js';
import * as dsp from './dsp.js';
import dgram from 'dgram';

// --- High-Performance Configuration ---
const STATE_SIZE = 65536;
const MAX_SIGNALS = 512;
export const SLOTS_PER_SIGNAL = Math.floor(STATE_SIZE / MAX_SIGNALS);

// --- Global Persistent State ---
// This pool is for the user's signal-specific state (s.state)
globalThis.LEL_STATE ??= new Float64Array(STATE_SIZE);
globalThis.LEL_REGISTRY ??= new Map(); // Stores { fn, stateObject, helperKeys[] }
globalThis.LEL_OFFSETS ??= new Map();

const STATE = globalThis.LEL_STATE;
const REGISTRY = globalThis.LEL_REGISTRY;
const OFFSETS = globalThis.LEL_OFFSETS;

// --- Global Helper State Pool (managed by helpers.js) ---
// This pool is for ALL helper instances across ALL signals.
// Large size needed for delay lines (1 second at 48kHz = 48,000 samples)
const HELPER_MEMORY_SIZE = 1048576; // 1 million slots = ~8MB (plenty for delays)

// Reinitialize if size doesn't match (handles config changes between runs)
if (!globalThis.LEL_HELPER_MEMORY || globalThis.LEL_HELPER_MEMORY.length !== HELPER_MEMORY_SIZE) {
    globalThis.LEL_HELPER_MEMORY = new Float64Array(HELPER_MEMORY_SIZE);
    globalThis.LEL_HELPER_SLOT_MAP = new Map();
    globalThis.LEL_HELPER_NEXT_SLOT = 0;
    console.log(`[Aither] Initialized helper memory pool: ${HELPER_MEMORY_SIZE} slots (~${(HELPER_MEMORY_SIZE * 8 / 1024 / 1024).toFixed(1)}MB)`);
} else {
    globalThis.LEL_HELPER_SLOT_MAP ??= new Map();
    globalThis.LEL_HELPER_NEXT_SLOT ??= 0;
}

// Expose the global helper state for `claimStateBlock` in helpers.js
Object.assign(globalThis.LEL_HELPER_STATE_ACCESSOR = {}, {
    HELPER_MEMORY: globalThis.LEL_HELPER_MEMORY,
    SLOT_MAP: globalThis.LEL_HELPER_SLOT_MAP,
    NEXT_SLOT: globalThis.LEL_HELPER_NEXT_SLOT,
    // We will ensure that NEXT_SLOT is mutable by changing its type to an object or a SharedArrayBuffer atomic
    // For now, let's manage NEXT_SLOT directly in globalThis.LEL_HELPER_STATE
});

let position = { x: 0, y: 0, z: 0 };

// --- The 's' Object (The "Universe" context) ---
const s = {
    t: 0,
    dt: 1 / config.SAMPLE_RATE,
    sr: config.SAMPLE_RATE,
    idx: 0,
    get position() { return position },
    name: '', // Will be set per-signal in the audio loop
    state: null,
    // Add LEL_HELPER_STATE_ACCESSOR here for helpers to access.
    // No, helpers will access globalThis.LEL_HELPER_STATE directly.
};

// --- Public API (exposed to REPL via `eval`) ---

const api = {
    ...dsp, // Expose all DSP functions directly

    register: (name, fn) => {
        // --- The "Upsert" Logic ---
        // If a signal with this name already exists, unregister it first.
        // This performs garbage collection on the old helper state before
        // the new function chain re-claims what it needs.
        if (REGISTRY.has(name)) {
            api.unregister(name);
        }

        // Reset the helper's per-signal-chain counter at the start of every registration.
        // This is crucial for stable helper state keys within a signal's composition.
        dsp.resetHelperCounterInternal(); // Call the internal reset

        let offset;
        if (OFFSETS.has(name)) {
            offset = OFFSETS.get(name);
        } else {
            let hash = (str => { let h=5381; for(let i=0;i<str.length;i++) h=(h*33)^str.charCodeAt(i); return h>>>0; })(name);
            let attempts = 0;
            let potentialOffset;
            const existingOffsets = new Set(OFFSETS.values());
            do {
                potentialOffset = ((hash + attempts) % MAX_SIGNALS) * SLOTS_PER_SIGNAL;
                attempts++;
                if (attempts > MAX_SIGNALS) {
                    console.error(`[FATAL] No available state slots for "${name}". Max signals reached.`);
                    return;
                }
            } while (existingOffsets.has(potentialOffset));
            offset = potentialOffset;
            OFFSETS.set(name, offset);
            console.log(`[Aither] Allocated new permanent offset ${offset} for "${name}".`);
        }
        const stateSubarray = STATE.subarray(offset, offset + SLOTS_PER_SIGNAL);
        REGISTRY.set(name, { fn, stateObject: stateSubarray }); 
        console.log(`[Aither] Registered function for "${name}".`);
    },
    
    unregister: (name) => {
        if (!REGISTRY.has(name)) {
            console.warn(`[Aither] Signal "${name}" not found for unregistration.`);
            return;
        }

        // 1. Remove the signal function from the active registry.
        REGISTRY.delete(name);
        console.log(`[Aither] Unregistered function for "${name}".`);

        // 2. Perform Garbage Collection on the helper state map.
        //    We delete all helper keys associated with this signal name.
        const map = globalThis.LEL_HELPER_SLOT_MAP;
        if (!map) return; // Should not happen after init, but for safety.

        let collectedCount = 0;
        const prefix = `${name}_`;
        for (const key of Array.from(map.keys())) { // Iterate over a copy as we're modifying the map
            if (key.startsWith(prefix)) {
                map.delete(key);
                collectedCount++;
            }
        }
        // Note: The freed memory in LEL_HELPER_MEMORY is not yet compacted.
        // This is a future optimization if memory fragmentation becomes an issue.
        console.log(`[Aither] GC: Collected ${collectedCount} helper state slot(s) for "${name}".`);
    },

    // Musical aliases
    play: (name, fn) => api.register(name, fn),
    stop: (name) => api.unregister(name),

    clear: (fullReset = false) => {
        REGISTRY.clear();
        if (fullReset) {
            OFFSETS.clear();
            STATE.fill(0);
            // Also clear all helper state on full reset.
            if (globalThis.LEL_HELPER_SLOT_MAP) globalThis.LEL_HELPER_SLOT_MAP.clear();
            if (globalThis.LEL_HELPER_STATE) globalThis.LEL_HELPER_STATE.nextSlot = 0; // Reset nextSlot
        }
        console.log('[Aither] Cleared function registry.');
    },
    
    setPosition: (newPosition) => {
        position = { ...position, ...newPosition };
    }
};

// --- Make API global for live-session.js and REPL ---
Object.assign(globalThis, api);

// --- Audio Engine ---
const outputBuffer = new Float32Array(config.BUFFER_SIZE * config.STRIDE);

function generateAudioChunk() {
    for (let i = 0; i < config.BUFFER_SIZE; i++) {
        let left = 0, right = 0;
        s.t += s.dt;
        s.idx = i;

        for (const [name, { fn, stateObject }] of REGISTRY.entries()) {
            s.state = stateObject;
            s.name = name;
            const result = fn(s);
            if (Array.isArray(result)) {
                left += result[0] || 0;
                right += result[1] || 0;
            } else {
                left += result || 0;
                right += result || 0;
            }
        }
        outputBuffer[i * config.STRIDE] = Math.tanh(left);
        outputBuffer[i * config.STRIDE + 1] = Math.tanh(right);
    }
    return outputBuffer;
}

// --- Main Execution ---
async function start() {
    if (globalThis.AITHER_ENGINE_INSTANCE) {
        // If engine is already running, just reload the session
        console.log('[Aither] Hot-reload detected. Rerunning live-session.js.');
        await import('../live-session.js?' + Date.now()); // Cache-bust
        return;
    }

    console.log('[Aither] Starting audio engine...');
    api.clear(true); // Perform full reset on cold start

    startStream(generateAudioChunk);
    globalThis.AITHER_ENGINE_INSTANCE = { status: 'running', api };

    // --- REPL Server ---
    const REPL_PORT = 41234;
    const REPL_HOST = '127.0.0.1';
    const server = dgram.createSocket('udp4');
    server.on('listening', () => {
        console.log(`[Aither] REPL Ready. Listening on ${REPL_HOST}:${REPL_PORT}`);
        console.log(`[Aither] Use 'aither repl' or 'aither send <code>' to interact.`);
    });
    server.on('message', (msg) => {
        const code = msg.toString();
        console.log(`[REPL] Received ${msg.length} bytes. Evaluating...`);
        try {
            // Use a Function constructor to create a scoped eval.
            // This ensures all our API functions are available in the REPL context.
            const scopedEval = new Function(...Object.keys(api), code);
            scopedEval(...Object.values(api));
            console.log('[REPL] Evaluation successful.');
        } catch (e) {
            console.error('[REPL] Evaluation error:', e.message);
        }
    });
    server.bind(REPL_PORT, REPL_HOST);

    // Load startup script AFTER server is ready (with await to ensure API is available)
    console.log('[Aither] Loading initial session from live-session.js...');
    try {
        await import('../live-session.js');
    } catch (e) {
        console.error('[Aither] Error loading session file:', e.message);
    }
}



start();
