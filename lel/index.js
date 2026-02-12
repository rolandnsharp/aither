import { startStream, config } from './transport.js';

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

let position = { x: 0, y: 0, z: 0 };

// --- The 's' Object (The "Universe" context) ---
const s = {
    t: 0,
    dt: 1 / config.SAMPLE_RATE,
    sr: config.SAMPLE_RATE,
    idx: 0,
    get position() { return position },
    state: null,
};

// --- Public API ---
export function register(name, fn) {
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
        console.log(`[LEL] Allocated new permanent offset ${offset} for "${name}".`);
    }
    const stateSubarray = STATE.subarray(offset, offset + SLOTS_PER_SIGNAL);
    REGISTRY.set(name, { fn, stateObject: stateSubarray }); 
    console.log(`[LEL] Registered function for "${name}".`);
}

export function setPosition(newPosition) {
    position = { ...position, ...newPosition };
}

export function clear(fullReset = false) {
    REGISTRY.clear(); 
    console.log('[LEL] Cleared function registry.');
    if (fullReset) {
        OFFSETS.clear();
        STATE.fill(0);
        console.log('[LEL] Performed full state and offset wipe.');
    }
}

// --- Audio Engine ---
const outputBuffer = new Float32Array(config.BUFFER_SIZE * config.STRIDE);

function generateAudioChunk() {
    for (let i = 0; i < config.BUFFER_SIZE; i++) {
        let left = 0, right = 0;
        s.t += s.dt;
        s.idx = i;

        for (const { fn, stateObject } of REGISTRY.values()) {
            s.state = stateObject;
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

function start() {
    if (globalThis.LEL_ENGINE_INSTANCE) {
        console.log('[LEL] Hot-reload detected: Engine already running.');
        import('./live-session.js');
        return;
    }

    console.log('Starting LEL engine...');
    clear(true); 
    
    startStream(generateAudioChunk);
    globalThis.LEL_ENGINE_INSTANCE = { status: 'running' };

    import('./live-session.js');
    console.log("Engine running. Loading session file...");
}

start();
