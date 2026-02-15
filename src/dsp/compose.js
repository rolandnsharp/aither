// Aither DSP — Functional composition primitives.

export const pipe = (x, ...fns) => fns.reduce((v, f) => f(v), x);

export const mix = (...signals) => {
    const results = new Array(signals.length);
    let outputBuf = null;

    return s => {
        if (signals.length === 0) return 0;
        if (signals.length === 1) return signals[0](s);

        let maxStride = 1;
        for (let j = 0; j < signals.length; j++) {
            const r = signals[j](s);
            results[j] = r;
            if (Array.isArray(r) && r.length > maxStride) {
                maxStride = r.length;
            }
        }

        if (maxStride === 1) {
            let sum = 0;
            for (let j = 0; j < results.length; j++) {
                const r = results[j];
                sum += (Array.isArray(r) ? r[0] : r) || 0;
            }
            return sum;
        }

        if (!outputBuf || outputBuf.length !== maxStride) {
            outputBuf = new Array(maxStride);
        }
        for (let i = 0; i < maxStride; i++) outputBuf[i] = 0;

        for (let j = 0; j < results.length; j++) {
            const r = results[j];
            if (Array.isArray(r)) {
                for (let i = 0; i < r.length; i++) {
                    outputBuf[i] += r[i] || 0;
                }
            } else {
                for (let i = 0; i < maxStride; i++) {
                    outputBuf[i] += r || 0;
                }
            }
        }

        return outputBuf;
    };
};
