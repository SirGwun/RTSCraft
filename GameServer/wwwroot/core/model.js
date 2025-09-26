import { Entity } from '../data/entity.js';

/**
 * @typedef {{id?:string, x:number, y:number, w:number, h:number, color?:string, speed?:number, owner?:string, type?:string, hp?:number}} SpawnProps
 */

/**
 * @typedef {{ type:'SPAWN_UNIT', props: SpawnProps }} SpawnUnitCmd
 * @typedef {{ type:'KILL_UNIT', id:string }} KillUnitCmd
 * @typedef {{ type:'MOVE_LINE', id:string, target:{x:number,y:number}, speed:number }} MoveLineCmd
 * @typedef {{ type:'STOP', id:string }} StopCmd
 *
 * @typedef {SpawnUnitCmd|KillUnitCmd|MoveLineCmd|StopCmd} Command
 */

/**
 * @typedef {{ type:'UnitSpawned', id:string }} UnitSpawnedEvt
 * @typedef {{ type:'UnitKilled', id:string }} UnitKilledEvt
 * @typedef {{ type:'UnitArrived', id:string }} UnitArrivedEvt
 *
 * @typedef {UnitSpawnedEvt|UnitKilledEvt|UnitArrivedEvt} ModelEvent
 */


export function createModel({ world, tps = 20 } = {}) {
    let running = false;
    const fixedDtMs = 1000 / tps;
    let timeMs = 0;
    const listeners = new Set();
    /** @type {Command[]} */
    let commandQueue = [];
    const eventListeners = new Set();
    const eventThisTick = new Set();
    const stats = {
        lastTickMs: 0,
        tpsBudgetMs: 0,
        perSystemMs: {}
    };

    let timerId = null;

    const api = {
        issue: {
            /**
           * @param {SpawnProps} props
           */
            spawnUnit: (props) => commandQueue.push({ type: 'SPAWN_UNIT', props }),

            /**
            * @param {string} id
            */
            killUnit: (id) => commandQueue.push({ type: 'KILL_UNIT', id }),

            /**
             * @param {string[]|string} ids
             * @param {any} target
             * @param {any} mode
             */
            move: (ids, target, mode) => {
                const arr = Array.isArray(ids) ? ids : [ids];
                for (const id of arr) {
                    commandQueue.push({ type: 'MOVE', id, target, mode });
                }
            }, 
           /**
           * @param {string[]|string} ids
           * @param {{x:number,y:number}} target
           * @param {number} speed
           */
            moveLine: (ids, target, mode) => {
                const arr = Array.isArray(ids) ? ids : [ids];
                for (const id of arr) {
                    commandQueue.push({ type: 'MOVE_LINE', id, target, mode });
                }
            },

            /**
            * @param {string[]|string} ids
            */
            stop: (ids) => {
                const arr = Array.isArray(ids) ? ids : [ids];
                for (const id of arr) {
                    commandQueue.push({ type: 'STOP', id });
                }
            },
        },

        onEvent,

        start() {
            if (running) return;
            running = true;
            loop();
        },

        stop() {
            running = false;
            if (timerId !== null) { clearTimeout(timerId); timerId = null; }
        },
        
        tick(dtMs = fixedDtMs) {
            timeMs += dtMs;

            const commands = commandQueue;
            commandQueue = [];

            const ctx = { world, commands, emit, dt: dtMs / 1000, now: timeMs, stats };

            timeIt('Lifecycle', () => lifecycleSystem(ctx));
            timeIt('Orders', () => ordersSystem(ctx));
            timeIt('Movement', () => movementSystem(ctx));

            if (eventThisTick.size > 0) {
                for (const listener of eventListeners) for (const event of eventThisTick) {
                    listener(event);
                }
                eventThisTick.clear();
            }

            for (const listener of listeners) {
                listener(dtMs / 1000, stats);
            }
        },

        /**
         * @param {Function} f
         */
        onTick(f) {
            listeners.add(f);
            return () => listeners.delete(f);
        }
    }

    function loop() {
        if (!running) return;
        const t0 = performance.now();
        api.tick();
        const t1 = performance.now();

        stats.lastTickMs = t1 - t0;
        stats.tpsBudgetMs = fixedDtMs - stats.lastTickMs;

        const delay = Math.max(0, fixedDtMs - stats.lastTickMs);
        timerId = setTimeout(loop, delay);
    }

    /**
     * @param {(ev:ModelEvent)=>void} cb
     */
    function onEvent(cb) {
        eventListeners.add(cb);
        return (() => eventListeners.delete(cb));
    }

    function emit(ev) {
        eventThisTick.add(ev);
    }

    function timeIt(name, fn) {
        const t0 = performance.now();
        fn();
        const dt = performance.now() - t0;
        const prev = stats.perSystemMs[name] ?? dt;
        stats.perSystemMs[name] = prev * 0.8 + dt * 0.2;
    }

    return api;
}

function lifecycleSystem(ctx) {
    const { commands, world, emit } = ctx;
    for (const cmd of commands) {
            if (cmd.type === 'SPAWN_UNIT') {
                const p = cmd.props;
                const id = p.id ?? String(Math.random());
                const entity = new Entity({
                    id,
                    x: p.x, y: p.y,
                    w: p.w, h: p.h,
                    collor: p.collor,
                    speed: p.speed ?? 60,
                    hp: p.hp ?? 100,
                    type: p.type ?? 'unit',
                    owner: p.owner ?? 'neutral',
                    order: null,
                });
                world.entities.set(id, entity);
                emit({ type: 'UnitSpawned', id });
            }

            if (cmd.type === 'KILL_UNIT') {
                const unit = world.entities.get(cmd.id);
                if (unit) {
                    world.entities.delite(cmd.id);
                    emit({ type: 'UnitKilled', id: cmd.id });
                }
            }
    }
}

function ordersSystem(ctx) {
    const { commands, world } = ctx;
    for (const cmd of commands) {
            if (cmd.type === 'MOVE_LINE' || cmd.type === 'MOVE') {
                const unit = world.entities.get(cmd.id);
                if (unit) {
                    unit.order = {
                        type: 'MoveLine',
                        target: { x: cmd.target.x, y: cmd.target.y },
                        speed: cmd.speed ?? unit.speed ?? 60,
                        eps: Math.max(1, Math.min(unit.w, unit.h) * 0.1)
                    };
                }
            }


            if (cmd.type === 'STOP') {
                const unit = world.entities.get(cmd.id);
                if (unit) {
                    unit.order = null;
                }
            }
        
    }
}

function movementSystem(ctx) {
    const { world, emit, dt } = ctx;
    for (const u of world.entities.values()) {
        if (u.order && u.order.type === 'MoveLine') {
            const { x: tx, y: ty } = u.order.target;
            const dx = tx - u.x, dy = ty - u.y;
            const dist = Math.hypot(dx, dy);

            const eps = u.order.eps ?? 2;
            if (dist <= eps) {
                u.x = tx; u.y = ty;
                u.order = null;
                emit({ type: 'UnitArrived', id: u.id, target: { x: tx, y: ty } });
                continue;
            }

            const step = Math.min(dist, (u.order.speed ?? 60) * dt);
            u.x += (dx / dist) * step;
            u.y += (dy / dist) * step;
        }
    }
}
