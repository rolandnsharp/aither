// client/worklet.js

// genish.js and wave-dsp.js are bundled before this code
// They provide genish and helper functions globally

// Define kanon() function in worklet scope for signal.js to use
let waveRegistry = new Map();
const kanon = (label, graphFn) => {
  waveRegistry.set(label, graphFn);
};
// Make kanon() available globally for eval'd code
globalThis.kanon = kanon;

class GenishProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    try {
      const genish = globalThis.genish;
      if (!genish) {
        throw new Error('genish not available in worklet!');
      }

      // Create persistent state buffer for live surgery
      // This Float32Array survives ALL code recompilations
      if (!globalThis.STATE_BUFFER) {
        globalThis.STATE_BUFFER = new Float32Array(128);
        // Initialize with small non-zero values to test
        for (let i = 0; i < 128; i++) {
          globalThis.STATE_BUFFER[i] = 0.001 * i;
        }
        this.port.postMessage({ type: 'info', message: `STATE buffer created, first value: ${globalThis.STATE_BUFFER[0]}` });

        // Wrap with genish.data() ONCE - reuse across all compilations
        globalThis.STATE = genish.data(globalThis.STATE_BUFFER, 1);
        this.port.postMessage({ type: 'info', message: `STATE wrapped: ${globalThis.STATE.name}` });

        // PRE-ALLOCATE handover buffer (reused for all surgeries)
        globalThis.HANDOVER_BUFFER = new Float32Array(128);
        globalThis.HANDOVER_STATE = genish.data(globalThis.HANDOVER_BUFFER, 1);
        this.port.postMessage({ type: 'info', message: 'Handover buffer pre-allocated' });
      }

      // Create sine wavetable for genish stateful oscillators
      // This is the same table that cycle() uses internally
      if (!globalThis.SINE_TABLE_BUFFER) {
        globalThis.SINE_TABLE_BUFFER = new Float32Array(2048);
        for (let i = 0; i < 2048; i++) {
          globalThis.SINE_TABLE_BUFFER[i] = Math.sin((i / 2048) * Math.PI * 2);
        }
        this.port.postMessage({ type: 'info', message: 'Sine wavetable created (2048 samples)' });

        // Wrap with genish.data() ONCE - reuse across all compilations
        globalThis.SINE_TABLE = genish.data(globalThis.SINE_TABLE_BUFFER, 1, { immutable: true });
        this.port.postMessage({ type: 'info', message: `SINE_TABLE wrapped: ${globalThis.SINE_TABLE.name}` });
      }

      this.port.onmessage = this.handleMessage.bind(this);
      this.registry = new Map(); // Multiple separate wave graphs
      this.sampleRate = 44100;

      // Shared context will be created on first compilation
      // when genish.gen.memory is guaranteed to exist
      this.sharedContext = null;

      // 2026 CRITICAL: Initialize genish with larger memory heap for multiple waves
      // Default 4096 samples is too small for multiple complex oscillator patches
      // 65536 samples = 64KB, enough for dozens of stateful oscillators
      if (!genish.gen.memory) {
        genish.gen.memory = genish.gen.createMemory(65536, Float64Array);
        this.port.postMessage({ type: 'info', message: 'Genish memory initialized (65536 samples)' });
      }

      this.port.postMessage({ type: 'info', message: 'GenishProcessor ready' });
    } catch (e) {
      this.port.postMessage({ type: 'error', message: `Constructor error: ${e.toString()}` });
    }
  }

  handleMessage(event) {
    const { type, code, sampleRate } = event.data;

    if (type === 'init') {
      this.sampleRate = sampleRate;
      this.port.postMessage({ type: 'info', message: `Sample rate set to ${sampleRate}` });
      return;
    }

    if (type === 'eval') {
      // Evaluate signal.js code in worklet context
      try {
        waveRegistry.clear();
        // DON'T clear registry - let compileWave handle hot-swapping
        const genish = globalThis.genish;

        if (!genish) {
          throw new Error('genish not available');
        }

        // ==================================================================
        // 2026 BEST PRACTICE: Reset slot counter for deterministic mapping
        // This ensures osc(440) always gets the same slot across recompilations
        // ==================================================================
        if (globalThis._internalResetSlots) {
          globalThis._internalResetSlots();
          this.port.postMessage({ type: 'info', message: 'Slot counter reset to 100' });
        }

        // NOTE: We do NOT clear genish.gen.memory on recompilation.
        // Genish's memory heap grows as needed and reuses freed blocks.
        // Clearing would force all waves to fit in a fixed-size heap, causing
        // "No available blocks" errors when adding multiple waves.

        this.port.postMessage({ type: 'info', message: 'Evaluating signal.js...' });

        // Eval the code - kanon() calls will populate waveRegistry
        eval(code);

        this.port.postMessage({ type: 'info', message: `Found ${waveRegistry.size} kanon definitions` });

        // CRITICAL: In genish, all graphs must be compiled BEFORE getting the final memory heap
        // Step 1: Compile all graphs (this populates genish.gen.memory)
        const compiledWaves = new Map();
        for (const [label, graphFn] of waveRegistry.entries()) {
          const compiled = this.compileWaveGraph(label, graphFn);
          if (compiled) {
            compiledWaves.set(label, compiled);
          }
        }

        // Step 2: NOW capture the final memory heap (after all compilations)
        // Only create sharedContext if we actually compiled waves
        if (compiledWaves.size === 0) {
          this.port.postMessage({ type: 'info', message: 'No waves to compile' });
          // Clear registry since no new waves were defined
          for (const label of this.registry.keys()) {
            this.registry.delete(label);
            this.port.postMessage({ type: 'info', message: `Removed '${label}'` });
          }
          return;
        }

        const sharedContext = { memory: genish.gen.memory.heap };
        this.port.postMessage({ type: 'info', message: `Captured shared memory heap after compiling ${compiledWaves.size} waves` });

        // Step 3: Store all waves with the shared context
        for (const [label, compiled] of compiledWaves.entries()) {
          const current = this.registry.get(label);

          if (current) {
            // Hot-swap with crossfade
            globalThis.HANDOVER_BUFFER.set(globalThis.STATE_BUFFER);
            this.registry.set(label, {
              graph: compiled.callback,
              context: sharedContext,
              update: compiled.updateFn,
              oldGraph: current.graph,
              oldContext: current.context,
              fade: 0.0,
              fadeDuration: 0.05 * this.sampleRate,
              isFading: true
            });
            this.port.postMessage({ type: 'info', message: `Recompiled '${label}' (50ms crossfade)` });
          } else {
            // First compilation
            this.registry.set(label, {
              graph: compiled.callback,
              context: sharedContext,
              update: compiled.updateFn,
              oldGraph: null,
              fade: 1.0
            });
            this.port.postMessage({ type: 'info', message: `Compiled '${label}'` });
          }
        }

        // Remove waves that are no longer defined
        for (const label of this.registry.keys()) {
          if (!compiledWaves.has(label)) {
            this.registry.delete(label);
            this.port.postMessage({ type: 'info', message: `Removed '${label}'` });
          }
        }

        this.port.postMessage({ type: 'info', message: `Active waves: ${this.registry.size}` });
      } catch (e) {
        this.port.postMessage({ type: 'error', message: `Error evaluating signal.js: ${e.message}` });
        console.error('[GenishProcessor] Eval error:', e);
      }
      return;
    }
  }

  compileWaveGraph(label, graphFn) {
    try {
      const genish = globalThis.genish;
      if (!genish || !genish.gen || !genish.gen.createCallback) {
        throw new Error('genish.gen.createCallback not available');
      }

      // Create time accumulator
      const t = genish.accum(1 / this.sampleRate);

      // Call user function with (t, state)
      const result = graphFn(t, globalThis.STATE_BUFFER);

      let genishGraph, updateFn;
      if (result && typeof result === 'object' && result.graph) {
        genishGraph = result.graph;
        updateFn = result.update || null;
      } else {
        genishGraph = result;
        updateFn = null;
      }

      // Compile the genish graph (adds to genish.gen.memory)
      const compiledCallback = genish.gen.createCallback(genishGraph, genish.gen.memory);

      // Return the compiled callback and update function
      // Context will be set AFTER all waves are compiled
      return { callback: compiledCallback, updateFn: updateFn };
    } catch (e) {
      this.port.postMessage({ type: 'error', message: `Error compiling '${label}': ${e.message}` });
      console.error('[GenishProcessor] Compilation error:', e);
      return null;
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    for (let i = 0; i < channel.length; i++) {
      let mixedSample = 0;

      // Sum all active waves together (additive mixing)
      for (const [label, synth] of this.registry.entries()) {
        try {
          let currentSample = 0;

          // Phase-locked handover: new graph uses HANDOVER, old uses STATE
          if (synth.isFading && synth.oldGraph) {
            // Swap to handover buffer for new graph
            const realState = globalThis.STATE;
            globalThis.STATE = globalThis.HANDOVER_STATE;
            currentSample = synth.graph.call(synth.context);
            globalThis.STATE = realState;

            // Old graph uses real STATE
            const oldSample = synth.oldGraph.call(synth.oldContext);

            // Equal-power crossfade
            const fadeValue = synth.fade / synth.fadeDuration;
            const fadeIn = Math.sin(fadeValue * Math.PI * 0.5);
            const fadeOut = Math.cos(fadeValue * Math.PI * 0.5);
            currentSample = (currentSample * fadeIn) + (oldSample * fadeOut);

            synth.fade++;
            if (synth.fade >= synth.fadeDuration) {
              // Handover complete: fast SIMD sync
              globalThis.STATE_BUFFER.set(globalThis.HANDOVER_BUFFER);
              synth.oldGraph = null;
              synth.oldContext = null;
              synth.isFading = false;
              this.port.postMessage({ type: 'info', message: `Handover complete for '${label}'` });
            }
          } else {
            // Normal operation (no crossfade)
            if (synth.update) {
              const updateResult = synth.update();
              if (typeof updateResult === 'number') {
                currentSample = updateResult;
              } else {
                currentSample = synth.graph.call(synth.context);
              }
            } else {
              currentSample = synth.graph.call(synth.context);
            }
          }

          // Add this wave to the mix
          mixedSample += currentSample;
        } catch (e) {
          this.port.postMessage({ type: 'error', message: `Runtime error in '${label}': ${e.toString()}` });
          this.registry.delete(label);
        }
      }

      // Hard clip to prevent speaker damage
      channel[i] = Math.max(-1, Math.min(1, mixedSample));
    }

    return true;
  }
}

registerProcessor('genish-processor', GenishProcessor);
