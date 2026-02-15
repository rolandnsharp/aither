// Aither DSP — State management for implicitly persistent helpers.
//
// Global helper memory pool, slot allocation with free-list recycling,
// and the expand() HOF for multichannel expansion.

globalThis.LEL_HELPER_MEMORY ??= new Float64Array(1048576);
globalThis.LEL_HELPER_SLOT_MAP ??= new Map();
globalThis.LEL_HELPER_NEXT_SLOT ??= 0;
globalThis.LEL_HELPER_FREE_LIST ??= [];

let helperCounter = 0;

export function resetHelperCounterInternal() {
    helperCounter = 0;
}

function claimStateBlock(s, helperName, helperIndex, totalBlockSize) {
    const helperKey = `${s.name}_${helperName}_${helperIndex}`;

    if (globalThis.LEL_HELPER_SLOT_MAP.has(helperKey)) {
        return globalThis.LEL_HELPER_SLOT_MAP.get(helperKey).offset;
    }

    const freeList = globalThis.LEL_HELPER_FREE_LIST;
    for (let i = 0; i < freeList.length; i++) {
        const block = freeList[i];
        if (block.size >= totalBlockSize) {
            const startAddr = block.offset;
            freeList.splice(i, 1);
            globalThis.LEL_HELPER_SLOT_MAP.set(helperKey, { offset: startAddr, size: totalBlockSize });
            const leftover = block.size - totalBlockSize;
            if (leftover > 0) {
                freeList.push({ offset: startAddr + totalBlockSize, size: leftover });
                freeList.sort((a, b) => a.size - b.size);
            }
            return startAddr;
        }
    }

    const startAddr = globalThis.LEL_HELPER_NEXT_SLOT;
    globalThis.LEL_HELPER_SLOT_MAP.set(helperKey, { offset: startAddr, size: totalBlockSize });
    globalThis.LEL_HELPER_NEXT_SLOT += totalBlockSize;
    if (globalThis.LEL_HELPER_NEXT_SLOT > globalThis.LEL_HELPER_MEMORY.length) {
        console.error(`[FATAL] Out of HELPER state memory for signal "${s.name}". Helper "${helperName}" failed to allocate ${totalBlockSize} slots. Total available: ${globalThis.LEL_HELPER_MEMORY.length}. Needed: ${globalThis.LEL_HELPER_NEXT_SLOT}.`);
    }
    return startAddr;
}

export function expand(monoLogicFn, helperName, slotsPerChannelSpecifier = 1) {
    return (signal, ...args) => {
        const helperIndex = helperCounter++;

        const currentSlotsPerChannel = typeof slotsPerChannelSpecifier === 'function'
            ? slotsPerChannelSpecifier(...args)
            : slotsPerChannelSpecifier;

        let outputBuf = null;

        return s => {
            const input = signal(s);
            const numChannels = Array.isArray(input) ? input.length : 1;

            const totalBlockSize = numChannels * currentSlotsPerChannel;
            const startAddrOfInstance = claimStateBlock(s, helperName, helperIndex, totalBlockSize);

            if (numChannels > 1) {
                if (!outputBuf || outputBuf.length !== numChannels) {
                    outputBuf = new Array(numChannels);
                }
                for (let i = 0; i < numChannels; i++) {
                    const baseAddrForThisChannel = startAddrOfInstance + (i * currentSlotsPerChannel);
                    outputBuf[i] = monoLogicFn(s, input[i], globalThis.LEL_HELPER_MEMORY, baseAddrForThisChannel, i, ...args);
                }
                return outputBuf;
            } else {
                return monoLogicFn(s, input, globalThis.LEL_HELPER_MEMORY, startAddrOfInstance, 0, ...args);
            }
        };
    };
}
