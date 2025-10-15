import { Network } from './core/network.js';
import { UI } from './ui/ui.js';
import { init as initInput } from './ui/input.js';
import { init as initRender, startRender, state as renderState } from './render/render.js';
import { World } from './data/world.js';
import { Entity } from './data/entity.js';
import { createModel } from './core/model.js';
import { selection } from './ui/selectionStore.js';
import { CommandBuf } from './core/commandBuf.js';
import { makeTestUnits1 } from './test/props.js';

/** Core */
export const ui = new UI();
export const net = new Network();
export let world;
export let model; 
export let issue;
export const commandBuf = new CommandBuf();
export let players;
export let me = { id: '', name: '', color: '', gold: 0, wood: 0 };

/** DOM */
const map = /** @type {HTMLCanvasElement} */ (document.getElementById('map'));
const overlay = /** @type {HTMLCanvasElement} */ (document.getElementById('overlay'));

(function joinServer() {
    const name = localStorage.getItem('playerName');
    const color = localStorage.getItem('playerColor');
    console.log('at start');
    if (name != null && color != null) {
        net.sendJoin({ name, color });
    } else {
        ui.bindJoin(({ name, color }) => net.sendJoin({ name, color }));
    }
})();

export function init(data) {
    world = new World(data);

    players = world.getPlayers();
    me = world.getMyPlayer();

    console.log("me - ", me.name);

    ui.init(world);
    model = createModel({ world });
    issue = model.issue;

    initRender(document.getElementById('overlay'), document.getElementById('overlay'), world, selection);
    initInput(map, model, () => Array.from(world.entities.values()), ui, me);

    bootstrap();
}

// === Bootstrap ===
function bootstrap() {
    console.log("__build__", "__" + new Date().toISOString());

    net.onEvent = evt => ui.pushLog(JSON.stringify(evt));
    net.onPing = ms => ui.setPing(ms + "ms");
    renderState.onFps = fps => ui.setFps(fps);
    model.onEvent(ev => console.log('[MODEL EVT]', ev));
    
    makeTestUnits1();

    model.start();
    startRender();
}