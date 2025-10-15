import { Entity } from './entity.js';
import { Player } from './player.js';

export class World {
    /** @type {number} */
    time = 0;

    /** @type {Map<string, Player>} */
    players = new Map();
    /** @type {Map<string, Entity>} */
    entities = new Map();
    myId = -1;

    /** @returns {Map<string, Player>} */
    getPlayers() { return this.players; }

    /** @param {Snapshot} seed */
    constructor(seed) { if (seed) this.applySnapshot(seed); }


    applySnapshot(snap) {
        if (!snap || typeof snap !== 'object') return;

        if (typeof snap.time === 'number') this.time = snap.time;

        if (typeof snap.myId === 'string' || typeof snap.myId === 'number') {
            this.myId = String(snap.myId);
        }

        if (snap.entities) {
            this.setEntities(snap.entities);
        }

        if (snap.players) {
            this.setPlayers(snap.players);
        }
    }

    setPlayers(players) {
        const list = Array.isArray(players) ? players : Object.values(players);
        for (const p of list) {
            if (!p) continue;
            const pid = p.id != null ? String(p.id) : undefined;
            if (!pid) continue;
            const prev = this.players.get(pid) || { id: pid };
            this.players.set(pid, { ...prev, ...p, id: pid });
        }
    }

    setEntities(entities) {
        const list = Array.isArray(entities) ? entities : Object.values(entities);
        for (const e of list) {
            if (!e) continue;
            const eid = e.id != null ? String(e.id) : undefined;
            if (!eid) continue;
            const prev = this.entities.get(eid) || { id: eid };

            const owner = (e).owner != null ? String(((e)).owner) : prev.owner;
            this.entities.set(eid, { ...prev, ...e, id: eid, owner });
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

