#!/usr/bin/env bun
// Aither REPL client — sends code to the running engine over TCP.
//
// Usage:
//   aither send <file.js>     Send a file
//   echo "play(...)" | aither send   Read from stdin
//   aither send               Read from stdin (interactive pipe)

import net from 'net';
import fs from 'fs';
import path from 'path';

const REPL_PORT = 41234;
const REPL_HOST = '127.0.0.1';

/**
 * Send a code string to the Aither server over TCP.
 * Resolves with the server's response, rejects on connection error.
 * @param {string} code
 * @returns {Promise<string>}
 */
function sendCode(code) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(REPL_PORT, REPL_HOST, () => {
            // Write code then half-close the write side.
            // The read side stays open to receive the server's response.
            socket.write(code);
            socket.end();
        });
        const chunks = [];
        socket.on('data', chunk => chunks.push(chunk));
        socket.on('end', () => resolve(Buffer.concat(chunks).toString().trim()));
        socket.on('error', err => reject(err));
    });
}

/**
 * Read all of stdin into a string.
 * @returns {Promise<string>}
 */
function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.on('data', chunk => chunks.push(chunk));
        process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString()));
        process.stdin.on('error', reject);
    });
}

async function main() {
    let code;
    const filePath = process.argv[2];

    if (filePath) {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            console.error(`File not found: ${absolutePath}`);
            process.exit(1);
        }
        code = fs.readFileSync(absolutePath, 'utf-8');
    } else {
        code = await readStdin();
    }

    if (!code.trim()) {
        console.error('Nothing to send.');
        process.exit(1);
    }

    try {
        const response = await sendCode(code);
        if (response.startsWith('error:')) {
            console.error(response);
            process.exit(1);
        }
    } catch (e) {
        console.error(`Could not connect to Aither server: ${e.message}`);
        console.error('Is the server running? (aither start)');
        process.exit(1);
    }
}

main();
