// src/audio_engine/compiler.js
// ============================================================================
// The "Surgical" Player Generator (Recursive AST Compiler V2)
//
// This version now generates code that uses fast Lookup Tables (LUTs) for
// sine and cosine calculations, providing a significant performance boost.
// ============================================================================

const { ringBuffer } = require('./storage.js');
const { lookupSin, lookupCos } = require('./luts.js'); // Import the LUT functions
const STRIDE = ringBuffer.stride;

// ... (Pass 1: _extractOscillators remains the same) ...
function _extractOscillators(node, oscillators) {
  if (node.type === 'op' && (node.op === 'sin' || node.op === 'cos')) {
    oscillators.push({
      id: oscillators.length,
      type: node.op,
      freqAst: node.args[0],
    });
  }
  if (node.args) {
    node.args.forEach(arg => _extractOscillators(arg, oscillators));
  }
}


function _generateNodeCode(node, context) {
  if (node.type === 'param') return 'currentT';
  if (node.type === 'literal') return node.value.toString();
  
  if (node.type === 'op') {
    const args = node.args.map(arg => _generateNodeCode(arg, context));
    switch (node.op) {
      case 'add': return `(${args.join(' + ')})`;
      case 'mul': return `(${args.join(' * ')})`;
      case 'pow': return `Math.pow(${args[0]}, ${args[1]})`;
      case 'abs': return `Math.abs(${args[0]})`;
      case 'clamp': return `Math.max(${args[1]}, Math.min(${args[2]}, ${args[0]}))`;
      
      case 'sin':
      case 'cos':
        const osc = context.oscillators.find(o => o.freqAst === node.args[0] && o.type === node.op);
        if (osc) {
          // --- LUT Code Generation ---
          // The generated code will call the fast `lookupSin` or `lookupCos` function
          // with the phase value (0.0 to 1.0) stored in the global state array.
          const lookupFn = osc.type === 'sin' ? 'lookupSin' : 'lookupCos';
          return `${lookupFn}(state[baseIdx + ${osc.id}])`;
        }
        // Fallback to Math for non-stateful sin/cos (less performant)
        return `Math.${node.op}(${args[0]})`;
        
      default:
        context.warnings.push(`Unsupported operator: ${node.op}`);
        return '0';
    }
  }
  context.warnings.push('Unknown AST node type.');
  return '0';
}

function compile(ast, baseStateIndex) {
  console.log('[Compiler-V2] Compiling N-Dimensional AST with LUTs...');
  let asts = Array.isArray(ast) ? ast : [ast];
  if (asts.length === 1 && STRIDE > 1) {
    asts = Array(STRIDE).fill(asts[0]);
  }

  const oscillators = [];
  asts.forEach(channelAst => _extractOscillators(channelAst, oscillators));
  console.log(`[Compiler-V2] Found ${oscillators.length} oscillators.`);

  const context = { oscillators, warnings: [] };

  const phaseUpdateCode = oscillators.map(osc => {
    const freqCode = _generateNodeCode(osc.freqAst, context);
    const deltaCode = `(${freqCode}) / globalThis.SAMPLE_RATE`;
    const phaseIndex = `baseIdx + ${osc.id}`;
    return `state[${phaseIndex}] = (state[${phaseIndex}] + ${deltaCode}) % 1.0;`;
  }).join('\n');

  const channelExpressionCodes = asts.map(channelAst => _generateNodeCode(channelAst, context));
  
  const generatedFunctionBody = 
    `const state = globalState;\n` +
    `const baseIdx = baseStateIndex;\n` +
    `const currentT = globalThis.CHRONOS * globalThis.dt;\n` +
    `let output = new Array(${STRIDE});\n` +
    channelExpressionCodes.map((code, i) => `output[${i}] = ${code};`).join('\n') + '\n' +
    phaseUpdateCode + '\n' +
    `return output;`;
  
  if (context.warnings.length > 0) {
    console.warn(`[Compiler-V2] Warnings: ${[...new Set(context.warnings)].join('; ')}`);
  }
  console.log(`[Compiler-V2] Generated Function Body:\n`, generatedFunctionBody);

  // --- Inject LUTs into JIT-compiled function ---
  // We pass the lookup functions as arguments to the `new Function` constructor.
  // This makes them available in the scope of the generated code with minimal overhead.
  return new Function('globalState', 'baseStateIndex', 'dt', 'lookupSin', 'lookupCos', generatedFunctionBody);
}

module.exports = { compile };