// host.ts
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = 8080;
let browserSocket = null;

console.log('Starting headless audio host...');

// Read the initial code that will be sent on connection
const initialCode = await Bun.file('signal.js').text();
console.log('[Host] Loaded initial code from signal.js');

// 1. Launch Playwright
const browser = await chromium.launch({
  headless: true,
  args: [
    '--headless',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ],
});

const context = await browser.newContext({
  // Required for audio playback in headless
  permissions: ['microphone'],
});
const page = await context.newPage();

// 2. Relay browser console messages to the terminal
page.on('console', msg => {
    const text = msg.text();
    try {
        const parsed = JSON.parse(text);
        if (parsed.type === 'log' || parsed.type === 'error') {
            const style = parsed.type === 'error' ? '\x1b[31m' : '\x1b[32m'; // Red for error, Green for log
            console.log(`${style}[Browser]\x1b[0m`, ...parsed.data);
        } else {
             console.log(`\x1b[34m[Browser]\x1b[0m ${text}`);
        }
    } catch(e) {
        // Not a JSON message, just log it normally
        console.log(`\x1b[34m[Browser]\x1b[0m ${text}`);
    }
});

// 3. HTTP and WebSocket Server
const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    // Upgrade to WebSocket
    if (url.pathname === '/ws') {
      const success = server.upgrade(req);
      if (success) {
        // Bun automatically handles response for successful upgrades
        return;
      }
    }

    // Serve static files
    const filePath = url.pathname === '/' ? './client/engine.html' : `.${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
        return new Response(file);
    }
    
    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
        if (!browserSocket) {
            console.log('[Host] Browser WebSocket established. Waiting for ready signal.');
            browserSocket = ws;
            // File watcher and initial code sending will happen after 'ready' signal
        } else {
            console.log('[Host] CLI WebSocket established.');
        }
    },
    message(ws, message) {
        if (ws === browserSocket) { // Message from the browser
            try {
                const parsed = JSON.parse(message);
                if (parsed.type === 'ready') {
                    console.log('[Host] Browser engine ready. Sending initial code.');
                    browserSocket.send(initialCode);

                    // 4. File Watcher for automatic reloading
                    // Only start watching for changes after the browser is connected AND ready.
                    fs.watchFile('signal.js', { interval: 500 }, async (curr, prev) => {
                      if (curr.mtime !== prev.mtime) {
                        console.log('[Host] signal.js changed, reloading...');
                        if (browserSocket) {
                          const code = await Bun.file('signal.js').text();
                          browserSocket.send(code);
                        }
                      }
                    });
                    console.log('[Host] Watching signal.js for changes...');
                } else if (parsed.type === 'log' || parsed.type === 'error') {
                    // These are handled by page.on('console') as well, but good to have a fallback
                    // for direct WebSocket messages.
                    const style = parsed.type === 'error' ? '\x1b[31m' : '\x1b[32m';
                    console.log(`${style}[BrowserWS]\x1b[0m`, ...parsed.data);
                }
            } catch (e) {
                console.error('[Host] Error parsing message from browser:', e);
            }
        } else { // Message from CLI -> forward to browser
            console.log('[Host] Relaying code from CLI to browser.');
            if (browserSocket) {
                browserSocket.send(message);
            } else {
                console.error('[Host] Browser not connected, cannot relay code.');
            }
        }
    },
    close(ws) {
        if (ws === browserSocket) {
            console.log('[Host] Browser WebSocket closed. Stopping file watcher.');
            fs.unwatchFile('signal.js');
            browserSocket = null;
        } else {
             console.log('[Host] CLI WebSocket closed.');
        }
    }
  },
});

console.log(`[Host] Server running at http://localhost:${server.port}`);

console.log('Chromium launched. Navigating to engine...');
await page.goto(`http://localhost:${PORT}/client/engine.html`);
console.log('Engine loaded.');


process.on('exit', async () => {
    console.log('Shutting down...');
    await browser.close();
});
