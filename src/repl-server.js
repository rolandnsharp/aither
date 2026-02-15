// Aither REPL Server — TCP server that evaluates incoming code blocks.
//
// Each TCP connection is one code block. The client sends code, then
// closes the write side. The server evaluates the code with the engine's
// API in scope and responds with "ok" or an error message.

import net from 'net';

const REPL_PORT = 41234;
const REPL_HOST = '127.0.0.1';

/**
 * Evaluate a code string with the given API object in scope.
 * All keys of `api` become local variables in the evaluated code.
 * @param {string} code - JavaScript code to evaluate.
 * @param {object} api - The engine API (play, stop, pipe, lowpass, etc.).
 * @returns {{ ok: boolean, error?: string }}
 */
function evalCode(code, api) {
    try {
        const scopedEval = new Function(...Object.keys(api), code);
        scopedEval(...Object.values(api));
        return { ok: true };
    } catch (e) {
        console.error('[REPL] Evaluation error:', e.message);
        return { ok: false, error: e.message };
    }
}

/**
 * Start the TCP REPL server.
 * @param {object} api - The engine API object to expose to evaluated code.
 * @param {{ port?: number, host?: string }} [options]
 */
export function startReplServer(api, options = {}) {
    const port = options.port || REPL_PORT;
    const host = options.host || REPL_HOST;

    const server = net.createServer(socket => {
        const chunks = [];
        socket.on('data', chunk => chunks.push(chunk));
        socket.on('end', () => {
            const code = Buffer.concat(chunks).toString();
            const result = evalCode(code, api);
            socket.end(result.ok ? 'ok\n' : 'error: ' + result.error + '\n');
        });
    });

    server.listen(port, host, () => {
        console.log(`[Aither] REPL Ready. Listening on ${host}:${port} (TCP)`);
    });

    return server;
}
