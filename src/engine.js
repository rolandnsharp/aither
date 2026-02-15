// Aither Engine — runtime-agnostic audio generation core.
//
// This module owns all state, the signal registry, garbage collection,
// the public API, and the sample-by-sample audio loop. It has zero
// platform dependencies — no filesystem, no networking, no audio output.
// Platform adapters (speaker.js, future jack.js, future webaudio.js)
// call generateAudioChunk() to pull audio from the engine.

import * as dsp from './dsp/index.js';

// --- Config ---
export const config = {
    SAMPLE_RATE: 48000,
    CHANNELS: 2,
    BIT_DEPTH: 32,
    BUFFER_SIZE: 1024,
    STRIDE: 2,
};

// --- State ---
const STATE_SIZE = 65536;
const MAX_SIGNALS = 512;
export const SLOTS_PER_SIGNAL = Math.floor(STATE_SIZE / MAX_SIGNALS);

globalThis.LEL_STATE ??= new Float64Array(STATE_SIZE);
globalThis.LEL_REGISTRY ??= new Map();
globalThis.LEL_OFFSETS ??= new Map();
const STATE = globalThis.LEL_STATE;
const REGISTRY = globalThis.LEL_REGISTRY;
const OFFSETS = globalThis.LEL_OFFSETS;

// --- Helper Memory Pool ---
const HELPER_MEMORY_SIZE = 1048576;
if (!globalThis.LEL_HELPER_MEMORY || globalThis.LEL_HELPER_MEMORY.length !== HELPER_MEMORY_SIZE) {
    globalThis.LEL_HELPER_MEMORY = new Float64Array(HELPER_MEMORY_SIZE);
    globalThis.LEL_HELPER_SLOT_MAP = new Map();
    globalThis.LEL_HELPER_NEXT_SLOT = 0;
} else {
    globalThis.LEL_HELPER_SLOT_MAP ??= new Map();
    globalThis.LEL_HELPER_NEXT_SLOT ??= 0;
}
globalThis.LEL_HELPER_FREE_LIST ??= [];

// --- Engine State ---
let position = { x: 0, y: 0, z: 0 };
let time_sec = 0;
let time_frac = 0.0;

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
export const api = {
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

    play: (name, fn, fadeTime) => {
        if (!fadeTime) return api.register(name, fn);
        let fadeElapsed = 0;
        const wrappedFn = (s) => {
            fadeElapsed += s.dt;
            const gain = fadeElapsed >= fadeTime ? 1 : fadeElapsed / fadeTime;
            return fn(s) * gain;
        };
        api.register(name, wrappedFn);
    },
    stop: (name, fadeTime) => {
        if (!fadeTime) return api.unregister(name);
        const entry = REGISTRY.get(name);
        if (!entry) return;
        const originalFn = entry.fn;
        let fadeRemaining = fadeTime;
        entry.fn = (s) => {
            fadeRemaining -= s.dt;
            if (fadeRemaining <= 0) { api.unregister(name); return 0; }
            return originalFn(s) * (fadeRemaining / fadeTime);
        };
    },

    mute: (name, fadeTime) => {
        const entry = REGISTRY.get(name);
        if (!entry || entry.muted) return;
        entry.muted = true;
        entry.muteGain = fadeTime ? 1 : 0;
        entry.muteFadeRate = fadeTime ? -1 / (fadeTime * config.SAMPLE_RATE) : 0;
    },
    unmute: (name, fadeTime) => {
        const entry = REGISTRY.get(name);
        if (!entry || !entry.muted) return;
        entry.muted = false;
        entry.muteGain = fadeTime ? 0 : 1;
        entry.muteFadeRate = fadeTime ? 1 / (fadeTime * config.SAMPLE_RATE) : 0;
    },

    list: () => {
        const names = [...REGISTRY.keys()];
        const status = names.map(n => {
            const entry = REGISTRY.get(n);
            return entry.muted ? `${n} (muted)` : n;
        });
        console.log(`[Aither] Playing: ${status.join(', ') || '(none)'}`);
        return names;
    },

    solo: (name, fadeTime) => {
        for (const key of REGISTRY.keys()) {
            if (key !== name) api.stop(key, fadeTime);
        }
    },

    clear: (fadeTime) => {
        if (!fadeTime) {
            REGISTRY.clear();
            OFFSETS.clear();
            STATE.fill(0);
            if (globalThis.LEL_HELPER_SLOT_MAP) globalThis.LEL_HELPER_SLOT_MAP.clear();
            globalThis.LEL_HELPER_NEXT_SLOT = 0;
            globalThis.LEL_HELPER_FREE_LIST = [];
            console.log('[Aither] Cleared function registry.');
        } else {
            for (const name of REGISTRY.keys()) {
                api.stop(name, fadeTime);
            }
        }
    },

    setPosition: (newPosition) => {
        position = { ...position, ...newPosition };
    }
};

// --- Audio Loop ---
const outputBuffer = new Float32Array(config.BUFFER_SIZE * config.STRIDE);

export function generateAudioChunk() {
    for (let i = 0; i < config.BUFFER_SIZE; i++) {
        let left = 0, right = 0;

        time_frac += s.dt;
        if (time_frac >= 1.0) {
            time_sec++;
            time_frac -= 1.0;
        }
        s.t = time_sec + time_frac;
        s.idx = i;

        for (const [name, entry] of REGISTRY.entries()) {
            s.state = entry.stateObject;
            s.name = name;
            try {
                const result = entry.fn(s);
                let gain = 1;
                if (entry.muteFadeRate) {
                    entry.muteGain += entry.muteFadeRate;
                    if (entry.muteGain <= 0) { entry.muteGain = 0; entry.muteFadeRate = 0; }
                    if (entry.muteGain >= 1) { entry.muteGain = 1; entry.muteFadeRate = 0; }
                    gain = entry.muteGain;
                } else if (entry.muted) { continue; }
                if (Array.isArray(result)) {
                    left += (result[0] || 0) * gain;
                    right += (result[1] || 0) * gain;
                } else {
                    left += (result || 0) * gain;
                    right += (result || 0) * gain;
                }
            } catch (e) {
                console.error(`[Aither] Signal "${name}" threw: ${e.message}. Removing.`);
                REGISTRY.delete(name);
            }
        }
        outputBuffer[i * config.STRIDE] = Math.tanh(left);
        outputBuffer[i * config.STRIDE + 1] = Math.tanh(right);
    }
    return outputBuffer;
}
