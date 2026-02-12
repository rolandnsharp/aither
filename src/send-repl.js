#!/usr/bin/env bun
// send-repl.js - Send code files to the Aether REPL server.
// Usage: aether send <path-to-your-snippet.js>

import dgram from 'dgram';
import fs from 'fs';
import path from 'path';

const REPL_PORT = 41234;
const REPL_HOST = '127.0.0.1';

// --- Get file path from command line ---
const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: bun send-repl.js <path-to-your-snippet.js>');
    process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
}

// --- Read file and send code ---
try {
    const code = fs.readFileSync(absolutePath, 'utf-8');
    
    if (!code.trim()) {
        console.log('File is empty, nothing to send.');
        process.exit(0);
    }
    
    const client = dgram.createSocket('udp4');

    console.log(`Sending ${path.basename(absolutePath)} to ${REPL_HOST}:${REPL_PORT}...`);
    
    client.send(Buffer.from(code), REPL_PORT, REPL_HOST, (err) => {
        if (err) {
            console.error('✗ Error sending message:', err);
            client.close();
            process.exit(1);
        } else {
            console.log('✓ Sent successfully.');
            console.log('  (UDP doesn\'t confirm receipt - check server logs to verify)');
            client.close();
        }
    });

} catch (e) {
    console.error(`Error reading file: ${e.message}`);
    process.exit(1);
}
