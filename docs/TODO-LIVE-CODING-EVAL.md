# TODO: Live Coding Eval System

## Requirement
Implement a vim → flux evaluation system for true live coding workflow.

## Desired Workflow
1. Edit `signals.js` in vim
2. Select a code block (visual mode: `vip` for paragraph)
3. Press key combo (e.g., `<Leader>e` or `<Space>e`)
4. Selected code is evaluated in running flux process
5. Sound updates instantly without restarting

## Current Limitation
- We rely on `bun --hot` for file-based hot-reload
- Must save file to hear changes
- No way to evaluate snippets directly

## Implementation Plan

### Architecture Option 1: WebSocket Eval Server (Like old eval.ts)
```
┌─────────┐  selected code   ┌──────────────┐  eval()  ┌─────────┐
│   vim   │ ───────────────> │ Eval Server  │ ──────> │  Flux  │
│         │                  │ (WebSocket)  │         │ Process │
└─────────┘                  └──────────────┘         └─────────┘
```

**Files:**
- `eval-server.js` - WebSocket server embedded in engine.js
- `vim-eval.sh` - Script to send selected text to ws://localhost:8080

**Vim config:**
```vim
" .vimrc
function! SendToFlux()
  let l:code = join(getline("'<", "'>"), "\n")
  call system('echo ' . shellescape(l:code) . ' | bun vim-eval.sh')
endfunction

vnoremap <Leader>e :call SendToFlux()<CR>
```

**eval-server.js:**
```javascript
// Embed in engine.js
import { serve } from 'bun';

const evalServer = serve({
  port: 8080,
  websocket: {
    message(ws, message) {
      try {
        // Evaluate in flux context
        eval(message);
        ws.send('✓ Evaluated');
      } catch (e) {
        ws.send(`✗ Error: ${e.message}`);
      }
    }
  }
});
```

### Architecture Option 2: Unix Socket (Lower Latency)
```
┌─────────┐  code   ┌──────────────┐  eval()  ┌─────────┐
│   vim   │ ──────> │ Unix Socket  │ ──────> │  Flux  │
│         │         │ /tmp/kanon   │         │ Process │
└─────────┘         └──────────────┘         └─────────┘
```

**Benefits:**
- Lower latency (no TCP overhead)
- No port conflicts
- More "Unix-native"

### Architecture Option 3: Named Pipe (Simplest)
```bash
# Create named pipe
mkfifo /tmp/kanon-eval

# Kanon reads from pipe
tail -f /tmp/kanon-eval | bun eval-stdin.js

# Vim writes to pipe
echo "kanon('test', ...)" > /tmp/kanon-eval
```

## Security Considerations
- Eval server should only listen on localhost (127.0.0.1)
- Consider auth token if multiple users on same machine
- Disable in production builds

## Vim Plugin Inspirations
- [vim-slime](https://github.com/jpalardy/vim-slime) - Send code to REPL
- [tidal.vim](https://github.com/tidalcycles/vim-tidal) - TidalCycles integration
- [scnvim](https://github.com/davidgranstrom/scnvim) - SuperCollider integration

## Testing Plan
1. Start kanon with eval server: `bun --hot --eval-server index.js`
2. Open signals.js in vim
3. Select a kanon() definition
4. Press `<Leader>e`
5. Verify sound changes without file save

## Future Enhancements
- Visual feedback in vim (flash line on successful eval)
- Error messages inline (vim quickfix)
- REPL mode for interactive exploration
- Record eval history for session replay

## References
- Old eval.ts (deleted) - Had basic WebSocket eval, but for browser worklet
- Sonic Pi architecture - Similar eval loop
- SuperCollider sclang - Industry standard live coding REPL

---

**Priority:** High (core live coding experience)
**Estimated effort:** 4-6 hours
**Dependencies:** None (engine.js already structured for this)
