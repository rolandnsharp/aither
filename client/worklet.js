// client/worklet.js

importScripts('https://cdn.jsdelivr.net/npm/genish.js@2.2.0/dist/genish.min.js');

class GenishProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    console.log('[GenishProcessor] Worklet constructed.');
    console.log('[GenishProcessor] genish object type:', typeof genish); // Confirm genish is available
    this.port.onmessage = this.handleMessage.bind(this);
    this.registry = new Map();
    this.t = 0; // Global time accumulator
    this.sampleRate = 44100;
    this.logProcessOnce = true;
  }

  handleMessage(event) {
    const { type, label, graph, sampleRate } = event.data;
    console.log(`[GenishProcessor] Message received: type='${type}', label='${label}'`);
    if (type === 'init') {
        this.sampleRate = sampleRate;
        return
    }
    
    if (type === 'add' || type === 'update') {
      try {
        const fn = eval(graph);
        const current = this.registry.get(label);

        if (current && type === 'update') {
          // Crossfade
          this.registry.set(label, {
            graph: fn,
            oldGraph: current.graph,
            fade: 0.0,
            fadeDuration: 0.05 * this.sampleRate // 50ms fade
          });
        } else {
          this.registry.set(label, { graph: fn, oldGraph: null, fade: 1.0 });
        }
      } catch (e) {
        console.error(`[GenishProcessor] Error compiling graph for label '${label}':`, e);
      }
    } else if (type === 'remove') {
      this.registry.delete(label);
    }
  }

  process(inputs, outputs, parameters) {
    if (this.logProcessOnce) {
        console.log('[GenishProcessor] process() method called.');
        console.log('[GenishProcessor] outputs structure:', outputs);
        this.logProcessOnce = false;
    }
    const output = outputs[0];
    const channel = output[0];

    for (let i = 0; i < channel.length; i++) {
      let sample = 0;
      this.t += 1 / this.sampleRate; // Increment global time

      for (const [label, synth] of this.registry.entries()) {
        try {
            let currentSample = 0;
            
            // Active graph
            currentSample += synth.graph(this.t);
            
            // Handle crossfade if an old graph exists
            if (synth.oldGraph) {
              const oldSample = synth.oldGraph(this.t);
              const fadeValue = synth.fade / synth.fadeDuration;
              
              currentSample = (currentSample * fadeValue) + (oldSample * (1 - fadeValue));
    
              synth.fade++;
              if (synth.fade >= synth.fadeDuration) {
                synth.oldGraph = null; // End of fade
              }
            }
            
            sample += currentSample;
        } catch (e) {
            console.error(`[GenishProcessor] Runtime error in signal '${label}':`, e);
            // Optionally, remove the faulty synth to prevent further errors
            this.registry.delete(label);
        }
      }
      
      // Basic hard clip to prevent speaker damage
      channel[i] = Math.max(-1, Math.min(1, sample));
    }

    return true;
  }
}

registerProcessor('genish-processor', GenishProcessor);
