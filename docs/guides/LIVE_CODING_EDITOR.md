# Live Coding Editor Setup

## The Golden Rule

Each evaluable code block must be **one unbroken chunk of text** with no
blank lines inside it. Blank lines **between** blocks are how the editor
knows where one block ends and the next begins.

```js
// GOOD — two blocks separated by a blank line
play('drone',
  pipe(
    s => Math.sin(2 * Math.PI * 55 * s.t) * 0.3,
    signal => lowpass(signal, 400)
  )
);

play('melody',
  s => Math.sin(2 * Math.PI * 220 * s.t) * 0.1
);
```

```js
// BAD — blank line inside a block will break paragraph-send
play('drone',
  pipe(
    s => Math.sin(2 * Math.PI * 55 * s.t) * 0.3,

    signal => lowpass(signal, 400)
  )
);
```

## VS Code / VSCodium Setup

### 1. Workspace Task

The repo includes `.vscode/tasks.json` which defines the `aither-eval-clipboard`
task. This reads the clipboard and pipes it to the engine via TCP:

```json
{
    "label": "aither-eval-clipboard",
    "type": "shell",
    "command": "xclip -selection clipboard -o | bun run ${workspaceFolder}/src/repl/send.js"
}
```

Requires `xclip` on Linux (`sudo apt install xclip`).

### 2. Keybinding

Add this to your keybindings.json
(`Ctrl+Shift+P` → "Open Keyboard Shortcuts (JSON)"):

```json
[
    {
        "key": "alt+enter",
        "command": "runCommands",
        "when": "editorTextFocus && resourceExtname == .js",
        "args": {
            "commands": [
                { "command": "cursorMove", "args": { "to": "prevBlankLine", "select": false } },
                { "command": "cursorMove", "args": { "to": "down", "by": "line", "select": false } },
                "cursorHome",
                { "command": "cursorMove", "args": { "to": "nextBlankLine", "select": true } },
                "editor.action.clipboardCopyAction",
                { "command": "workbench.action.tasks.runTask", "args": "aither-eval-clipboard" }
            ]
        }
    }
]
```

**Alt+Enter** — select the current paragraph and send it to Aither.

### 3. Config File Locations

| Editor   | Path                                          |
|----------|-----------------------------------------------|
| VS Code  | `~/.config/Code/User/keybindings.json`        |
| VSCodium | `~/.config/VSCodium/User/keybindings.json`    |

## Keyboard-Centric Block Selection

For when you want to manually select before sending:

| Shortcut              | Action                                    |
|-----------------------|-------------------------------------------|
| `Ctrl+L`             | Select current line. Press again to extend downward line by line. |
| `Shift+Alt+Right`    | Expand selection semantically. Press repeatedly to grow — selects inside parens, then the whole call, then the statement. Best way to select a `play(...)` block. |
| `Shift+Alt+Left`     | Shrink selection (reverse of above).       |
| `Ctrl+Shift+Right`   | Select word by word.                       |
| `Shift+Down`         | Extend selection down one line.            |

### Recommended Workflow

**Quick send (most common):** Place cursor anywhere in a block, hit `Alt+Enter`.

**Precise send:** Use `Shift+Alt+Right` a few times to select exactly the
expression you want, then `Alt+Enter` sends whatever is selected (if you
add a selection-aware variant — see below).

### Optional: Send Selection Keybinding

If you want a second keybinding that sends the current selection without
auto-selecting a paragraph:

```json
{
    "key": "shift+alt+enter",
    "command": "runCommands",
    "when": "editorTextFocus && editorHasSelection && resourceExtname == .js",
    "args": {
        "commands": [
            "editor.action.clipboardCopyAction",
            { "command": "workbench.action.tasks.runTask", "args": "aither-eval-clipboard" }
        ]
    }
}
```

**Shift+Alt+Enter** — send whatever is currently selected.

Pair this with `Shift+Alt+Right` to expand selection to the exact scope you
want, then `Shift+Alt+Enter` to send it.
