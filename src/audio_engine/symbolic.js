// src/audio_engine/symbolic.js
// ============================================================================
// The Sacred Ratio Library - Symbolic building blocks for recipes.
// ============================================================================

const t = { type: 'param', name: 't' };

function literal(value) {
  if (typeof value !== 'number') {
    throw new Error('literal() only accepts numbers.');
  }
  return { type: 'literal', value };
}

function add(...args) {
  const processedArgs = args.map(arg => typeof arg === 'number' ? literal(arg) : arg);
  return { type: 'op', op: 'add', args: processedArgs };
}

function mul(...args) {
  const processedArgs = args.map(arg => typeof arg === 'number' ? literal(arg) : arg);
  return { type: 'op', op: 'mul', args: processedArgs };
}

function sin(arg) {
  const processedArg = typeof arg === 'number' ? literal(arg) : arg;
  return { type: 'op', op: 'sin', args: [processedArg] };
}

function cos(arg) {
  const processedArg = typeof arg === 'number' ? literal(arg) : arg;
  return { type: 'op', op: 'cos', args: [processedArg] };
}

function abs(arg) {
    const processedArg = typeof arg === 'number' ? literal(arg) : arg;
    return { type: 'op', op: 'abs', args: [processedArg] };
}

function clamp(arg, min, max) {
    const processedArg = typeof arg === 'number' ? literal(arg) : arg;
    const processedMin = typeof min === 'number' ? literal(min) : min;
    const processedMax = typeof max === 'number' ? literal(max) : max;
    return { type: 'op', op: 'clamp', args: [processedArg, processedMin, processedMax] };
}

function pow(base, exponent) {
  const processedBase = typeof base === 'number' ? literal(base) : base;
  const processedExponent = typeof exponent === 'number' ? literal(exponent) : base;
  return { type: 'op', op: 'pow', args: [processedBase, processedExponent] };
}

module.exports = { t, literal, add, mul, sin, cos, abs, clamp, pow };