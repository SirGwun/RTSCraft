// @ts-check

//TODO интерполяция
/**
 * Да, ты схватил идею точно: рисовать не «сырые» `x,y` из модели, а интерполированные координаты `lerp(prev -> curr, alpha)`, где `alpha` — сколько времени прошло с последнего тика модели относительно `fixedDt`. Тогда между двумя тиками (TPS) рендер (FPS) «втыкает» промежуточные позиции и движение выглядит гладко.

Ниже — минимальный, практичный план внедрения под твой код.

# Что добавить в модель

1. При **спауне** сразу ставь «прошлые» координаты:

```js
// lifecycleSystem, при SPAWN_UNIT
world.entities.set(id, {
id, x: p.x, y: p.y, w: p.w, h: p.h,
color: p.color || 'red',
speed: p.speed ?? 60,
// ↓ для интерполяции
prevX: p.x, prevY: p.y,
order: null
});
```

2. В **движении** перед апдейтом позиции копируй текущие в prev:

```js
// movementSystem, перед изменением u.x/u.y
u.prevX = u.x;
u.prevY = u.y;
// потом считаешь dx,dy и двигаешь u.x/u.y
```

3. Экспортируй **альфу** (прогресс с момента последнего тика):

```js
let lastTickAtMs = performance.now();

api.tick = function(dtMs = fixedDtMs) {
timeMs += dtMs;
// ... системы ...
lastTickAtMs = performance.now();
};

api.getInterpAlpha = () => {
const since = performance.now() - lastTickAtMs;
return Math.max(0, Math.min(1, since / fixedDtMs));
};
```

# Как использовать в рендере / слоях

Твой псевдокод слоя:

```js
addWorldLayer(0, ({ ctx, camera, entities }) => {
const z = camera.zoom;
for (const e of entities) {
const s = worldToScreen(e.x, e.y);
ctx.fillRect(s.x - (e.w*z)/2, s.y - (e.h*z)/2, e.w*z, e.h*z);
}
});
```

Станет таким (добавили `alpha` и лерп):

```js
addWorldLayer(0, ({ ctx, camera, entities, alpha }) => {
const z = camera.zoom;

for (const e of entities) {
const px = e.prevX ?? e.x;
const py = e.prevY ?? e.y;
const ix = px + (e.x - px) * alpha;
const iy = py + (e.y - py) * alpha;

const s = worldToScreen(ix, iy);
const w = e.w * z, h = e.h * z;
ctx.fillStyle = e.color || 'red';
ctx.fillRect(s.x - w/2, s.y - h/2, w, h);
}
});
```

Где брать `alpha`? В том месте, где ты вызываешь отрисовку слоёв, передавай:

```js
const alpha = model.getInterpAlpha(); // 0..1
layer.draw({ ctx, camera, entities, alpha });
```

# Пара заметок, чтобы не споткнуться

* Не мутируй позиции в рендере (никаких «кружков по орбите» в `drawPass`), вся логика движения — только в модели.
* Сильно поднимать TPS — рабочий костыль, но это съедает CPU и не убирает микроджиттер таймеров. Интерполяция даёт ровность даже на 20–30 TPS.
* `eps` можно держать небольшим (1–3 пикселя) — с интерполяцией финиш не будет «дёргаться».
* Если захочешь идеал: переведи цикл модели на rAF + аккумулятор (`acc += frameDt; while (acc>=fixedDt) tick(fixedDt); alpha=acc/fixedDt`). Но даже с `setTimeout` интерполяция уже даёт заметно плавнее.

Хочешь — на следующем шаге покажу «аккумуляторный» цикл и как из него бесплатно получать `alpha`, чтобы не трогать `performance.now()` внутри модели.

 */

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
                                        camera: { x: 0, y: 0, zoom: 1, minZoom: 0.5, maxZoom: 4 },
                                        mouse: { x: 0, y: 0, inView: false, buttons: 0 },
                                        root: { width: 0, height: 0 },
  /** @type {(fps:number)=>void} */     onFps: () => { },
                                        fpsSamples: [],
                                        fpsReportEvery: 250,
                                        _lastFpsReport: 0,
                                        inside: false,
    worldBounds: { l: -300, r: 300, t: 300, b: -300 }
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
    const windowRoot = document.getElementById('root');
    if (!windowRoot) throw new Error("Render.init: html 'root' not found");
    windowRoot.addEventListener('pointerenter', () => { state.inside = true; });
    windowRoot.addEventListener('pointerleave', () => { state.inside = false; });
    resize();

    state.mapCanvas.addEventListener("wheel", e => {
        e.preventDefault();

        const rect = state.mapCanvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        
        const factor = e.deltaY < 0 ? 1.1 : 0.9;

        zoomAt(factor);
    }, { passive: false });

    addEventListener("mousemove", pos, false);

    addWorldLayer(-100, ({ ctx, camera }) => {
        drawGrid(32, ctx, camera);
    });

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
    const cam = state.camera;
    const z = cam.zoom;
    const b = state.worldBounds;

    let nx = cam.x + dx / z;
    let ny = cam.y + dy / z;

    console.log("pan", nx, ny)

    if (nx >= b.l && nx <= b.r) cam.x = nx;
    if (ny >= b.b && ny <= b.t) cam.y = ny;
}
   

export function zoomAt(factor) {
     state.camera.zoom = clamp(state.camera.zoom * factor, state.camera.minZoom, state.camera.maxZoom);
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
    state.root.height = rootH;
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
    const SPEED = 10;

    if (state.inside) {
        if (mouse.x - EDGE < 0) {
            panBy(-SPEED, 0);
        } else if (mouse.x + EDGE > root.width) {
            panBy(SPEED, 0);
        }

        if (mouse.y - EDGE < 0) {
            panBy(0, -SPEED);
        } else if (mouse.y + EDGE > root.height) {
            panBy(0, SPEED);
        }
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
