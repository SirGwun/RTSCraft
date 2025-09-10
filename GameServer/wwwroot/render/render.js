// === Rendering ===

const state = {
  /** @type {HTMLCanvasElement} */          mapCanvas: null,
  /** @type {HTMLCanvasElement} */          overlayCanvas: null,
  /** @type {CanvasRenderingContext2D} */   mapCtx: null,
  /** @type {CanvasRenderingContext2D} */   overlayCtx: null,
  /** @type {Number} */                     dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 3)),
  /** @type {Number, Number} CSS-ïèêñåëè */ viewport: { w: 0, h: 0 },
  /** @type {string} */                     clearColor: "#111318",
  /** @type {boolean} */                    running: false,
  /** @type {Number} */                     lastTs: 0,
  /** @type {() => {}} */                   worldHandlers: [], // ðèñóåì â ìèðîâûõ êîîðäèíàòàõ (ïîä äåéñòâèåì êàìåðû)
  /** @type {() => {}} */                   overlayHandlers: [], // ðèñóåì ïîâåðõ (UI), â ýêðàííûõ êîîðäèíàòàõ

  /** @type {World} */                      world,
  /** @type {Selection} */                  selection,
  /** @type {number} */                     lastFrameTs = 0,
  /** @param {number} ts */                 frame (ts) { },
  /** @type {(fps:number)=>void} */         onFps = () => { },

    camera: {
        x: 0,
        y: 0,
        zoom: 1,
        minZoom: 0.25,
        maxZoom: 6,
    },
    
    gridOptions: {
        size: 32,
        boldEvery: 8, //?
        color: "#1d222a",
        boldColor: "#262c35",
        axisColor: "#2e7dd1",
    },
};

export function init({ mapCanvas, overlayCanvas, clearColor } = {}) {
    if (!mapCanvas) throw new Error("Render.init: mapCanvas îáÿçàòåëåí");
    if (!overlayCanvas) throw new Error("Render.init: overlayCanvas îáÿçàòåëåí");

    state.mapCanvas = mapCanvas;
    state.overlayCanvas = overlayCanvas;

    state.mapCtx = mapCanvas.getContext("2d", { alpha: false, desynchronized: true });
    state.overlayCtx = overlayCanvas.getContext("2d", { alpha: true, desynchronized: true });

    if (clearColor) state.clearColor = clearColor;

    window.addEventListener("resize", resize);
    resize();
}

export function resize() {
    const { dpr } = state;
    const parent = state.mapCanvas.parentElement;
    const { width: cssW, height: cssH } = parent.getBoundingClientRect();

    state.viewport.w = Math.max(1, Math.floor(cssW));
    state.viewport.h = Math.max(1, Math.floor(cssH));

    // w, h in device px
    const w = Math.max(1, Math.floor(state.viewport.w * dpr));
    const h = Math.max(1, Math.floor(state.viewport.h * dpr));

    //mapCanvas.style.width = viewport.w + 'px';
    //mapCanvas.style.height = viewport.h + 'px';
    //overlayCanvas.style.width = viewport.w + 'px';
    //overlayCanvas.style.height = viewport.h + 'px';

    const apply = (canvas, ctx) => {
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    };

    apply(mapCanvas, mapCtx);
    apply(overlayCanvas, overlayCtx);

    drawGrid();
}

// —————-————————————————————————————————————————————————————
// Camera
// ——————————————————————————————————————————————————————————

export function getCamera() {
    return { ...state.camera };
}

export function setCameraX(x) {
    if (typeof x === "number") state.camera.x = x;
}
export function setCameraY(y) {
    if (typeof y === "number") state.camera.y = y;
}
export function setCameraZoom(zoom) {
    if (typeof zoom === "number") state.camera.zoom = clamp(zoom, state.camera.minZoom, state.camera.maxZoom);
}

// ——————————————————————————————————————————————————————————
// GRID
// ——————————————————————————————————————————————————————————
export function enableGrid(options = {}) {
    state.showGrid = true;
    state.gridOptions = { ...state.gridOptions, ...options };
}

export function disableGrid() {
    state.showGrid = false;
}

function drawGrid() {
    const ctx = state.mapCtx;

    if (!state.showGrid) return;

    const { size, boldEvery, color, boldColor, axisColor } = state.gridOptions;
    const { w, h } = state.viewport;
    const { x: cx, y: cy, zoom } = state.camera;


    // Âèäèìàÿ îáëàñòü â ìèðîâûõ êîîðäèíàòàõ
    const halfW = w / (2 * zoom);
    const halfH = h / (2 * zoom);
    const x1 = Math.floor(cx - halfW) - size;
    const y1 = Math.floor(cy - halfH) - size;
    const x2 = Math.ceil(cx + halfW) + size;
    const y2 = Math.ceil(cy + halfH) + size;

    ctx.lineWidth = 1 / zoom;

    // Âåðòèêàëè
    for (let x = alignTo(x1, size); x <= x2; x += size) {
        const scr = worldToScreen(x, 0).x;
        ctx.beginPath();
        ctx.strokeStyle = (x % (size * boldEvery) === 0) ? boldColor : color;
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
    }

    // Ãîðèçîíòàëè
    for (let y = alignTo(y1, size); y <= y2; y += size) {
        ctx.beginPath();
        ctx.strokeStyle = (y % (size * boldEvery) === 0) ? boldColor : color;
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
    }


    // Îñè
    ctx.strokeStyle = axisColor;
    ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(0, y2); ctx.stroke();
}


function alignTo(value, step) {
    return Math.floor(value / step) * step;
}


// ——————————————————————————————————————————————————————————
// Ïîäïèñàòñÿ/îòïèñàòñÿ íà îòðèñîâêó
// ——————————————————————————————————————————————————————————
export function onDrawWorld(fn) {
    state.worldHandlers.push(fn);
    return () => unsubscribe(state.worldHandlers, fn);
}


export function onDrawOverlay(fn) {
    state.overlayHandlers.push(fn);
    return () => unsubscribe(state.overlayHandlers, fn);
}


function unsubscribe(arr, fn) {
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
}

function drawEntities() { }
function drawSelection() { }

function start() { }
function stop() { }
