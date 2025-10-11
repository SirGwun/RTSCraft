import { Network } from './core/network.js';
import { UI } from './ui/ui.js';
import { init as initInput } from './ui/input.js';
import { init as initRender, startRender, state as renderState } from './render/render.js';
import { World } from './data/world.js';
import { Entity } from './data/entity.js';
import { createModel } from './core/model.js';
import { selection } from './ui/selectionStore.js';

// === Config / Types ===
const WS_PATH = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
const SNAPSHOT_HZ = 20;

/** @typedef {{ id:string, name:string, color:string, gold:number, wood:number }} Palyer */
/** @typedef {{ id:string, type:string, x:number, y:number, w:number, h:number, hp:number, owner:string }} Entity */
/** @typedef {{ time:number, palyers: Palyer[], entities: Entity[], me?: string }} Snapshot */


// === Core Singletons (wiring) ===
class GameClient {
  /** @type {Network} */ net;
  /** @type {World} */ world;
  /** @type {Input} */ input;
  /** @type {UI} */ ui;
  /** @type {Selection} */ selection;
  /** @type {CommandBus} */ commands;

    constructor() { }

    init() { }
    start() { }
    stop() { }

    onSnapshot /** @param {Snapshot} snap */(snap) { }
    onEvent /** @param {{type:string, [k:string]:any}} evt */(evt) { }
}

class CommandBuf {
    hi = []; // SYNC, системные
    lo = []; // пользовательские, предикт

    enqueue(cmd, prio = 'lo') {
        (prio === 'hi' ? this.hi : this.lo).push(cmd);
    }
    drain() {
        const a = this.hi; this.hi = [];
        const b = this.lo; this.lo = [];
        return a.concat(b);
    }
}

/** DOM */
const map = /** @type {HTMLCanvasElement} */ (document.getElementById('map'));
const overlay = /** @type {HTMLCanvasElement} */ (document.getElementById('overlay'));

/** Core */
export const world = new World();
export const model = createModel({ world });

export const ui = new UI();
export const commandBuf = new CommandBuf();
export const net = new Network();
export const issue = model.issue;
export let Players = {};
export let Player = { id: '', name: '', color: '', gold: 0, wood: 0 };


// === Bootstrap ===
(function bootstrap() {
    net.onSnapshot = snap => {
        world.applySnapshot(snap);
        ui.setPlayers(world.players.size);
    };

    net.onEvent = evt => ui.pushLog(JSON.stringify(evt));
    net.onPing = ms => ui.setPing(ms + "ms");
    net.onState = st => ui.setConnState(st);

    initRender(document.getElementById('overlay'), document.getElementById('overlay'), world, selection);
    renderState.onFps = fps => ui.setFps(fps);

    ui.init(world);

    model.onEvent(ev => console.log('[MODEL EVT]', ev));
    initInput(map, model, () => Array.from(world.entities.values()), ui, Player);

    ui.bindJoin(({ name, color }) => {
        Player = { id: '', name, color, gold: 0, wood: 0 };
        net.connect();
        net.sendJoin({ name, color });
    });

    makeTestUnits();
    model.start();

    startRender();
})();

function makeTestUnits() {
    world.upsertEntity(new Entity({
        id: 'unit1',
        type: 'unit_peasant',
        x: 50, y: 50,
        w: 24, h: 24,
        hp: 50,
        owner: Player.id,
        speed: 90,
        color: 'yellow'
    }));
    world.upsertEntity(new Entity({
        id: 'unit2',
        type: 'unit_soldier',
        x: 60, y: 60,
        w: 32, h: 32,
        hp: 100,
        owner: Player.id,
        speed: 90,
        color: 'green'
    }));
    world.upsertEntity(new Entity({
        id: 'unit3',
        type: 'unit_soldier',
        x: 200, y: 160,
        w: 32, h: 32,
        hp: 80,
        owner: Player.id,
        speed: 90,
        color: 'red'
    }));
    world.upsertEntity(new Entity({
        id: 'unit4',
        type: 'unit_peasant',
        x: 104, y: 64,
        w: 12, h: 24,
        hp: 50,
        owner: Player.id,
        speed: 90,
        color: 'blue'
    }));

    model.issue.spawnUnit({ id: 'u2', type: 'unit_peasant', x: 94, y: 94, w: 24, h: 24, color: 'orange', speed: 80, owner: Player.id });
}
