// Aither Audio Engine (REPL-Driven)

import { performance, monitorEventLoopDelay } from 'perf_hooks';
import { startStream, config } from './speaker.js';
import * as dsp from './dsp.js';
import { startReplServer } from './repl-server.js';
import path from 'path';

// --- High-Performance Configuration ---
const STATE_SIZE = 65536;
const MAX_SIGNALS = 512;
export const SLOTS_PER_SIGNAL = Math.floor(STATE_SIZE / MAX_SIGNALS);

// --- Global Persistent State ---
globalThis.LEL_STATE ??= new Float64Array(STATE_SIZE);
globalThis.LEL_REGISTRY ??= new Map();
globalThis.LEL_OFFSETS ??= new Map();
const STATE = globalThis.LEL_STATE;
const REGISTRY = globalThis.LEL_REGISTRY;
const OFFSETS = globalThis.LEL_OFFSETS;

// --- Global Helper State Pool ---
const HELPER_MEMORY_SIZE = 1048576;
if (!globalThis.LEL_HELPER_MEMORY || globalThis.LEL_HELPER_MEMORY.length !== HELPER_MEMORY_SIZE) {
    globalThis.LEL_HELPER_MEMORY = new Float64Array(HELPER_MEMORY_SIZE);
    globalThis.LEL_HELPER_SLOT_MAP = new Map();
    globalThis.LEL_HELPER_NEXT_SLOT = 0;
    console.log(`[Aither] Initialized helper memory pool: ${HELPER_MEMORY_SIZE} slots.`);
} else {
    globalThis.LEL_HELPER_SLOT_MAP ??= new Map();
    globalThis.LEL_HELPER_NEXT_SLOT ??= 0;
}
globalThis.LEL_HELPER_FREE_LIST ??= [];


let position = { x: 0, y: 0, z: 0 };
let time_sec = 0;
let time_frac = 0.0;

// --- The 's' Object ---
const s = {
    t: 0,
    dt: 1 / config.SAMPLE_RATE,
    sr: config.SAMPLE_RATE,
    idx: 0,
    get position() { return position },
    name: '',
    state: null,
};

// --- Garbage Collection ---
/**
 * Performs garbage collection for a signal's helper state using a "Free List" strategy.
 * This is called by `api.unregister` to reclaim memory.
 * @param {string} signalName - The name of the signal to collect helpers for.
 */
function garbageCollectHelpers(signalName) {
    const map = globalThis.LEL_HELPER_SLOT_MAP;
    if (!map) return;

    let collectedCount = 0;
    const prefix = `${signalName}_`;

    for (const [key, value] of Array.from(map.entries())) {
        if (key.startsWith(prefix)) {
            globalThis.LEL_HELPER_FREE_LIST.push({ offset: value.offset, size: value.size });
            map.delete(key);
            collectedCount++;
        }
    }
    
    if (collectedCount > 0) {
        globalThis.LEL_HELPER_FREE_LIST.sort((a, b) => a.size - b.size);
        console.log(`[Aither] GC: Reclaimed ${collectedCount} helper state block(s) for "${signalName}" to the free list.`);
    }
}

// --- Public API ---
const api = {
    ...dsp,

    register: (name, fn) => {
        if (REGISTRY.has(name)) {
            api.unregister(name);
        }
        dsp.resetHelperCounterInternal();
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
                    console.error(`[FATAL] No available state slots for "${name}".`);
                    return;
                }
            } while (existingOffsets.has(potentialOffset));
            offset = potentialOffset;
            OFFSETS.set(name, offset);
        }
        const stateSubarray = STATE.subarray(offset, offset + SLOTS_PER_SIGNAL);
        REGISTRY.set(name, { fn, stateObject: stateSubarray }); 
        console.log(`[Aither] Registered function for "${name}".`);
    },
    
    unregister: (name) => {
        if (!REGISTRY.has(name)) return;
        REGISTRY.delete(name);
        console.log(`[Aither] Unregistered function for "${name}".`);
        garbageCollectHelpers(name);
    },

    play: (name, fn) => api.register(name, fn),
    stop: (name) => api.unregister(name),

    clear: (fullReset = false) => {
        REGISTRY.clear();
        if (fullReset) {
            OFFSETS.clear();
            STATE.fill(0);
            if (globalThis.LEL_HELPER_SLOT_MAP) globalThis.LEL_HELPER_SLOT_MAP.clear();
            globalThis.LEL_HELPER_NEXT_SLOT = 0;
            globalThis.LEL_HELPER_FREE_LIST = [];
        }
        console.log('[Aither] Cleared function registry.');
    },
    
    setPosition: (newPosition) => {
        position = { ...position, ...newPosition };
    }
};

Object.assign(globalThis, api);

// --- Audio Engine ---
const outputBuffer = new Float32Array(config.BUFFER_SIZE * config.STRIDE);

function generateAudioChunk() {
    for (let i = 0; i < config.BUFFER_SIZE; i++) {
        let left = 0, right = 0;
        
        time_frac += s.dt;
        if (time_frac >= 1.0) {
            time_sec++;
            time_frac -= 1.0;
        }
        s.t = time_sec + time_frac;
        s.idx = i;

        for (const [name, { fn, stateObject }] of REGISTRY.entries()) {
            s.state = stateObject;
            s.name = name;
            try {
                const result = fn(s);
                if (Array.isArray(result)) {
                    left += result[0] || 0;
                    right += result[1] || 0;
                } else {
                    left += result || 0;
                    right += result || 0;
                }
            } catch (e) {
                // Log once per signal, then remove it so it doesn't spam.
                console.error(`[Aither] Signal "${name}" threw: ${e.message}. Removing.`);
                REGISTRY.delete(name);
            }
        }
        outputBuffer[i * config.STRIDE] = Math.tanh(left);
        outputBuffer[i * config.STRIDE + 1] = Math.tanh(right);
    }
    return outputBuffer;
}

// --- Main Execution ---
globalThis.AITHER_SESSION_FILE = null;

async function start() {
    if (globalThis.AITHER_ENGINE_INSTANCE) {
        if (globalThis.AITHER_SESSION_FILE) {
            try {
                await import(globalThis.AITHER_SESSION_FILE + '?' + Date.now());
                console.log(`[Aither] Reloaded ${globalThis.AITHER_SESSION_FILE}`);
            } catch (e) {
                console.error(`[Aither] Error reloading session file:`, e.message);
            }
        }
        return;
    }

    console.log('[Aither] Starting audio engine...');
    api.clear(true);

    startStream(generateAudioChunk);
    globalThis.AITHER_ENGINE_INSTANCE = { status: 'running', api };

    startReplServer(api);

    if (process.env.AITHER_PERF_MONITOR === 'true') {
        const histogram = monitorEventLoopDelay();
        histogram.enable();
        setInterval(() => {
            if (histogram.max > 0) {
                console.log(`[Perf] Max event loop delay: ${histogram.max / 1_000_000} ms`);
                histogram.reset();
            }
        }, 5000);
    }

    const sessionFileArg = process.argv[2];
    const defaultSessionFile = 'live-session.js';
    let fileToLoadPath = sessionFileArg ? path.resolve(process.cwd(), sessionFileArg) : path.resolve(process.cwd(), defaultSessionFile);
    globalThis.AITHER_SESSION_FILE = fileToLoadPath;

    try {
        await import(fileToLoadPath);
    } catch (e) {
        if (e.code === 'ERR_MODULE_NOT_FOUND' && !sessionFileArg) {
            console.log('[Aither] Default live-session.js not found. Starting empty.');
            globalThis.AITHER_SESSION_FILE = null;
        } else {
            console.error(`[Aither] Error loading session file:`, e.message);
            globalThis.AITHER_SESSION_FILE = null;
        }
    }
}

start();
