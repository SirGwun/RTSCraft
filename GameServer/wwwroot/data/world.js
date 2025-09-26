/**
 * @typedef {{x:number,y:number}} Vec2
 * @typedef {{id:string|number, name?:string}} PlayerIn   // вход из снапшота
 * @typedef {{id:string|number, x:number, y:number, w:number, h:number, color:string, speed?:number, owner:string|number, type:string, hp:number}} EntityIn
 * @typedef {{
 *   time?:number,
 *   myId?:string|number,
 *   players?: PlayerIn[] | Record<string, PlayerIn>,
 *   entities?: EntityIn[] | Record<string, EntityIn>
 * }} Snapshot
 */

/** Внутренние типы храним уже со строковыми id */
/// <typedef {{id:string, name?:string}} Player>
/// <typedef {{id:string, x:number, y:number, w:number, h:number, color:string, speed?:number, owner:string, type:string, hp:number, selectable?:boolean}} Entity>

export class World {
  /** @type {number} */ time = 0;
  /** @type {Map<string, Player>} */ players = new Map();
  /** @type {Map<string, Entity>} */ entities = new Map();
  /** @type {string|null} */ myId = null;

  // Back-compat: alias с опечаткой
  /** @returns {Map<string, Player>} */ get palyers() { return this.players; }

    /** @param {Snapshot=} seed */
    constructor(seed) { if (seed) this.applySnapshot(seed); }

    /**
     * Apply partial or full snapshot. Non-specified fields remain.
     * Replaces/merges only items present in the snapshot.
     * @param {Snapshot} snap
     */
    applySnapshot(snap) {
        if (!snap || typeof snap !== 'object') return;

        if (typeof snap.time === 'number') this.time = snap.time;

        // myId: приводим к строке, если пришло число
        if (typeof snap.myId === 'string' || typeof snap.myId === 'number') {
            this.myId = String(snap.myId);
        }

        // Players
        if (snap.players) {
            const list = Array.isArray(snap.players) ? snap.players : Object.values(snap.players);
            for (const p of list) {
                if (!p) continue;
                const pid = p.id != null ? String(p.id) : undefined;
                if (!pid) continue;
                const prev = this.players.get(pid) || { id: pid };
                this.players.set(pid, { ...prev, ...p, id: pid });
            }
        }

        // Entities
        if (snap.entities) {
            const list = Array.isArray(snap.entities) ? snap.entities : Object.values(snap.entities);
            for (const e of list) {
                if (!e) continue;
                const eid = e.id != null ? String(e.id) : undefined;
                if (!eid) continue;
                const prev = this.entities.get(eid) || { id: eid };
                // owner тоже нормализуем в строку
                const owner = /** @type {any} */(e).owner != null ? String((/** @type {any} */(e)).owner) : prev.owner;
                this.entities.set(eid, { ...prev, ...e, id: eid, owner });
            }
        }
    }

    /** @returns {Player|null} */
    getMyPlayer() {
        if (!this.myId) return null;
        return this.players.get(this.myId) || null;
    }

    /** @param {string} owner @returns {Entity[]} */
    getEntitiesByOwner(owner) {
        if (!owner) return [];
        const out = [];
        for (const e of this.entities.values()) if (e.owner === owner) out.push(e);
        return out;
    }

    /** @param {string} id @returns {Entity|null} */
    getEntity(id) { return this.entities.get(id) || null; }

    /** Convenience helpers */
    /** @param {EntityIn} e */
    upsertEntity(e) {
        if (!e || e.id == null) return;
        const id = String(e.id);
        const prev = this.entities.get(id) || { id };
        const owner = /** @type {any} */(e).owner != null ? String((/** @type {any} */(e)).owner) : prev.owner;
        this.entities.set(id, { ...prev, ...e, id, owner });
    }

  /** @param {string} id */ removeEntity(id) { this.entities.delete(id); }

    clear() { this.players.clear(); this.entities.clear(); this.time = 0; this.myId = null; }
}

export default World;

// Debug tip (временно):
// В начале applySnapshot добавь: console.log('applySnapshot myId =', snap.myId);
