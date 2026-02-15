#!/usr/bin/env bun
// Aither Interactive REPL — sends code to the engine line-by-line over TCP.

import net from 'net';
import readline from 'readline';

const REPL_PORT = 41234;
const REPL_HOST = '127.0.0.1';

function sendCode(code) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(REPL_PORT, REPL_HOST, () => {
            socket.end(code);
        });
        const chunks = [];
        socket.on('data', chunk => chunks.push(chunk));
        socket.on('end', () => resolve(Buffer.concat(chunks).toString().trim()));
        socket.on('error', reject);
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'aither> '
});

console.log('\n  Aither Live REPL');
console.log(`  Connected to ${REPL_HOST}:${REPL_PORT} (TCP)`);
console.log('  .help for commands\n');

let multilineMode = false;
let multilineBuffer = [];

rl.on('line', async (line) => {
    const trimmed = line.trim();

    if (trimmed === '.help') {
        console.log('  .exit       Exit');
        console.log('  .multiline  Enter multiline mode (.send to execute, .cancel to abort)');
        console.log('  .clear      Clear screen');
        console.log('  .info       Show available functions');
        rl.prompt();
        return;
    }

    if (trimmed === '.exit') {
        process.exit(0);
    }

    if (trimmed === '.clear') {
        console.clear();
        rl.prompt();
        return;
    }

    if (trimmed === '.info') {
        console.log('  play(name, fn)              Register a signal');
        console.log('  stop(name)                  Stop a signal');
        console.log('  clear()                     Stop all signals');
        console.log('  pipe(signal, ...fns)        Compose signal chain');
        console.log('  mix(...signals)             Mix signals');
        console.log('  lowpass(signal, cutoff)      One-pole lowpass');
        console.log('  tremolo(signal, rate, depth) Amplitude modulation');
        console.log('  delay(signal, max, time)     Delay line');
        console.log('  feedback(signal, max, t, fb) Feedback delay');
        console.log('  gain(signal, amount)         Gain');
        console.log('  pan(signal, position)        Stereo pan');
        rl.prompt();
        return;
    }

    if (trimmed === '.multiline') {
        multilineMode = true;
        multilineBuffer = [];
        console.log('  (multiline mode — .send to execute, .cancel to abort)');
        rl.setPrompt('...  ');
        rl.prompt();
        return;
    }

    if (multilineMode) {
        if (trimmed === '.send') {
            multilineMode = false;
            const code = multilineBuffer.join('\n');
            multilineBuffer = [];
            rl.setPrompt('aither> ');
            if (code.trim()) {
                try {
                    const response = await sendCode(code);
                    if (response.startsWith('error:')) console.error(response);
                } catch (e) {
                    console.error(`Connection failed: ${e.message}`);
                }
            }
            rl.prompt();
            return;
        }
        if (trimmed === '.cancel') {
            multilineMode = false;
            multilineBuffer = [];
            rl.setPrompt('aither> ');
            rl.prompt();
            return;
        }
        multilineBuffer.push(line);
        rl.prompt();
        return;
    }

    if (!trimmed) {
        rl.prompt();
        return;
    }

    try {
        const response = await sendCode(line);
        if (response.startsWith('error:')) console.error(response);
    } catch (e) {
        console.error(`Connection failed: ${e.message}`);
        console.error('Is the server running? (aither start)');
    }
    rl.prompt();
});

rl.on('SIGINT', () => {
    if (multilineMode) {
        multilineMode = false;
        multilineBuffer = [];
        rl.setPrompt('aither> ');
        console.log('');
        rl.prompt();
    } else {
        process.exit(0);
    }
});

rl.prompt();
