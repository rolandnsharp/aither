// src/index.js
// ============================================================================
// Kanon Core - Symbolic JIT Compiler, Registry, and Engine Orchestration
// ============================================================================

const { Conductor } = require('./audio_engine/engine.js');
const { Player } = require('./audio_engine/player.js');
const { createTransport } = require('./audio_engine/transport.js');
const { trace } = require('./audio_engine/tracer.js');
const { compile } = require('./audio_engine/compiler.js');
const symbolic = require('./audio_engine/symbolic.js');

// --- Player State Management ---
const MAX_TOTAL_STATE_SLOTS = 1024;
const SLOTS_PER_PLAYER = 16;
globalThis.STATE_ARRAY = new Float64Array(new SharedArrayBuffer(MAX_TOTAL_STATE_SLOTS * Float64Array.BYTES_PER_ELEMENT));
const idToBaseIndex = new Map();
let nextAvailableStateIndex = 0;
const playerCache = new Map();
const idToRecipeString = new Map();

// ============================================================================
// CORE KANON FUNCTION (The Symbolic JIT Compiler and Player Registry)
// ============================================================================
function kanon(id, recipe) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Player ID must be a non-empty string.');
  }
  if (typeof recipe !== 'function') {
    throw new Error('Recipe must be a function f(t).');
  }

  let baseStateIndex = idToBaseIndex.get(id);
  if (baseStateIndex === undefined) {
    if (nextAvailableStateIndex + SLOTS_PER_PLAYER > MAX_TOTAL_STATE_SLOTS) {
      console.error(`[Kanon] Ran out of global state slots!`);
      baseStateIndex = 0; // Fallback
    } else {
      baseStateIndex = nextAvailableStateIndex;
      nextAvailableStateIndex += SLOTS_PER_PLAYER;
    }
    idToBaseIndex.set(id, baseStateIndex);
    console.log(`[Kanon] Allocated state for ID '${id}' at base index: ${baseStateIndex}`);
  }

  const recipeString = recipe.toString();
  let player = playerCache.get(recipeString);

  if (!player) {
    try {
      const ast = trace(recipe);
      const statefulUpdate = compile(ast, baseStateIndex);
      player = new Player(statefulUpdate, true, recipe, baseStateIndex);
      console.log(`[Kanon] Successfully JIT-compiled recipe ID: ${id}.`);
    } catch (err) {
      console.warn(`[Kanon] Could not JIT-compile recipe ID: '${id}'. Reason: ${err.message}. Falling back to f(t).`);
      player = new Player(recipe, false, recipe, baseStateIndex);
    }
    playerCache.set(recipeString, player);
  } else {
    console.log(`[Kanon] Reusing player from cache for recipe ID: '${id}'.`);
    player.baseStateIndex = baseStateIndex;
  }

  idToRecipeString.set(id, recipeString);
  Conductor.setPlayer(id, player);
  return player.recipe;
}

// ============================================================================
// Symbolic Library Exposure
// ============================================================================
kanon.t = symbolic.t;
kanon.literal = symbolic.literal;
kanon.add = symbolic.add;
kanon.mul = symbolic.mul;
kanon.sin = symbolic.sin;
kanon.cos = symbolic.cos;
kanon.abs = symbolic.abs;
kanon.clamp = symbolic.clamp;
kanon.pow = symbolic.pow;

// ============================================================================
// Engine Control & Registry Management
// ============================================================================
kanon.boot = function() {
  if (Conductor.status().running) return;
  const transportInstance = createTransport('PUSH', globalThis.SAMPLE_RATE);
  Conductor.start(transportInstance);
};

kanon.list = () => Array.from(Conductor.status().activePlayers.keys());
kanon.remove = (id) => { Conductor.removePlayer(id); idToRecipeString.delete(id); };
kanon.clear = () => {
  Conductor.clearPlayers();
  playerCache.clear();
  idToRecipeString.clear();
  nextAvailableStateIndex = 0;
  idToBaseIndex.clear();
  globalThis.STATE_ARRAY.fill(0);
};
kanon.stopAudio = () => {
  Conductor.stop();
  playerCache.clear();
  idToRecipeString.clear();
  nextAvailableStateIndex = 0;
  idToBaseIndex.clear();
  globalThis.STATE_ARRAY.fill(0);
};

module.exports = kanon;
