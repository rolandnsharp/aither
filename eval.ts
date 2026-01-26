// eval.ts
import { readableStreamToText } from 'bun';

const code = await readableStreamToText(Bun.stdin);

if (!code) {
    console.log("Reading from stdin... pipe some code to me!");
    process.exit(0);
}

const socket = new WebSocket('ws://localhost:8080/ws');

socket.onopen = () => {
    socket.send(code);
    socket.close();
};

socket.onerror = (error) => {
    console.error("\x1b[31m[Eval]\x1b[0m Error connecting to host. Is it running?");
    process.exit(1);
}

socket.onclose = () => {
    // console.log("\x1b[32m[Eval]\x1b[0m Code sent successfully.");
}
