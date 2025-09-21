// @ts-check

export const state = {
  /** @type {HTMLCanvasElement|null} */ mapCanvas: null,
  /** @type {HTMLCanvasElement|null} */ overlayCanvas: null,
  /** @type {CanvasRenderingContext2D} */                    mapCtx: null,
  /** @type {CanvasRenderingContext2D} */                    overlayCtx: null,
  /** @type {number} */                 dpr: window.devicePixelRatio || 1,
  /** @type {string} */                 clearColor: "#111318",
  /** @type {boolean} */                running: false,
  /** @type {number} */                 last: 0,
  /** @type {Array<Function>} */        worldLayers: [],
  /** @type {Array<Function>} */        overlayLayers: [],
  /** @type {any} */                    world: null,
  /** @type {any} */                    selection: null,
  /** @type {{w:number,h:number}} */    ort: { w: 0, h: 0 },
  /** @type {{w:number,h:number}} */    viewport: { w: 0, h: 0 },
                                        camera: { x: 0, y: 0, zoom: 1, minZoom: 0.25, maxZoom: 6 },
                                        mouse: { x: 0, y: 0, inView: false, buttons: 0 },
                                        root: { width: 0, hidth: 0 },
  /** @type {(fps:number)=>void} */     onFps: () => { },
                                        fpsSamples: [],
                                        fpsReportEvery: 250,
                                        _lastFpsReport: 0

};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function init(mapCanvas, overlayCanvas, world, selection) {
    if (!mapCanvas) throw new Error("Render.init: mapCanvas обязателен");
    if (!overlayCanvas) throw new Error("Render.init: overlayCanvas обязателен");


    state.mapCanvas = mapCanvas;
    state.overlayCanvas = overlayCanvas;
    state.mapCtx = mapCanvas.getContext("2d");
    state.overlayCtx = overlayCanvas.getContext("2d");


    state.world = world;
    state.selection = selection;


    state._onResize = resize;
    window.addEventListener("resize", state._onResize);
    resize();

    state.mapCanvas.addEventListener("wheel", e => {
        e.preventDefault();

        const rect = state.mapCanvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        
        const factor = e.deltaY < 0 ? 1.1 : 0.9;

        zoomAt(cx, cy, factor);
    }, { passive: false });

    addEventListener("mousemove", pos, false);

    addWorldLayer(-100, ({ ctx, camera }) => {
        drawGrid(32, ctx, camera);
    });
    //
    addWorldLayer(0, ({ ctx, camera, entities }) => {
        const z = camera.zoom;
        for (const e of entities) {
            const s = worldToScreen(e.x, e.y);
            const w = e.w * z, h = e.h * z;
            ctx.fillStyle = e.color || 'red';
            ctx.fillRect(s.x - w / 2, s.y - h / 2, w, h);
        }
    });
}

function pos(e) {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
}
export function start() {
    if (state.running) return;
    state.running = true;
    state.last = performance.now();
    requestAnimationFrame(frame);
}
export function stop() {
    state.running = false;
    if (state._onResize) window.removeEventListener("resize", state._onResize);
}

export function setCamera({ x, y, zoom }) {
    if (typeof x === "number") state.camera.x = x;
    if (typeof y === "number") state.camera.y = y;
    if (typeof zoom === "number") {
        state.camera.zoom = clamp(zoom, state.camera.minZoom, state.camera.maxZoom);
    }
}

export function panBy(dx, dy) {
    const z = state.camera.zoom;
    state.camera.x += dx / z;
    state.camera.y += dy / z;
}

export function zoomAt(x, y, factor) {
    const pre = screenToWorld(x, y);
    const newZoom = clamp(state.camera.zoom * factor, state.camera.minZoom, state.camera.maxZoom);
    state.camera.zoom = newZoom;
    const post = screenToWorld(x, y);
    state.camera.x += pre.x - post.x;
    state.camera.y += pre.y - post.y;
}

export function screenToWorld(x, y) {
    const { w, h } = state.viewport;
    const { x: cx, y: cy, zoom } = state.camera;
    return { x: (x - w / 2) / zoom + cx, y: (y - h / 2) / zoom + cy };
}

export function worldToScreen(x, y) {
    const { w, h } = state.viewport;
    const { x: cx, y: cy, zoom } = state.camera;
    return { x: (x - cx) * zoom + w / 2, y: (y - cy) * zoom + h / 2 };
}

export function resize() {
    const { width: rootW, height: rootH } = document.getElementById('root').getBoundingClientRect();
    state.root.hidth = rootH;
    state.root.width = rootW;

    state.dpr = window.devicePixelRatio || 1;
    const parent = state.mapCanvas.parentElement;
    const { width: cssW, height: cssH } = parent.getBoundingClientRect();

    state.viewport.w = Math.max(1, Math.floor(cssW));
    state.viewport.h = Math.max(1, Math.floor(cssH));

    const w = Math.max(1, Math.floor(state.viewport.w * state.dpr));
    const h = Math.max(1, Math.floor(state.viewport.h * state.dpr));

    state.mapCanvas.style.width = state.viewport.w + "px";
    state.mapCanvas.style.height = state.viewport.h + "px";
    state.overlayCanvas.style.width = state.viewport.w + "px";
    state.overlayCanvas.style.height = state.viewport.h + "px";

    const apply = (canvas, ctx) => {
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
    };
    apply(state.mapCanvas, state.mapCtx);
    apply(state.overlayCanvas, state.overlayCtx);
}

function frame(now) {
    const dt = Math.min(100, now - state.last);
    state.last = now;

    beginFrame(dt);
    if (shouldRedraw()) {
        clearPass();
        mapPass();
        overlayPass();
    }
    endFrame(dt);

    if (state.running) requestAnimationFrame(frame);
}

function beginFrame(dt) {
    const { mouse, root } = state;
    const EDGE = 30;
    const SPEED = 3;
    if (mouse.x - EDGE < 0) {
        panBy(-SPEED, 0);
    } else if (mouse.x + EDGE > root.width) {
        panBy(SPEED, 0);
    }

    if (mouse.y - EDGE < 0) {
        panBy(0, -SPEED);
    } else if (mouse.y + EDGE > root.hidth) {
        panBy(0, SPEED);
    }
}


function shouldRedraw() {
    return true;
}

function clearPass() {
    const { mapCtx, overlayCtx, viewport: { w, h }, clearColor } = state;
    mapCtx.save();
    mapCtx.setTransform(1, 0, 0, 1, 0, 0);
    mapCtx.fillStyle = clearColor;
    mapCtx.fillRect(0, 0, w, h);
    mapCtx.restore();

    overlayCtx.clearRect(0, 0, w, h);
}


function whatNeedToDrow() {
    // примеры:
    // return Array.from(state.world.entities.values());
    // return (e) => e.type !== 'hidden';
    return Array.from(state.world.entities.values());
}

function resolveVisible(sel) {
    const all = state.world?.entities ?? new Map();
    if (typeof sel === 'function') return Array.from(all.values()).filter(sel);
    if (Array.isArray(sel)) return sel;
    return [];
}

function mapPass(entities) {
    const ctx = state.mapCtx;
    const { camera } = state;
    const visible = resolveVisible(whatNeedToDrow());

    const frame = { ctx, camera, state, entities: visible };

    for (const { draw } of state.worldLayers) draw(frame);
}

function overlayPass() {
    const ctx = state.overlayCtx;
    const { camera } = state;
    const frame = { ctx, camera, state };
    for (const { draw } of state.overlayLayers) draw(frame);
}

function endFrame(dt) {
    const now = performance.now();
    const fps = 1000 / dt;
    state.fpsSamples.push(fps);

    if (state.fpsSamples.length > 60) {
        state.fpsSamples.shift();
    }

    if (now - state._lastFpsReport > state.fpsReportEvery) {
        const avg = state.fpsSamples.reduce((a, b) => a + b, 0) / state.fpsSamples.length;
        state.onFps(Math.round(avg));
        state._lastFpsReport = now;
    }
}

export function addWorldLayer(order = 0, draw) {
    state.worldLayers.push({ order, draw });
    state.worldLayers.sort((a, b) => a.order - b.order);
}

export function addOverlayLayer(order = 0, draw) {
    state.overlayLayers.push({ order, draw });
    state.overlayLayers.sort((a, b) => a.order - b.order);
}

function drawGrid(step = 32) {
    const { mapCtx: ctx, viewport: { w, h }, camera: { x, y, zoom } } = state;
    const left = screenToWorld(0, 0).x;
    const top = screenToWorld(0, 0).y;
    const right = screenToWorld(w, 0).x;
    const bottom = screenToWorld(0, h).y;

    const startX = Math.floor(left / step) * step;
    const endX = Math.ceil(right / step) * step;
    const startY = Math.floor(top / step) * step;
    const endY = Math.ceil(bottom / step) * step;

    ctx.strokeStyle = "#2b3342";
    ctx.lineWidth = 1;

    for (let gx = startX; gx <= endX; gx += step) {
        const sx = worldToScreen(gx, 0).x;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += step) {
        const sy = worldToScreen(0, gy).y;
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    }
}

function prepareOffscreenCaches() { }
function scheduleRaf() { }
function updateMetrics(dt) { }

function assertCtx() { }
function logStats(thresholdMs = 16.7) { }
