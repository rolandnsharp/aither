// Aither Browser — AudioContext setup, code transport, UI logic.

let audioCtx = null;
let workletNode = null;

const editor = document.getElementById('editor');
const highlightEl = document.getElementById('highlight');
const output = document.getElementById('output');
const startBtn = document.getElementById('start-btn');
const signals = document.getElementById('signals');

// --- Syntax highlighting ---

const JS_KW = new Set([
  'const','let','var','if','else','for','while','do','return','function',
  'new','typeof','instanceof','in','of','switch','case','break','continue',
  'throw','try','catch','finally','class','extends','import','from','export',
  'default','async','await','yield','true','false','null','undefined','this',
]);

const AITHER_API = new Set([
  'play','stop','clear','sin','saw','tri','sqr','noise','pulse',
  'pipe','mix','gain','pan','lowpass','highpass','bandpass','notch',
  'delay','feedback','reverb','tremolo','fold','slew','wave',
  'lpf','hpf','bpf','expand',
]);

const TOKEN_RE = new RegExp([
  '(\\/\\/[^\\n]*)',                      // 1: line comment
  '(`(?:[^`\\\\]|\\\\.)*`)',              // 2: template string
  '(\'(?:[^\'\\\\]|\\\\.)*\')',           // 3: single-quoted string
  '("(?:[^"\\\\]|\\\\.)*")',              // 4: double-quoted string
  '(\\b\\d+\\.?\\d*(?:e[+-]?\\d+)?\\b)', // 5: number
  '(\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b)',    // 6: identifier
  '(=>|[+\\-*/%=<>!&|^~?:;,.{}()\\[\\]])',// 7: operator/punctuation
].join('|'), 'g');

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tokenize(code) {
  let result = '';
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    // plain text between tokens
    if (m.index > last) result += escapeHTML(code.slice(last, m.index));
    last = m.index + m[0].length;
    const text = escapeHTML(m[0]);
    if      (m[1]) result += '<span class="tok-cmt">' + text + '</span>';
    else if (m[2] || m[3] || m[4]) result += '<span class="tok-str">' + text + '</span>';
    else if (m[5]) result += '<span class="tok-num">' + text + '</span>';
    else if (m[6]) {
      if (JS_KW.has(m[0]))       result += '<span class="tok-kw">' + text + '</span>';
      else if (AITHER_API.has(m[0])) result += '<span class="tok-api">' + text + '</span>';
      else                        result += text;
    }
    else if (m[7]) result += '<span class="tok-op">' + text + '</span>';
    else result += text;
  }
  if (last < code.length) result += escapeHTML(code.slice(last));
  // trailing newline so <pre> height matches textarea
  if (code.endsWith('\n') || code === '') result += '\n';
  return result;
}

function highlight() {
  highlightEl.innerHTML = tokenize(editor.value);
}

function syncScroll() {
  highlightEl.scrollTop = editor.scrollTop;
  highlightEl.scrollLeft = editor.scrollLeft;
}

editor.addEventListener('input', highlight);
editor.addEventListener('scroll', syncScroll);
highlight();

function log(text, cls) {
    const line = document.createElement('div');
    line.className = cls || '';
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

async function startAudio() {
    if (audioCtx) return;
    audioCtx = new AudioContext();
    await audioCtx.audioWorklet.addModule('./web/processor.js', { type: 'module' });
    workletNode = new AudioWorkletNode(audioCtx, 'aither-processor', {
        outputChannelCount: [2],
    });
    workletNode.connect(audioCtx.destination);

    workletNode.port.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'result') {
            if (!d.ok) log('Error: ' + d.error, 'error');
        } else if (d.type === 'console') {
            log(d.args.join(' '), d.level === 'error' ? 'error' : 'info');
        }
    };

    startBtn.textContent = 'Audio Running';
    startBtn.disabled = true;
    log('Audio started (' + audioCtx.sampleRate + ' Hz)');
}

function sendCode() {
    if (!workletNode) {
        log('Click "Start Audio" first.', 'error');
        return;
    }
    const code = editor.value.trim();
    if (!code) return;
    log('> ' + (code.length > 80 ? code.slice(0, 80) + '...' : code), 'cmd');
    const wrap = editor.closest('.editor-wrap');
    wrap.classList.remove('flash');
    void wrap.offsetWidth; // reflow to restart animation
    wrap.classList.add('flash');
    wrap.addEventListener('animationend', () => wrap.classList.remove('flash'), { once: true });
    workletNode.port.postMessage({ type: 'eval', code });
}

startBtn.addEventListener('click', startAudio);

editor.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to evaluate
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendCode();
        return;
    }
    // Tab inserts two spaces
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        highlight();
    }
});

log('Ready. Click "Start Audio", then type code and press Ctrl+Enter.');
