// Aither DSP — Stateless signal helpers (stride-agnostic).

export const gain = (signal, amount) => {
    const gainFn = typeof amount === 'function' ? amount : () => amount;
    return s => {
        const value = signal(s);
        const g = gainFn(s);
        if (Array.isArray(value)) {
            return value.map(sample => sample * g);
        }
        return value * g;
    };
};

export const pan = (signal, position) => {
    const posFn = typeof position === 'function' ? position : () => position;
    return s => {
        let value = signal(s);
        if (Array.isArray(value)) {
            console.warn("The 'pan' helper expects a mono signal but received an array. Using the first channel.");
            value = value[0];
        }
        const pos = Math.max(-1, Math.min(1, posFn(s)));
        const angle = (pos * Math.PI) / 4;
        return [
            value * Math.cos(angle + Math.PI / 4),
            value * Math.sin(angle + Math.PI / 4)
        ];
    };
};
