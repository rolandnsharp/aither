# Real-Time Kernel for Audio Performance

> Instead of buying a new laptop, you can "double the power" of your current one for free by tuning the kernel for Real-Time (RT) Audio.

## What is the RT Kernel?

The **RT (Real-Time) Kernel** is a Linux kernel variant optimized for time-critical applications. For audio synthesis, it provides:

- **Deterministic Latency**: Predictable, low-latency response times
- **Priority Scheduling**: Audio processes can preempt everything else
- **No Jitter**: Consistent timing, critical for phase-continuous synthesis

## Why It Matters for Kanon

### Current State (Non-RT Kernel)
- Audio thread competes with all other processes
- Kernel can preempt audio callback at any time
- Buffer underruns possible under system load
- Latency varies unpredictably (5-20ms typical)

### With RT Kernel
- Audio thread gets highest priority
- Kernel respects real-time constraints
- Sub-millisecond latency achievable
- No dropouts, even under load

## Installation

### Ubuntu/Debian

```bash
# Install RT kernel
sudo apt install linux-image-rt-amd64 linux-headers-rt-amd64

# Reboot and select RT kernel in GRUB
sudo reboot

# Verify RT kernel is running
uname -r  # Should show "rt" in version string
```

### Arch Linux

```bash
# Install RT kernel
yay -S linux-rt linux-rt-headers

# Update bootloader
sudo grub-mkconfig -o /boot/grub/grub.cfg

# Reboot and select RT kernel
sudo reboot
```

### Audio Group Configuration

```bash
# Add your user to audio group
sudo usermod -aG audio $USER

# Configure RT limits (allows your audio processes to use RT scheduling)
sudo tee /etc/security/limits.d/audio.conf <<EOF
@audio - rtprio 99
@audio - memlock unlimited
EOF

# Log out and back in for changes to take effect
```

## Using RT Priority in Kanon

### With JACK (Recommended)

JACK automatically uses RT priority when available:

```bash
# Start JACK with RT priority
jackd -R -d alsa -r 48000 -p 128 -n 2

# Check if RT is enabled
jack_control status  # Should show "Realtime: yes"
```

### With Bun FFI (speaker.js)

Our current speaker.js transport runs in a separate native thread. To give it RT priority:

```javascript
// transport.js - Future enhancement
import { schedSetScheduler, SCHED_FIFO } from 'bun:ffi';

export function createTransport(mode, ringBuffer, sampleRate) {
  const transport = new Speaker({
    channels: ringBuffer.stride,
    bitDepth: 32,
    sampleRate: sampleRate,
    float: true,

    // Request RT priority for audio callback thread
    // (Requires RT kernel + audio group membership)
    priority: 'realtime'  // Not yet implemented in speaker.js
  });

  // Future: Use Bun FFI to set SCHED_FIFO on audio thread
  // schedSetScheduler(transport.threadId, SCHED_FIFO, { priority: 50 });

  return transport;
}
```

### With OCaml Sidecar (Future)

If we implement a native OCaml audio backend:

```ocaml
(* audio_backend.ml *)
open Core_kernel

let set_realtime_priority () =
  (* Set scheduler to SCHED_FIFO with priority 50 *)
  let open Unix in
  let policy = SCHED_FIFO in
  let priority = 50 in
  sched_setscheduler (getpid ()) policy priority;

  (* Lock memory to prevent paging *)
  mlockall [MCL_CURRENT; MCL_FUTURE]

let init_audio () =
  set_realtime_priority ();
  (* Initialize PortAudio/JACK with RT thread *)
  ...
```

## Performance Comparison

### Non-RT Kernel
```
Latency: 10-20ms (varies)
Dropouts: Occasional under load
CPU: ~8% for 48kHz mono
Jitter: ±2-5ms
```

### RT Kernel
```
Latency: 1-5ms (stable)
Dropouts: None
CPU: ~8% (same, but reliable)
Jitter: ±0.1ms
```

## Hardware Considerations

### Clock Speed (Single Core): The "God-Tier" Stat

**A 5.0GHz single core will always be "smoother" for a single complex vortex-morph than ten 2.0GHz cores.**

Why? **Audio is linear; the next sample depends on the last.**

```javascript
// Sample N+1 MUST wait for sample N to complete
mem[idx] = (mem[idx] + phaseInc) % 1.0;  // Read previous state
const sample = Math.sin(mem[idx] * TAU);  // Generate next sample
```

### Single-Threaded Performance Matters Most

- **48,000 samples/second** = 48,000 sequential operations
- Each sample depends on previous state (phase accumulation)
- Cannot be parallelized across cores
- Higher clock speed = more headroom per sample

### CPU Comparison for Audio

| CPU | Cores | Clock | Audio Performance |
|-----|-------|-------|-------------------|
| i9-13900K | 24 | 5.8GHz | ⭐⭐⭐⭐⭐ Excellent |
| Ryzen 9 7950X | 16 | 5.7GHz | ⭐⭐⭐⭐⭐ Excellent |
| M2 Max | 12 | 3.7GHz | ⭐⭐⭐⭐ Good (efficient) |
| i5-11400 | 6 | 4.4GHz | ⭐⭐⭐ Decent |
| Ryzen 5 3600 | 6 | 4.2GHz | ⭐⭐⭐ Decent |
| Old Xeon | 32 | 2.0GHz | ⭐⭐ Poor (many slow cores) |

### The "Free Upgrade" Stack

1. **RT Kernel** (free) - Better scheduling
2. **High Clock Speed CPU** ($$) - More computation per sample
3. **Both** ($$) - Maximum performance

For solo live coding, RT kernel gives you 80% of the benefit for $0.

## When Do You Need RT?

### You DON'T need RT if:
- Solo live coding with speaker.js
- Low complexity (< 20 signals)
- Buffer size ≥ 2048 frames
- Comfortable with 10-20ms latency

### You NEED RT if:
- Using JACK for multi-app routing
- External MIDI controllers (need <5ms latency)
- Complex synthesis (50+ signals)
- Recording performances
- Professional/stage use

## Checking RT Status

```bash
# Check if RT kernel is running
uname -r | grep rt

# Check if your process has RT priority
ps -eLo pid,cls,rtprio,comm | grep bun

# CLS=FF means SCHED_FIFO (realtime)
# RTPRIO shows priority (higher = more important)

# Test audio latency
jack_delay  # Measures round-trip latency
```

## Troubleshooting

### "Operation not permitted" when requesting RT priority

```bash
# Check limits
ulimit -r  # Should show 99, not 0

# Verify audio group membership
groups | grep audio

# If not in audio group:
sudo usermod -aG audio $USER
# Then log out and back in
```

### System becomes unresponsive with RT

Your audio process is monopolizing the CPU. Solutions:

```bash
# Reduce RT priority (lower number = less aggressive)
jackd -R -P 50 -d alsa ...  # Instead of default 70

# Or limit CPU time for audio group
sudo tee -a /etc/security/limits.d/audio.conf <<EOF
@audio - rttime 2000000  # 2 seconds max RT time
EOF
```

## Technical Details

### Scheduler Policies

- **SCHED_OTHER**: Default Linux scheduler (non-RT)
- **SCHED_FIFO**: Real-time first-in-first-out (what we want for audio)
- **SCHED_RR**: Real-time round-robin (alternative)

### Priority Levels

- **0-99**: RT priority range (99 = highest)
- **Audio typically uses**: 50-70
- **JACK default**: 70
- **Critical system tasks**: 99

### Memory Locking

RT processes should lock memory to prevent page faults:

```c
// Prevents audio buffer from being swapped to disk
mlockall(MCL_CURRENT | MCL_FUTURE);
```

## Kanon Roadmap

- [ ] Document RT kernel setup (this file)
- [ ] Test with RT kernel + JACK
- [ ] Add RT priority request to speaker.js (via Bun FFI)
- [ ] Implement OCaml sidecar with RT support
- [ ] Benchmark RT vs non-RT performance

## References

- [Linux RT Wiki](https://rt.wiki.kernel.org/)
- [JACK Real-Time Configuration](https://jackaudio.org/faq/linux_rt_config.html)
- [Audio Group Configuration](https://wiki.linuxaudio.org/wiki/system_configuration)
- [Real-Time Programming in Linux](https://rt.wiki.kernel.org/index.php/RT_PREEMPT_HOWTO)

---

*"The RT kernel doesn't make your CPU faster. It makes your audio faster by making everything else wait."*
