import { selection } from './selectionStore.js';
import { screenToWorld, worldToScreen } from '../render/render.js'; 
import { addOverlayLayer } from '../render/render.js';
import { issue } from '../client.js'; // твой шлюз команд
import { Entity } from '../data/entity.js';

/** @type {{sx:number,sy:number, wx:number,wy:number}|null} */
let downPt = null;

/** @type {{sx:number,sy:number, wx:number,wy:number}|null} */
let lastMove;

/** @type {'default' | 'attackMove'} */
let mode = 'default';

let dragging = false;
const dragThreshold = 4;

let isDown = false;

/**
 * @param {HTMLCanvasElement} canvas - Канвас для рендера
 * @param {Object} model - Модель данных
 * @param {() => Entity[]} entities - Список сущностей
 * @param {Object} ui - Настройки интерфейса
 * @param {Object} owner - Владелец
 */
export function init(canvas, model, entities, ui, owner) {
    if (!canvas) throw 'canvas is required';
    if (!model) throw 'model is required';
    if (!entities) throw 'entities is required';
    if (!ui) throw 'ui is required';
    if (!owner) throw 'owner is required';

    const hitTestPoint = (x, y) => {
        const under = [];
        for (const e of entities()) {
            if (Math.abs(x - e.x) <= e.w / 2 && Math.abs(y - e.y) <= e.h / 2) {
                under.push(e);
            }
        }

        under.sort((a, b) => (b.z || 0) - (a.z || 0));
        const top = under[0];
        if (!top) return { kind: 'ground' };
        const kind = top.owner === owner.id ? 'ally'
            : top.type === 'resource' ? 'resource'
                : 'enemy';
        return { kind, id: top.id, entity: top };
    };

    const isOwned = (id) => {
        for (const e of entities()) if (e.id === id) return e.owner === owner.id;
        return false;
    };

    const selectInRect = (wminx, wmaxx, wminy, wmaxy, additive) => {
        const pick = [];
        for (const e of entities()) {
            if (!e.selectable) continue;
            if (e.owner !== owner.id) continue;
            const x1 = e.x - e.w / 2, x2 = e.x + e.w / 2;
            const y1 = e.y - e.h / 2, y2 = e.y + e.h / 2;
            if (x2 >= wminx && x1 <= wmaxx && y2 >= wminy && y1 <= wmaxy) pick.push(e.id);
        }
        if (additive) {
            const set = new Set(selection.get().ids);
            for (const id of pick) {
                set.add(id);
            }
            selection.set(Array.from(set));
        } else {
            selection.set(pick);
        }
        console.log(pick);
    };

    const selectSingle = (x, y, additive) => {
        const hit = hitTestPoint(x, y);
        if (hit && hit.id != null) {                 
            if (additive) {
                const has = selection.get().ids.includes(hit.id);
                has ? selection.del(hit.id) : selection.add(hit.id);
            } else {
                selection.set([hit.id]);
            }
        } else {
            selection.clear();
        }
    };


    const onPointerDown = (e) => {
        //ЛКМ
        if (e.button === 0) {
            isDown = true;
            canvas.setPointerCapture(e.pointerId);
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { x: wx, y: wy } = screenToWorld(sx, sy);
            downPt = { sx, sy, wx, wy };
            dragging = false;
        }
    };

    const onPointerUp = (e) => {
        try {
            //ЛКМ
            if (e.button === 0 && downPt) {
                const additive = e.shiftKey || e.ctrlKey;
                if (dragging && lastMove) {
                    // рамочка
                    const wminx = Math.min(lastMove.wx, downPt.wx);
                    const wmaxx = Math.max(lastMove.wx, downPt.wx);
                    const wminy = Math.min(lastMove.wy, downPt.wy);
                    const wmaxy = Math.max(lastMove.wy, downPt.wy);
                    selectInRect(wminx, wmaxx, wminy, wmaxy, additive);
                } else {
                    // одиночное выделение
                    selectSingle(downPt.wx, downPt.wy, additive);
                }
            }
            //ПКМ
            if (e.button === 2) {
                const { ids } = selection.get();
                const ownedIds = ids.filter(isOwned);
                if (ownedIds.length && lastMove) {
                    const target = lastMove
                        ? hitTestPoint(lastMove.wx, lastMove.wy)
                        : { kind: 'ground' };

                    if (mode === 'attackMove') {
                        if (target.kind === 'ground') {
                            issue.move(ownedIds, { x: lastMove.wx, y: lastMove.wy }, { attackMove: true });
                        } else {
                            if (target.id != null) issue.attack(ownedIds, target.id);
                        }
                        mode = 'default';
                    } else {
                        if (target.kind === 'enemy' && target.id != null) {
                            issue.attack(ownedIds, target.id);
                        } else if (target.kind === 'resource' && target.id != null) {
                            issue.harvest(ownedIds, target.id);
                        } else {
                            issue.moveLine(ownedIds, { x: lastMove.wx, y: lastMove.wy });
                        }
                    }
                }
            }
        } finally {
            isDown = false;
            dragging = false;
            downPt = null; 
        }
    };

    const onPointerMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorld(sx, sy);
        lastMove = { sx, sy, wx, wy };

        const hit = hitTestPoint(wx, wy);

        if (!selection.get().hovel
            || hit.kind !== selection.get().hovel.kind
                || hit.id !== selection.get().hovel.id) selection.setHovel(hit);

        if (isDown && downPt && !dragging) {
            if (Math.hypot(sx - downPt.sx, sy - downPt.sy) >= dragThreshold) dragging = true;
        }
    };

    const onContextMenu = (e) => e.preventDefault();

    const onKeyDown = (e) => {
        if (e.key === 'a' || e.key === 'A') {
            mode = 'attackMove';
        }

        if (e.key === 'Escape') {
            selection.clear();
            mode = 'default';
        }

        if (e.key === 's' || e.key === 'S') {
            const { ids } = selection.get();
            const ownedIds = ids.filter(isOwned); 
            if (ownedIds.length) issue.stop(ownedIds); 
        }
    };

    addOverlayLayer(1000, ({ ctx, camera: cam }) => {
        // рамка
        if (dragging && downPt && lastMove) {
            const x = Math.min(downPt.sx, lastMove.sx), y = Math.min(downPt.sy, lastMove.sy);
            const w = Math.abs(lastMove.sx - downPt.sx), h = Math.abs(lastMove.sy - downPt.sy);
            ctx.save();
            ctx.setLineDash([6, 4]); ctx.lineWidth = 1;
            ctx.strokeStyle = '#4af'; ctx.strokeRect(x, y, w, h);
            ctx.globalAlpha = 0.1; ctx.fillStyle = '#4af'; ctx.fillRect(x, y, w, h);
            ctx.restore();
        }
        // обводка выделенных
        const z = (cam && cam.zoom) || 1;
        const { ids } = selection.get();
        if (ids.length) {
            for (const e of entities()) {
                if (!ids.includes(e.id)) continue;
                const s = worldToScreen(e.x, e.y);
                const w = e.w * z, h = e.h * z;
                ctx.save();
                ctx.lineWidth = 2; ctx.strokeStyle = '#6f6';
                ctx.strokeRect(s.x - w / 2 - 2, s.y - h / 2 - 2, w + 4, h + 4);
                ctx.restore();
            }
        }
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
}
