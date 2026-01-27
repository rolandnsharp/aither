// client/worklet.js

// genish.js and wave-dsp.js are bundled before this code
// They provide genish and helper functions globally

// Define wave() function in worklet scope for signal.js to use
let waveRegistry = new Map();
const wave = (label, graphFn) => {
  waveRegistry.set(label, graphFn);
};
// Make wave() available globally for eval'd code
globalThis.wave = wave;

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
      this.registry = new Map();
      this.sampleRate = 44100;

      // Preserve genish memory heap across all compilations
      // This ensures STATE and SINE_TABLE indices remain valid
      this.sharedContext = { memory: genish.gen.memory.heap };

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
        this.registry.clear(); // Clear the audio registry to remove old sounds
        const genish = globalThis.genish;

        if (!genish) {
          throw new Error('genish not available');
        }

        this.port.postMessage({ type: 'info', message: 'Evaluating signal.js...' });

        // Eval the code - wave() calls will populate waveRegistry
        eval(code);

        this.port.postMessage({ type: 'info', message: `Found ${waveRegistry.size} wave definitions` });

        // Now compile all the waves
        for (const [label, graphFn] of waveRegistry.entries()) {
          this.compileWave(label, graphFn);
        }

        this.port.postMessage({ type: 'info', message: `Compiled ${waveRegistry.size} waves successfully` });
        this.port.postMessage({ type: 'info', message: `Audio registry now has ${this.registry.size} active synths` });
      } catch (e) {
        this.port.postMessage({ type: 'error', message: `Error evaluating signal.js: ${e.message}` });
        console.error('[GenishProcessor] Eval error:', e);
      }
      return;
    }
  }

  compileWave(label, graphFn) {
    try {
      const genish = globalThis.genish;
      if (!genish || !genish.gen || !genish.gen.createCallback) {
        throw new Error('genish.gen.createCallback not available');
      }

      // STATE and SINE_TABLE are created once in constructor and reused
      // No need to recreate genish.data() wrappers on every compilation

      // Create time accumulator
      const t = genish.accum(1 / this.sampleRate);

      // Call user function with (t, state)
      // User can return either:
      //   1. A genish graph directly: wave('name', (t) => mul(cycle(440), 0.5))
      //   2. {graph, update} for JS stateful: wave('name', (t, state) => ({graph, update}))
      //      state is raw Float32Array for JavaScript access
      //   3. Genish stateful: wave('name', (t) => genishGraph with peek(STATE, ...))
      //      STATE is global genish.data() object accessible in graph
      const result = graphFn(t, globalThis.STATE_BUFFER);

      let genishGraph, updateFn;
      if (result && typeof result === 'object' && result.graph) {
        // Stateful pattern: user returned {graph, update}
        genishGraph = result.graph;
        updateFn = result.update || null;
      } else {
        // Simple pattern: user returned a genish graph
        genishGraph = result;
        updateFn = null;
      }

      // Compile the genish graph into an optimized callback
      const compiledCallback = genish.gen.createCallback(genishGraph, genish.gen.memory);

      // Use shared context to preserve memory across compilations
      // This ensures STATE and SINE_TABLE remain valid
      const context = this.sharedContext;

      const current = this.registry.get(label);

      if (current) {
        // Hot-swap: INSTANT replacement - no crossfade
        // For stateful patterns, crossfade is harmful because both graphs would
        // call poke() causing phase to advance 2x during crossfade
        // Instead, rely on phase continuity for click-free transitions
        this.registry.set(label, {
          graph: compiledCallback,
          context: context,
          update: updateFn,
          oldGraph: null,
          oldContext: null,
          fade: 1.0,
          fadeDuration: 0
        });
        this.port.postMessage({ type: 'info', message: `Recompiled '${label}' (instant)` });
      } else {
        // First compilation
        this.registry.set(label, { graph: compiledCallback, context: context, update: updateFn, oldGraph: null, fade: 1.0 });
        this.port.postMessage({ type: 'info', message: `Compiled '${label}'` });
      }
    } catch (e) {
      this.port.postMessage({ type: 'error', message: `Error compiling '${label}': ${e.message}` });
      console.error('[GenishProcessor] Compilation error:', e);
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    // Debug: log first few samples
    let sampleDebugCount = this.sampleDebugCount || 0;

    for (let i = 0; i < channel.length; i++) {
      let sample = 0;

      for (const [label, synth] of this.registry.entries()) {
        try {
          let currentSample = 0;

          if (synth.update) {
            // Stateful pattern: call update() function
            const updateResult = synth.update();
            if (typeof updateResult === 'number') {
              // update() returns sample directly (pure JS mode)
              currentSample = updateResult;
            } else {
              // update() just updates state, graph generates sample (hybrid mode)
              currentSample = synth.graph.call(synth.context);
            }
          } else {
            // Simple pattern: pure genish graph
            currentSample = synth.graph.call(synth.context);
          }

          // Debug: log first few samples
          if (sampleDebugCount < 5) {
            this.port.postMessage({ type: 'info', message: `Sample ${sampleDebugCount} from '${label}': ${currentSample}` });
            sampleDebugCount++;
          }

          // Handle crossfade during hot-swap
          if (synth.oldGraph) {
            const oldSample = synth.oldGraph.call(synth.oldContext);
            const fadeValue = synth.fade / synth.fadeDuration;
            currentSample = (currentSample * fadeValue) + (oldSample * (1 - fadeValue));

            synth.fade++;
            if (synth.fade >= synth.fadeDuration) {
              synth.oldGraph = null;
              synth.oldContext = null;
            }
          }

          sample += currentSample;
        } catch (e) {
          this.port.postMessage({ type: 'error', message: `Runtime error in '${label}': ${e.toString()}` });
          this.registry.delete(label);
        }
      }

      // Hard clip to prevent speaker damage
      channel[i] = Math.max(-1, Math.min(1, sample));
    }

    this.sampleDebugCount = sampleDebugCount;
    return true;
  }
}

registerProcessor('genish-processor', GenishProcessor);
