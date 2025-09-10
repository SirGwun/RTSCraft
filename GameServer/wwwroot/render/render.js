export const state = {
  /** @type {HTMLCanvasElement|null} */ mapCanvas: null,
  /** @type {HTMLCanvasElement|null} */ overlayCanvas: null,
  /** @type {CanvasRenderingContext2D|null} */ mapCtx: null,
  /** @type {CanvasRenderingContext2D|null} */ overlayCtx: null,
  /** @type {number} */ dpr: window.devicePixelRatio || 1,
  /** @type {string} */ clearColor: "#111318",
  /** @type {boolean} */ running: false,
  /** @type {number} */ lastTs: 0,
  /** @type {Array<Function>} */ worldHandlers: [],
  /** @type {Array<Function>} */ overlayHandlers: [],
  /** @type {any} */ world: null,
  /** @type {any} */ selection: null,
  /** @type {{w:number,h:number}} */ viewport: { w: 0, h: 0 },
    camera: { x: 0, y: 0, zoom: 1, minZoom: 0.25, maxZoom: 6 },
  /** @type {(fps:number)=>void} */ onFps: () => { }
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function init({ mapCanvas, overlayCanvas, world, selection } = {}) {
    if (!mapCanvas) throw new Error("Render.init: mapCanvas îáÿçàòåëåí");
    if (!overlayCanvas) throw new Error("Render.init: overlayCanvas îáÿçàòåëåí");


    state.mapCanvas = mapCanvas;
    state.overlayCanvas = overlayCanvas;
    state.mapCtx = mapCanvas.getContext("2d");
    state.overlayCtx = overlayCanvas.getContext("2d");


    state.world = world;
    state.selection = selection;


    state._onResize = resize;
    window.addEventListener("resize", state._onResize);
    resize();
}

export function start() {
    if (state.running) return;
    state.running = true;
    state.lastTs = performance.now();
    requestAnimationFrame(frame);
}
export function stop() {
    state.running = false;
    if (state._onResize) window.removeEventListener("resize", state._onResize);
}

export function resize() {
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

function frame(ts) {
    const dt = Math.min(100, ts - state.lastTs); // êàï îòðûâîâ
    state.lastTs = ts;

    beginFrame(dt);
    if (shouldRedraw()) {
        clearPass();
        const visible = cullCompute();                // <- èñïðàâëåíî èìÿ
        drawPass(visible);
        overlayPass();
    }
    endFrame(dt);

    if (state.running) requestAnimationFrame(frame);
}

function beginFrame(dt) {
    // ìîæíî äîáàâèòü ñ÷¸ò÷èê FPS ïðè æåëàíèè
}

function clearPass() {
    const { mapCtx, overlayCtx, viewport: { w, h }, clearColor } = state;
    // ôîí
    mapCtx.save();
    mapCtx.setTransform(1, 0, 0, 1, 0, 0); // ÷èñòèì â ýêðàííûõ êîîðäèíàòàõ
    mapCtx.fillStyle = clearColor;
    mapCtx.fillRect(0, 0, w, h);
    mapCtx.restore();

    overlayCtx.clearRect(0, 0, w, h);
}

function cullCompute() {
    return Array.from(state.world?.entities?.values?.() || []);
}

function drawPass(entities) {
    drawGrid(32);
    const { mapCtx, camera: { zoom } } = state;
    for (const e of entities) {
        const s = worldToScreen(e.x, e.y);
        const w = e.w * zoom, h = e.h * zoom;
        mapCtx.fillStyle = e.color || "red";
        mapCtx.fillRect(s.x - w / 2, s.y - h / 2, w, h);
    }
}

function overlayPass() {
    // ðàìêè/ïîäñâåòêè ïîçæå
}

function endFrame(dt) { /* ìåòðèêè/dirty ïîçæå */ }

// ïðîñòàÿ ñåòêà â ìèðîâûõ êîîðäèíàòàõ
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
