// Aither Web — minimal static file server.

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
};

const port = parseInt(process.env.PORT) || 3000;

Bun.serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        const file = Bun.file('.' + pathname);
        if (!(await file.exists())) return new Response('Not found', { status: 404 });
        const ext = pathname.slice(pathname.lastIndexOf('.'));
        return new Response(file, {
            headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' },
        });
    },
});

console.log(`[Aither] Web server at http://localhost:${port}`);
