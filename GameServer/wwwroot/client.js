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

// === Networking ===
class Network {
  /** @type {WebSocket|null} */ socket = null;
    pingPeriodMs = 2500;
    _pingTimer = null;  

  /** @type {(snap:Snapshot)=>void} */ onSnapshot = () => { };
  /** @type {(evt:any)=>void} */ onEvent = () => { };
  /** @type {(ms:number)=>void} */ onPing = () => { };
  /** @type {(state:'connecting'|'open'|'closed'|'error')=>void} */ onState = () => { };

    connect() {
        this.url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            this.close();
        }
        this.onState('connecting');
        const ws = new WebSocket(this.url);
        this.socket = ws;

        this.socket.onopen = () => { this.onState("open"); this._startPing(); };
        this.socket.onclose = () => this.onState('closed');
        this.socket.onerror = () => this.onState('error');
        this.socket.onmessage = (ev) => this._routeMessage(ev.data);
    }

    _routeMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        const type = msg?.type;

        switch (type) {
            case 'snapshot':
                this._handleSnapshot(msg);
                break;
            case 'event':
                this._handleEvent(msg);
                break;
            case 'pong':
                this._handlePong(msg);
                break;
            default:
                this._handleUnknown(msg);
                break;
        }

    }

    _handlePong(msg) {
        console.log("pong: ", msg);
        try {
            if (msg.type === 'pong' && typeof msg.clientTime === 'number') {
                this.onPing(msg.serverTime - msg.clientTime);
            }
        } catch {}   
    }

    _startPing() {
        this._stopPing();
        this._pingTimer = setInterval(() => this.sendPing(), this.pingPeriodMs);
        this.sendPing();
    }

    _stopPing() {
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
    }

    close() {
        if (this._pingTimer != null) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
        this._lastPingT = null;

        if (this.socket) {
            try {
                this.socket.onopen = null;
                this.socket.onmessage = null;
                this.socket.onerror = null;
                this.socket.onclose = null;

                if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                    this.socket.close(1000, 'client closing');
                }
            } catch (_) { /* ignore */ }
            this.socket = null;
        }
        this.onState('closed');
    }

    // Senders
    /** @param {{name:string,color:string}} payload */
    sendJoin(payload) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "join", ...payload }));
        } else {
            console.log("Connection is not open")
        }
    }
    /** @param {Array<any>} cmds */
    sendCommands(cmds) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "commands", items: cmds }));
        } else {
            console.log("Connection is not open")
        }
    }

    sendPing() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            const clientTime = Date.now();
            this.socket.send(JSON.stringify({ type: "ping", clientTime }));
        } else {
            console.log("Connection is not open")
        }
    }
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

// === Rendering ===
class Renderer {
  /** @type {HTMLCanvasElement} */          mapCanvas;
  /** @type {HTMLCanvasElement} */          overlayCanvas;
  /** @type {CanvasRenderingContext2D} */   mapCtx;
  /** @type {CanvasRenderingContext2D} */   overlayCtx;
  /** @type {World} */                      world;
  /** @type {Selection} */                  selection;
  /** @type {number} */                     lastFrameTs = 0;
  /** @type {(fps:number)=>void} */         onFps = () => { };

    constructor(mapCanvas, overlayCanvas, world, selection) {
        this.mapCanvas = mapCanvas;
        this.overlayCanvas = overlayCanvas;
        this.mapCtx = mapCanvas.getContext("2d");
        this.overlayCtx = overlayCanvas.getContext("2d");

        this.world = world;
        this.selection = selection;

        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
        this.resize();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;

        const parent = this.mapCanvas.parentElement;
        const { width: cssW, height: cssH } = parent.getBoundingClientRect(); 

        this.mapCanvas.style.width = cssW + 'px';
        this.mapCanvas.style.height = cssH + 'px';
        this.mapCanvas.width = Math.floor(cssW * dpr);
        this.mapCanvas.height = Math.floor(cssH * dpr);
        this.mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0); 

        this.overlayCanvas.style.width = cssW + 'px';
        this.overlayCanvas.style.height = cssH + 'px';
        this.overlayCanvas.width = Math.floor(cssW * dpr);
        this.overlayCanvas.height = Math.floor(cssH * dpr);
        this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.drawGrid(32);
    }
    start() { }
    stop() { }
    frame /** @param {number} ts */(ts) { }

    // Drawing helpers
    drawGrid(step = 32) {
        const ctx = this.mapCtx;
        const w = this.mapCanvas.width;
        const h = this.mapCanvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#2b3342';
        ctx.lineWidth = 1;

        // vertical lines
        for (let x = 0; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // horizontal lines
        for (let y = 0; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }
    drawEntities() { }
    drawSelection() { }
}

// === UI (HUD, inspector, join) ===
class UI {
  /** @type {HTMLElement} */ hudConn = document.getElementById('conn');
  /** @type {HTMLElement} */ hudPing = document.getElementById('ping');
  /** @type {HTMLElement} */ hudFps = document.getElementById('fps');
  /** @type {HTMLElement} */ hudPlayers = document.getElementById('players');
  /** @type {HTMLElement} */ hudGold = document.getElementById('gold');
  /** @type {HTMLElement} */ hudWood = document.getElementById('wood');
  /** @type {HTMLElement} */ selectionList = document.getElementById('selectionList');
  /** @type {HTMLElement} */ actions = document.getElementById('actions');
  /** @type {HTMLElement} */ log = document.getElementById('log');
  /** @type {HTMLDivElement} */ joinOverlay = document.getElementById('join');
  /** @type {HTMLFormElement} */ joinForm = document.getElementById('joinForm');

    bindJoin/** @param {(data:{name:string,color:string})=>void} onJoin */(onJoin) {
        const nameInput = document.getElementById('playerName');
        const colorInput = document.getElementById('playerColor');

        const savedName = localStorage.getItem('playerName') || '';
        const savedColor = localStorage.getItem('playerColor') || 'red';
        if (nameInput) nameInput.value = savedName;
        if (colorInput) colorInput.value = savedColor;

        this.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();

            let name = ((nameInput && nameInput.value) || 'Герой').trim();
            let color = ((colorInput && colorInput.value) || 'red').trim();

            name = name.slice(0, 16).replace(/[^\w\u0400-\u04FF -]/g, '');
            if (!name) name = 'Герой';

            if (!isValidCssColor(color)) color = 'red';

            localStorage.setItem('playerName', name);
            localStorage.setItem('playerColor', color);

            this.joinOverlay.classList.add('hidden');
            onJoin({ name, color });
        });

        if (savedName) {
            this.joinOverlay.classList.add('hidden');
            onJoin({ savedName, savedColor });
        }
        function isValidCssColor(value) {
            const s = new Option().style;
            s.color = '';
            s.color = value;
            return s.color !== '';
        }
    }

    setConnState /** @param {string} text */(text) {
        this.hudConn.textContent = text;
    }
    setPing /** @param {number} ms */(ms) {
        this.hudPing.textContent = ms;
    }
    setFps /** @param {number} fps */(fps) {
        this.hugFps.textContent = fps;
    }
    setPlayers /** @param {number} n */(n) {
        this.hudPlayers.textContent = n;
    }
    setResources /** @param {{gold:number, wood:number}} r */(r) {
        this.hudGold.textContent = r.gold;
        this.hudWood.textContent = r.wood;
    }

    renderSelection /** @param {Entity[]} entities */(entities) {
        console.log("Selection:", entities);
    }
    renderActions /** @param {Entity[]} entities */(entities) {
        console.log("Actions for:", entities);
    }
    pushLog /** @param {string} text */(text) {
        const div = document.createElement("div");
        div.textContent = text;
        this.log.appendChild(div);
        this.log.scrollTop = this.log.scrollHeight;
    }
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
