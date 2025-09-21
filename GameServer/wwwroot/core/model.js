

/**
 * @param {import("../data/world").World} world
 * @param {number} tps
 */

export function createModel({ world, tps = 20 } = {}) {
    const state = {
        runing: false,
        fixedDtMs: 1000 / tps,
        timeMs: 0,
        listeners: new Set(),
        stats: {
            lastTickMs: 0,
            tpsBudhetMs: 0
        }
    }

    const api = {
        start() {
            if (state.runing) return;
            state.runing = true;
            loop();
        },

        stop() {
            state.runing = false;
        },
        
        tick(dtMs = state.fixedDtMs) {
            state.timeMs += dtMs;

            for (const listener of state.listeners) {
                listener(dtMs / 1000, state.stats);
            }
        },

        /**
         * @param {Function} f
         */
        onTick(f) {
            state.listeners.add(f);
        }
    }
    function loop() {
        if (!state.runing) return;
        const t0 = performance.now();
        api.tick();
        const t1 = performance.now();

        state.stats.lastTickMs = t1 - t0;
        state.stats.tpsBudhetMs = state.fixedDtMs - state.stats.lastTickMs;
        setTimeout(loop, state.fixedDtMs);
    }

    return api;
}
