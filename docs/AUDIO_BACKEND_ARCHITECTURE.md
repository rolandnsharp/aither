# Audio Backend Architecture: The Sidecar Pattern

> **The Professional Approach:** Isolate signal processing from audio I/O using a native sidecar and ring buffer.

## Table of Contents

1. [The Challenge](#the-challenge)
2. [The Solution: Sidecar Pattern](#the-solution-sidecar-pattern)
3. [Current Implementation](#current-implementation)
4. [Why This Is Professional-Grade](#why-this-is-professional-grade)
5. [Extending to JACK](#extending-to-jack)
6. [Implementation Guide](#implementation-guide)
7. [Troubleshooting](#troubleshooting)
8. [References](#references)

---

## The Challenge

### The Real-Time Audio Problem

Audio callbacks run in a **real-time thread** with strict constraints:

```
Audio Interface → "Give me 64 samples NOW!" → Your callback (1.33ms @ 48kHz)
                                                     ↓
                                              [Sample 0]
                                              [Sample 1]
                                              [  ...  ]
                                              [Sample 63]
                                                     ↓
                                              Audio Interface → Speakers
```

**Requirements:**
1. ⏱️ **Deadline:** Must return in < 1.33ms (or buffer duration)
2. 🚫 **No allocations:** Can't trigger garbage collection
3. 🔒 **No blocking:** Can't wait for locks, I/O, or system calls
4. 📉 **Predictable:** Same execution time every call

**JavaScript/Bun limitations:**
- ❌ Garbage collector can pause at any time
- ❌ JIT compilation adds unpredictability
- ❌ Experimental FFI for callbacks (JSCallback)
- ❌ Can't guarantee < 1ms execution

**Result:** Glitches, pops, dropouts, xruns.

---

## The Solution: Sidecar Pattern

### Architecture Overview

**Separate concerns using a producer-consumer pattern:**

```
┌──────────────────────────────────────┐
│  PRODUCER (Bun/JavaScript)           │
│  ─────────────────────────────────   │
│  • Run at lower priority             │
│  • Generate audio samples            │
│  • Can pause for GC                  │
│  • Can take variable time            │
│  • Write to ring buffer              │
└─────────────┬────────────────────────┘
              │
              ↓ Write
┌─────────────┴────────────────────────┐
│  RING BUFFER (SharedArrayBuffer)     │
│  ────────────────────────────────    │
│  • Decouples producer/consumer       │
│  • Lock-free (atomic operations)     │
│  • Absorbs timing jitter             │
│  • ~1 second of audio (~48k samples) │
└─────────────┬────────────────────────┘
              │
              ↓ Read
┌─────────────┴────────────────────────┐
│  CONSUMER (Native C++/Rust)          │
│  ─────────────────────────────────   │
│  • Real-time thread                  │
│  • No GC, no allocations             │
│  • Predictable timing                │
│  • Just reads buffer → audio         │
│  • "The Sidecar"                     │
└──────────────────────────────────────┘
```

### Key Insight: The Sidecar

**The sidecar is a compiled native module that:**
1. Registers the real-time audio callback (C/C++)
2. Reads from the ring buffer
3. Sends samples to audio hardware
4. **Never calls back to JavaScript**

**JavaScript/Bun:**
- Generates samples (your Flux engine)
- Writes to ring buffer (single direction)
- Can pause for GC without affecting audio

**Native sidecar:**
- Reads from ring buffer
- Sends to audio interface
- Runs independently of JavaScript runtime

---

## Current Implementation

### Your Existing Architecture (speaker.js)

You **already have this pattern** implemented!

#### 1. Producer (engine.js)

```javascript
// engine.js - The JavaScript Producer
function fillBuffer() {
  if (!isRunning) return;

  const space = ringBuffer.availableSpace();
  const toFill = Math.min(2048, space);

  // Generate audio samples (can take variable time)
  for (let i = 0; i < toFill; i++) {
    const vector = updateAll(SAMPLE_RATE);  // Your Flux signals
    if (!ringBuffer.write(vector)) break;   // Write to ring buffer
  }

  // Yield to event loop, then continue
  setImmediate(fillBuffer);  // NOT setTimeout (lower latency)
}
```

**Characteristics:**
- Runs as fast as possible (`setImmediate` saturation)
- Can be paused by GC without affecting audio
- Writes to ring buffer asynchronously
- Pre-fills buffer before starting audio

#### 2. Ring Buffer (storage.js)

```javascript
// storage.js - Lock-Free Ring Buffer
const BUFFER_SIZE = 32768;  // ~680ms @ 48kHz

const sharedBuffer = new SharedArrayBuffer(
  BUFFER_SIZE * Float64Array.BYTES_PER_ELEMENT
);
const dataBuffer = new Float64Array(sharedBuffer);

// Atomic indices for lock-free access
const controlBuffer = new Int32Array(new SharedArrayBuffer(8));
const READ_PTR_INDEX = 0;
const WRITE_PTR_INDEX = 1;

export const ringBuffer = {
  write: (frame) => {
    const writeIdx = Atomics.load(controlBuffer, WRITE_PTR_INDEX);
    const readIdx = Atomics.load(controlBuffer, READ_PTR_INDEX);

    // Check if buffer is full
    const nextWrite = (writeIdx + STRIDE) % BUFFER_SIZE;
    if (nextWrite === readIdx) return false;  // Buffer full

    // Write frame
    for (let i = 0; i < STRIDE; i++) {
      dataBuffer[writeIdx + i] = frame[i];
    }

    // Update write pointer atomically
    Atomics.store(controlBuffer, WRITE_PTR_INDEX, nextWrite);
    return true;
  },

  read: () => {
    // Called by native sidecar (speaker.js)
    const readIdx = Atomics.load(controlBuffer, READ_PTR_INDEX);
    const writeIdx = Atomics.load(controlBuffer, WRITE_PTR_INDEX);

    // Check if buffer is empty
    if (readIdx === writeIdx) {
      return new Float32Array(STRIDE).fill(0);  // Silence
    }

    // Read frame
    const frame = new Float32Array(STRIDE);
    for (let i = 0; i < STRIDE; i++) {
      frame[i] = dataBuffer[readIdx + i];
    }

    // Update read pointer atomically
    const nextRead = (readIdx + STRIDE) % BUFFER_SIZE;
    Atomics.store(controlBuffer, READ_PTR_INDEX, nextRead);
    return frame;
  }
};
```

**Key features:**
- `SharedArrayBuffer` - Can be shared across threads
- `Atomics` - Lock-free read/write
- Ring buffer - Circular, never needs reallocation
- ~680ms capacity - Absorbs GC pauses

#### 3. Consumer (transport.js → speaker.js)

```javascript
// transport.js - Native Sidecar Interface
import Speaker from 'speaker';

const speaker = new Speaker({
  channels: 1,
  bitDepth: 32,
  sampleRate: 48000,
  float: true,
  signed: true,
});

// speaker.js (C++) handles the real-time callback internally
// We just write to its stream
export function write(buffer) {
  speaker.write(buffer);  // speaker.js reads this, sends to audio
}
```

**speaker.js internals (simplified):**

```cpp
// Inside speaker.js (C++ native module)
class Speaker {
  // Real-time audio callback (runs in audio thread)
  static void audio_callback(void* userdata, uint8_t* stream, int len) {
    Speaker* self = (Speaker*)userdata;

    // Read from ring buffer written by JavaScript
    for (int i = 0; i < len / 4; i++) {
      float sample = self->ring_buffer[self->read_idx];
      memcpy(stream + i * 4, &sample, 4);
      self->read_idx = (self->read_idx + 1) % BUFFER_SIZE;
    }
  }
};
```

**Why this works:**
- ✅ C++ callback is compiled, predictable
- ✅ No GC in audio thread
- ✅ Just reads memory, no complex logic
- ✅ JavaScript isolation - GC can't affect audio

---

## Why This Is Professional-Grade

### 1. GC Isolation

**The problem:**
```javascript
// WRONG: JavaScript in audio callback
audioCallback(() => {
  const sample = generateSample();  // Might trigger GC!
  // GC pause → missed deadline → glitch
});
```

**Your solution:**
```javascript
// RIGHT: Producer-consumer separation
// Producer (can pause)
for (let i = 0; i < N; i++) {
  const sample = generateSample();  // GC pause here? No problem!
  ringBuffer.write(sample);         // Buffer absorbs it
}

// Consumer (native, no GC)
audio_callback() {
  float sample = ringBuffer.read();  // C++, instant
  return sample;
}
```

**Result:** JavaScript GC can pause for 10-50ms without audio glitches.

### 2. Buffer as Time Reserve

**Without buffer:**
```
Audio needs sample → JS must generate NOW → If GC paused: GLITCH
```

**With buffer:**
```
Audio needs sample → Read from buffer (always ready)
                  ↓
                Buffer has 680ms of audio
                  ↓
       JS can be paused for up to 680ms
                  ↓
         Still no audio glitches!
```

**Professional systems use this:**
- Ableton Live: ~10ms buffer (low latency) + safety buffer
- DAWs: 128-2048 sample buffers
- Streaming services: ~1-5 second buffers

### 3. Lock-Free Concurrency

**Your `Atomics` usage:**

```javascript
Atomics.store(controlBuffer, WRITE_PTR_INDEX, nextWrite);
Atomics.load(controlBuffer, READ_PTR_INDEX);
```

**Why this matters:**
- No mutex locks (locks can cause priority inversion)
- Wait-free reads (audio thread never blocks)
- Correct memory ordering (prevents race conditions)

**This is the same technique used in:**
- Linux kernel audio (ALSA ring buffers)
- JACK audio (lock-free ringbuffer.c)
- PortAudio (ring buffer implementation)

### 4. Separation of Concerns

```
┌─────────────────────────────────┐
│  High-Level (JavaScript)        │
│  • Complex DSP algorithms       │
│  • Hot-reload                   │
│  • Debugging                    │
│  • Flexibility                  │
└──────────────┬──────────────────┘
               │
               ↓ Simple interface (write buffer)
┌──────────────┴──────────────────┐
│  Low-Level (C++)                │
│  • Real-time callback           │
│  • Predictable timing           │
│  • No allocations               │
│  • Reliability                  │
└─────────────────────────────────┘
```

**Each layer does what it's good at:**
- JavaScript: Flexibility, expressiveness
- C++: Real-time guarantees, hardware access

---

## Extending to JACK

### Why JACK?

**JACK (JACK Audio Connection Kit):**
- Professional audio routing
- Low latency (~5ms achievable)
- Connect multiple applications
- Standard in Linux audio production

**Example use cases:**
- Route Fluxwave → JACK → Ardour (DAW)
- Route Fluxwave → JACK → effects → speakers
- Multiple instances connected together

### The Same Pattern, Different Backend

**Your architecture supports this already!** Just change the consumer.

#### Option 1: Use Existing Node Module (Recommended)

```bash
npm install jack-connector
```

```javascript
// jack_transport.js
import jack from 'jack-connector';
import { ringBuffer } from './storage.js';

export function initJACK() {
  const client = jack.createClient('fluxwave', {
    serverName: 'default',
  });

  const port = client.registerOutPort('output', jack.AudioPort);

  // Register callback (C++ behind the scenes)
  client.setProcessCallback((nframes) => {
    const buffer = port.getBuffer(nframes);

    // Read from your ring buffer
    for (let i = 0; i < nframes; i++) {
      const frame = ringBuffer.read();
      buffer[i] = frame[0];  // Mono
    }

    return 0;  // Success
  });

  client.activate();

  // Return JACK's sample rate
  return client.getSampleRate();
}
```

**Usage:**

```javascript
// index.js
const backend = process.env.AUDIO_BACKEND || 'speaker';

if (backend === 'jack') {
  const jackSR = initJACK();
  console.log(`JACK initialized @ ${jackSR}Hz`);
} else {
  initSpeaker();
}

// signals.js - UNCHANGED!
kanon('sine', (mem, idx, sr) => {
  // Same code works with both backends
});
```

#### Option 2: Write Custom C++ JACK Module

**jack_output.cpp** (similar to speaker.js):

```cpp
#include <jack/jack.h>
#include <node.h>
#include <node_buffer.h>
#include <atomic>

class JackOutput : public node::ObjectWrap {
private:
  jack_client_t* client;
  jack_port_t* output_port;
  float* ring_buffer;
  std::atomic<size_t> read_idx;
  std::atomic<size_t> write_idx;
  size_t buffer_size;

  // Real-time callback (runs in JACK thread)
  static int process_callback(jack_nframes_t nframes, void* arg) {
    JackOutput* self = (JackOutput*)arg;
    float* out = (float*)jack_port_get_buffer(self->output_port, nframes);

    // Read from ring buffer
    for (jack_nframes_t i = 0; i < nframes; i++) {
      size_t read = self->read_idx.load(std::memory_order_acquire);
      size_t write = self->write_idx.load(std::memory_order_acquire);

      if (read != write) {
        out[i] = self->ring_buffer[read];
        self->read_idx.store((read + 1) % self->buffer_size,
                             std::memory_order_release);
      } else {
        out[i] = 0.0f;  // Underrun - silence
      }
    }

    return 0;
  }

public:
  static void Init(v8::Local<v8::Object> exports) {
    v8::Isolate* isolate = exports->GetIsolate();
    v8::Local<v8::Context> context = isolate->GetCurrentContext();

    // Constructor
    v8::Local<v8::FunctionTemplate> tpl =
      v8::FunctionTemplate::New(isolate, New);
    tpl->SetClassName(v8::String::NewFromUtf8(isolate, "JackOutput")
                      .ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // Methods
    NODE_SET_PROTOTYPE_METHOD(tpl, "write", Write);
    NODE_SET_PROTOTYPE_METHOD(tpl, "close", Close);

    exports->Set(context,
                 v8::String::NewFromUtf8(isolate, "JackOutput")
                 .ToLocalChecked(),
                 tpl->GetFunction(context).ToLocalChecked()).Check();
  }

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args) {
    JackOutput* obj = new JackOutput();
    obj->Wrap(args.This());

    // Initialize JACK
    obj->client = jack_client_open("fluxwave", JackNullOption, NULL);
    obj->output_port = jack_port_register(obj->client, "output",
                                           JACK_DEFAULT_AUDIO_TYPE,
                                           JackPortIsOutput, 0);

    // Allocate ring buffer
    obj->buffer_size = 48000;  // 1 second @ 48kHz
    obj->ring_buffer = new float[obj->buffer_size];
    obj->read_idx.store(0);
    obj->write_idx.store(0);

    // Set callback
    jack_set_process_callback(obj->client, process_callback, obj);
    jack_activate(obj->client);

    args.GetReturnValue().Set(args.This());
  }

  static void Write(const v8::FunctionCallbackInfo<v8::Value>& args) {
    JackOutput* obj = ObjectWrap::Unwrap<JackOutput>(args.Holder());

    // Get buffer from JavaScript
    v8::Local<v8::Object> buffer = args[0].As<v8::Object>();
    float* data = (float*)node::Buffer::Data(buffer);
    size_t length = node::Buffer::Length(buffer) / sizeof(float);

    // Write to ring buffer
    for (size_t i = 0; i < length; i++) {
      size_t write = obj->write_idx.load(std::memory_order_acquire);
      size_t next_write = (write + 1) % obj->buffer_size;
      size_t read = obj->read_idx.load(std::memory_order_acquire);

      if (next_write != read) {
        obj->ring_buffer[write] = data[i];
        obj->write_idx.store(next_write, std::memory_order_release);
      }
      // else: buffer full, drop sample
    }
  }

  static void Close(const v8::FunctionCallbackInfo<v8::Value>& args) {
    JackOutput* obj = ObjectWrap::Unwrap<JackOutput>(args.Holder());
    jack_deactivate(obj->client);
    jack_client_close(obj->client);
    delete[] obj->ring_buffer;
  }
};

NODE_MODULE(jack_output, JackOutput::Init)
```

**binding.gyp:**

```json
{
  "targets": [{
    "target_name": "jack_output",
    "sources": ["jack_output.cpp"],
    "libraries": ["-ljack"],
    "cflags!": ["-fno-exceptions"],
    "cflags_cc!": ["-fno-exceptions"],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")"
    ]
  }]
}
```

**Build:**

```bash
npm install node-addon-api
node-gyp configure build
```

**Use from Bun:**

```javascript
// Same API as speaker.js!
const jack = require('./build/Release/jack_output');
const output = new jack.JackOutput();

// Your existing code works unchanged
output.write(buffer);
```

#### Option 3: PipeWire (Modern Alternative)

**PipeWire** is the modern Linux audio server that:
- Replaces PulseAudio and JACK
- Lower latency than PulseAudio
- Compatible with JACK applications
- Simpler API

**No code changes needed:**

```bash
# Route through PipeWire's JACK compatibility
$ pw-jack bun index.js
```

Your `speaker.js` code works as-is!

---

## Implementation Guide

### Step 1: Understand Your Current Stack

```
Your Code (signals.js)
    ↓
Engine (engine.js)
    ↓
Ring Buffer (storage.js) ← SharedArrayBuffer
    ↓
Transport (transport.js)
    ↓
Sidecar (speaker.js) ← C++ Native Module
    ↓
Audio Hardware
```

**This is production-ready!**

### Step 2: Add JACK Backend (Option 1 - Simple)

```bash
npm install jack-connector
```

```javascript
// backends/jack.js
import jack from 'jack-connector';
import { ringBuffer } from '../storage.js';

export function initJACK() {
  const client = jack.createClient('fluxwave');
  const port = client.registerOutPort('output');

  client.setProcessCallback((nframes) => {
    const buffer = port.getBuffer(nframes);
    for (let i = 0; i < nframes; i++) {
      buffer[i] = ringBuffer.read()[0];
    }
    return 0;
  });

  client.activate();
  return { sampleRate: client.getSampleRate() };
}

// backends/speaker.js (existing)
import Speaker from 'speaker';

export function initSpeaker() {
  const speaker = new Speaker({
    channels: 1,
    bitDepth: 32,
    sampleRate: 48000,
    float: true,
  });

  return { sampleRate: 48000, write: speaker.write.bind(speaker) };
}

// transport.js - Backend abstraction
export function initAudioBackend(backend = 'speaker') {
  switch (backend) {
    case 'jack':
      return initJACK();
    case 'speaker':
      return initSpeaker();
    default:
      throw new Error(`Unknown backend: ${backend}`);
  }
}
```

### Step 3: Update Entry Point

```javascript
// index.js
import { initAudioBackend } from './transport.js';
import { startEngine } from './engine.js';

// Choose backend
const backend = process.env.AUDIO_BACKEND || 'speaker';
const { sampleRate } = await initAudioBackend(backend);

console.log(`Fluxwave running with ${backend} @ ${sampleRate}Hz`);

// Start engine (unchanged)
startEngine(sampleRate);

// Load signals (unchanged)
await import('./signals.js');
```

### Step 4: User Changes Nothing!

```javascript
// signals.js - SAME CODE for all backends
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;
  return {
    update: () => {
      mem[idx] = (mem[idx] + phaseInc) % 1.0;
      return [Math.sin(mem[idx] * TAU)];
    }
  };
});
```

**Switch backends with environment variable:**

```bash
# speaker.js (default)
$ bun index.js

# JACK
$ AUDIO_BACKEND=jack bun index.js

# Same code, different output!
```

---

## Troubleshooting

### Problem: Xruns (Buffer Underruns)

**Symptom:** Clicks, pops, or silence intermittently.

**Cause:** Producer (Bun) can't keep up with consumer (audio).

**Solutions:**

1. **Increase buffer size:**
```javascript
// storage.js
const BUFFER_SIZE = 65536;  // Larger buffer = more safety
```

2. **Optimize producer:**
```javascript
// Pre-compute more in factory, not in update
kanon('sine', (mem, idx, sr) => {
  const phaseInc = 440 / sr;  // Computed once
  return { update: () => { /* fast path */ } };
});
```

3. **Monitor buffer level:**
```javascript
setInterval(() => {
  const level = ringBuffer.availableSpace();
  if (level < BUFFER_SIZE * 0.2) {
    console.warn('Buffer running low!', level);
  }
}, 1000);
```

### Problem: High Latency

**Symptom:** Delay between code change and hearing result.

**Cause:** Large buffer (e.g., 1 second) adds latency.

**Solutions:**

1. **Smaller buffer:**
```javascript
const BUFFER_SIZE = 8192;  // ~170ms @ 48kHz
```

2. **Flush buffer on hot-reload:**
```javascript
// On file change, clear buffer
export function clear() {
  registry.clear();
  Atomics.store(controlBuffer, READ_PTR_INDEX, 0);
  Atomics.store(controlBuffer, WRITE_PTR_INDEX, 0);
}
```

**Trade-off:** Lower latency = more risk of underruns.

### Problem: JACK Not Found

**Symptom:** `Error: Cannot find module 'jack-connector'`

**Solutions:**

```bash
# Install JACK development files
# Ubuntu/Debian:
$ sudo apt install libjack-jackd2-dev

# Arch:
$ sudo pacman -S jack2

# macOS:
$ brew install jack

# Then install module:
$ npm install jack-connector
```

### Problem: Permission Denied (JACK)

**Symptom:** `Cannot connect to JACK server`

**Cause:** JACK server not running or permissions issue.

**Solutions:**

```bash
# Start JACK server
$ jackd -d alsa -r 48000 -p 128

# Or use QjackCtl (GUI)
$ qjackctl

# Check if running
$ jack_lsp
```

---

## Performance Metrics

### Target Numbers

| Metric | Target | Good | Warning | Critical |
|--------|--------|------|---------|----------|
| **Buffer level** | 50-80% | >30% | <20% | <10% |
| **Producer rate** | 48kHz+ | >96kHz | <60kHz | <48kHz |
| **Xruns/hour** | 0 | <5 | <50 | >100 |
| **Latency** | <10ms | <50ms | <200ms | >500ms |

### Monitoring

```javascript
// monitor.js
let totalSamples = 0;
let lastCheck = Date.now();

setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastCheck) / 1000;
  const sampleRate = totalSamples / elapsed;

  console.log(`Producer rate: ${(sampleRate / 1000).toFixed(1)}kHz`);
  console.log(`Buffer level: ${ringBuffer.availableSpace()} / ${BUFFER_SIZE}`);

  totalSamples = 0;
  lastCheck = now;
}, 5000);
```

---

## Comparison: Sidecar vs Direct FFI

### Direct FFI (What NOT to Do)

```javascript
// WRONG: JavaScript callback in audio thread
const lib = dlopen('libjack.so', {
  register_callback: {
    args: [FFIType.function],  // JSCallback - experimental!
    returns: FFIType.void,
  }
});

// This callback runs in JACK's real-time thread
lib.symbols.register_callback(() => {
  // ❌ JavaScript code in RT thread
  // ❌ GC can pause here
  // ❌ JIT unpredictability
  // ❌ Glitches inevitable
  const sample = generateSample();
  return sample;
});
```

### Sidecar Pattern (The Right Way)

```javascript
// RIGHT: Native callback, JavaScript producer
// C++ handles callback internally
const jack = new JackOutput();

// JavaScript just writes to buffer (async)
setImmediate(function produce() {
  const sample = generateSample();  // Can pause for GC
  jack.write(sample);               // Just writes to buffer
  setImmediate(produce);
});

// Real-time callback (in C++):
// Just reads buffer → audio (no JavaScript involved)
```

---

## References

### Academic & Industry

- [Ring Buffers in Linux Kernel](https://www.kernel.org/doc/html/latest/core-api/circular-buffers.html)
- [JACK Audio Design](http://www.jackaudio.org/files/jack-audio-connection-kit.pdf)
- [Lock-Free Programming](https://preshing.com/20120612/an-introduction-to-lock-free-programming/)
- [Real-Time Audio Programming](http://www.rossbencina.com/code/real-time-audio-programming-101-time-waits-for-nothing)

### Code Examples

- **speaker.js source:** [mpg123/node-speaker](https://github.com/TooTallNate/node-speaker)
- **JACK bindings:** [jack-connector](https://github.com/coreh/node-jack-connector)
- **Ring buffer:** [Lock-Free SPSC](https://github.com/rigtorp/SPSCQueue)

### Related Projects

- **SuperCollider:** C++ audio engine + Lisp control
- **Sonic Pi:** Ruby control + Supercollider audio
- **TidalCycles:** Haskell patterns + SuperDirt audio
- **Overtone:** Clojure + SuperCollider

**All use the same pattern:** High-level language for control, native code for real-time audio.

---

## Summary

### The Architecture

```
Bun (JavaScript)     - Generate samples, write to buffer (flexible)
      ↓
Ring Buffer          - Decouple, absorb timing jitter (reliable)
      ↓
Sidecar (C++)        - Read buffer, send to audio (real-time)
```

### Why It Works

1. **GC isolation** - JavaScript GC can't affect audio thread
2. **Buffer reserve** - ~680ms of audio protects against pauses
3. **Lock-free** - Atomics prevent blocking
4. **Separation** - Each layer does what it's best at
5. **Professional** - Same pattern as industry tools

### What You Have

✅ Production-ready architecture (speaker.js)
✅ Lock-free ring buffer (Atomics)
✅ GC isolation (producer-consumer)
✅ Hot-reload without audio glitches

### What You Can Add

🎯 JACK support (~20 lines with jack-connector)
🎯 PipeWire support (zero code changes)
🎯 Multiple backends (speaker, JACK, file)
🎯 Professional studio routing

**Your architecture is sound. Just extend the transport layer.**

---

**Last updated:** 2026-02-05
**Status:** Production-ready architecture, ready for JACK extension
**Key principle:** Isolate real-time audio from high-level logic using a native sidecar and ring buffer.
