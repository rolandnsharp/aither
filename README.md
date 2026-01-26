# KANON - A Headless Live-Coding Environment

This project is a minimal, headless live-coding environment for audio synthesis. It uses Bun, Playwright, and genish.js to create a system where you can edit a JavaScript file and have the changes instantly reflected in the audio output.

## Architecture

- **`host.ts`**: The main server process, powered by Bun. It launches a headless Chromium instance using Playwright and runs a WebSocket server.
- **`client/engine.js`**: The audio engine that runs in the headless browser. It uses `genish.js` for synthesis and an `AudioWorklet` for performance.
- **`wave-dsp.js`**: A user-facing library of DSP functions.
- **`eval.ts`**: A CLI script to send code from your editor to the audio engine.
- **`signal.js`**: A sample file with musical ideas.

## How to Use: Two Live-Coding Workflows

This environment supports two distinct workflows for updating the sound.

### Workflow 1: Automatic Reloading (Recommended for most editors)

The host server automatically watches `signal.js` for changes.

1.  Start the host server: `bun run host.ts`.
2.  Open `signal.js` in your favorite text editor (VS Code, Sublime Text, etc.).
3.  Make a change to the file (e.g., change `sin(440)` to `sin(880)`).
4.  **Simply save the file.**

The host will detect the change and instantly send the entire file's content to the audio engine. The engine will re-evaluate the code, updating any sound definitions.

### Workflow 2: Surgical Updates (Vim & Advanced CLI)

This workflow allows you to send and update specific, labeled blocks of code without disturbing others. This is ideal for performance or fine-grained control.

1.  Add the mappings from `vimrc_mapping.txt` to your Vim/Neovim configuration.
2.  Open `signal.js` in Vim.
3.  Place your cursor on a code block (like a single `wave(...)` call).
4.  Press `\p` (or your leader key + `p`).

Only that block of code is sent to the engine. If the label already exists (e.g., 'tone'), the engine will surgically crossfade to the new sound without affecting other active sounds (e.g., 'noise-perc').

You can also use this method from any terminal:
```bash
# Send just one part of the signal.js file
echo "wave('tone', pipe(sin(220), gain(0.2)));" | bun run eval.ts
```

## How It Works

The system has two pathways for code:
1.  **File Watching:** The `host.ts` server watches `signal.js`. When you save the file, its full content is sent over a WebSocket to the browser engine.
2.  **CLI/Vim:** The `eval.ts` script pipes code from the command line (or your editor) to the `host.ts` server, which relays it to the browser engine.

In both cases, the `client/engine.js` running in the browser receives the code as a string and `eval()`s it. This executes calls to the `wave()` function, which compiles the `genish.js` audio graph and hot-swaps it in the `AudioWorklet`, ensuring a smooth crossfade for any updated sounds.
