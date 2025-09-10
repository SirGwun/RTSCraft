import { Network } from './core/network.js';
import { UI } from './ui/ui.js';
import { Renderer } from './render/render.js'; 

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
  /** @type {Renderer} */ renderer;
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


// === World state (authoritative from server) ===
class World {
  /** @type {number} */ time = 0;
  /** @type {Map<string,Palyer>} */ palyers = new Map();
  /** @type {Map<string,Entity>} */ entities = new Map();
  /** @type {string|null} */ myId = null;

    applySnapshot /** @param {Snapshot} snap */(snap) { }
    getMyPalyer() { return null; }
    getEntitiesByOwner /** @param {string} owner */(owner) { return []; }
    getEntity /** @param {string} id */(id) { return null; }
}

// === Commands buffer ===
class CommandBus {
  /** @type {Array<any>} */ queue = [];
  /** @type {(cmds:any[])=>void} */ flushHandler = () => { };

    enqueue /** @param {any} cmd */(cmd) { }
    flush() { }
    clear() { }
}

// === Input & Selection ===
class Input {
  /** @type {HTMLCanvasElement} */  mapCanvas;
  /** @type {Selection} */          selection;
  /** @type {(cmd:any)=>void} */    dispatch = () => { };
  /** @type {{x:number,y:number,down:boolean,startX:number,startY:number}} */ mouse = { x: 0, y: 0, down: false, startX: 0, startY: 0 };
  /** @type {Set<string>} */        keys = new Set();

    constructor(mapCanvas, selection) {
        this.mapCanvas = mapCanvas;
        this.selection = selection;
    }

    attach() { }
    detach() { }

    // Helpers
    toWorld /** @param {number} cx @param {number} cy */(cx, cy) { return { x: 0, y: 0 }; }

    // Actions (emit commands, not do logic)
    issueMove /** @param {{x:number,y:number}} target */(target) { }
    issueAttack /** @param {string} targetId */(targetId) { }
    issueMine /** @param {string} resourceId */(resourceId) { }
    issueBuild /** @param {{building:string,x:number,y:number}} payload */(payload) { }
    issueTrain /** @param {{buildingId:string,unitType:string}} payload */(payload) { }
}

class Selection {
  /** @type {Set<string>} */            ids = new Set();
  /** @type {(ids:string[])=>void} */   onChange = () => { };

    clear() { }
    add /** @param {string} id */(id) { }
    remove /** @param {string} id */(id) { }
    set /** @param {string[]} ids */(ids) { }
    has /** @param {string} id */(id) { return false; }
    list() { return []; }
}

// === Bootstrap ===
(function bootstrap() {
    /** DOM */
    const map = /** @type {HTMLCanvasElement} */ (document.getElementById('map'));
    const overlay = /** @type {HTMLCanvasElement} */ (document.getElementById('overlay'));

    /** Core */
    const world = new World();
    const selection = new Selection();
    const renderer = new Renderer(map, overlay, world, selection);
    const ui = new UI();
    const commands = new CommandBus();
    const net = new Network();

    /** Wiring */
    const input = new Input(map, selection);
    input.dispatch = cmd => commands.enqueue(cmd);
    commands.flushHandler = cmds => net.sendCommands(cmds);

    net.onSnapshot = snap => {
        world.applySnapshot(snap);
        ui.setPlayers(world.palyers.size);
    };
    net.onEvent = evt => ui.pushLog(JSON.stringify(evt));
    net.onPing = ms => ui.setPing(ms + "ms");
    net.onState = st => ui.setConnState(st);

    selection.onChange = ids => {
        // обновить UI действий/инспектор; найти сущности по ids
    };

    ui.bindJoin(({ name, color }) => {
        net.connect(WS_PATH);
        net.sendJoin({ name, color });
    });

    renderer.onFps = fps => ui.setFps(fps);

    // start loops
    renderer.start();
})();
