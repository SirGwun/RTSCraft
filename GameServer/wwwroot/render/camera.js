import { setCameraX, setCameraY, setCameraZoom, getCamera } from "./render.js"; }
export function setCamera(patch) {
    if (!patch) return;
    if (typeof patch.x === "number") state.camera.x = patch.x;
    if (typeof patch.y === "number") state.camera.y = patch.y;
    if (typeof patch.zoom === "number") state.camera.zoom = clamp(patch.zoom, state.camera.minZoom, state.camera.maxZoom);
}

export function pan(dx, dy) {
    // dx, dy Ч в экранных пиксел€х; переводим в мировые с учетом зума
    setCameraX(dx / getCamera().zoom);
    setCameraY(dy / getCamera().zoom);
}


export function zoomAt(screenX, screenY, factor) {
    const pre = screenToWorld(screenX, screenY);
    setCameraZoom(clamp(state.camera.zoom * factor, state.camera.minZoom, state.camera.maxZoom));

    // ƒержим фокус под курсором неизменным
    const post = screenToWorld(screenX, screenY);
    setCameraX(pre.x - post.x);
    setCameraY(pre.y - post.y);
}

//координаты экрана в мировые координаты
export function screenToWorld(x, y) {
    // x, y Ч координаты внутри canvas в CSS-пиксел€х
    const { w, h } = state.viewport;
    const { x: cx, y: cy, zoom } = state.camera;
    return {
        x: (x - w / 2) / zoom + cx,
        y: (y - h / 2) / zoom + cy,
    };
}

//координаты в мировых координатах в координаты экрана
export function worldToScreen(x, y) {
    const { w, h } = state.viewport;
    const { x: cx, y: cy, zoom } = state.camera;
    return {
        x: (x - cx) * zoom + w / 2,
        y: (y - cy) * zoom + h / 2,
    };
}