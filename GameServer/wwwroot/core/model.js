﻿import { Entity } from '../data/entity.js';
import { World } from '../data/world.js';
import { commands, issue, net } from '../client.js';

/**
 * @typedef {{x:number, y:number, w:number, h:number, color?:string, speed?:number, owner?:string, type?:string, hp?:number}} SpawnProps
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
    let timerId = null;

    let seq = 0;

    /** @type {Command[]} */
    let pending = [];
    let toTick = [];

    const eventListeners = new Set();
    const eventThisTick = new Set();

    const fixedDtMs = 1000 / tps;
    let timeMs = 0;
    const listeners = new Set();

    const stats = {
        lastTickMs: 0,
        tpsBudgetMs: 0,
        perSystemMs: {}
    };

    const api = {
        issue: {
            // CLIENTSIDE
            move: (ids, target, mode) => makeCommand(clientsideCommand, 'MOVE', ids, { target, mode }),
            moveLine: (ids, target, mode) => makeCommand(clientsideCommand, 'MOVE_LINE', ids, { target, mode }),
            stop: (ids) => makeCommand(clientsideCommand, 'STOP', ids),
            attack: (ids, target) => makeCommand(clientsideCommand, 'ATTACK', ids, { target }),
            sinc: (newUnitSt, oldUnitSt, sincSteps) => toTick.push({ type: 'SINC', newUnitSt, oldUnitSt, sincSteps }),

            // SERVERSIDE
            spawnUnit: (props) => serversideCommand({ type: 'SPAWN_UNIT', props }),
            killUnit: (unit) => serversideCommand({ type: 'KILL_UNIT', unit }),
            dealDamage: (target) => serversideCommand({ type: 'DEAL_DAMAGE', target }),
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

            const commands = commandBuf.drain().concat(toTick);
            toTick = [];

            const ctx = { world, commands, emit, dt: dtMs / 1000, now: timeMs, stats };

            timeIt('Sinc', () => sincronizeSystem(ctx));
            timeIt('Lifecycle', () => lifecycleSystem(ctx));
            timeIt('Orders', () => ordersSystem(ctx));
            timeIt('Movement', () => movementSystem(ctx));
            timeIt('Profiling', () => profilingSystem(ctx));

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
        //todo динамически менять tps смотря по загрузке
        stats.tpsBudgetMs = fixedDtMs - stats.lastTickMs;

        const delay = Math.max(0, fixedDtMs - stats.lastTickMs);
        timerId = setTimeout(loop, delay);
    }

    function clientsideCommand(cmd) {
        cmd.seq = ++seq;
        net.sendCommand(cmd);
        pending.push(cmd);
        toTick.push(cmd);
    }

    function serversideCommand(cmd) {
        cmd.seq = ++seq;
        net.sendCommand(cmd);
    }

    function makeCommand(emit, type, ids, extras = {}) {
        const arr = Array.isArray(ids) ? ids : [ids];
        for (const id of arr) {
            if (id == null) continue;
            emit({ ...extras, type, id });
        }
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

function sincronizeSystem(ctx) {
    const { commands, world } = ctx;
    for (const cmd of commands) {
        if (cmd.type !== 'SINC') continue;
        const { oldUnitSt: old, newUnitSt: nw, sincSteps: step } = cmd;
        const unit = world.entities.get(old.id);

        unit.sincOrder = {
            x: nw.x,
            y: nw.y,
            step
        };
    }
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
        if (u.sincOrder) {
            let { x, y, step } = u.sincOrder;
            if (step <= 0) {
                u.sincOrder = null;
            } else {
                const nx = u.x + (x - u.x) / step;
                const ny = u.y + (y - u.y) / step;
                u.setPos(nx, ny);
                u.sincOrder.step = step - 1;
                continue;
            }
        }

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

function profilingSystem(ctx) {

}
