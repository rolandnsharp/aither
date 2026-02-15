// Aither Server — wires engine + speaker + REPL together.

import { performance, monitorEventLoopDelay } from 'perf_hooks';
import { api, config, generateAudioChunk } from './engine.js';
import { startStream } from './speaker.js';
import { startReplServer } from './repl-server.js';
import path from 'path';

Object.assign(globalThis, api);

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
