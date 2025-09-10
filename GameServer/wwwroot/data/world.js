// World module
// ESM compatible: default and named export

/**
 * @typedef {{x:number,y:number}} Vec2
 * @typedef {{id:string,name?:string}} Player
 * @typedef {{
 *   id:string,
 *   owner?:string,
 *   type?:string,
 *   pos?:Vec2,
 *   [k:string]: any
 * }} Entity
 * @typedef {{
 *   time?:number,
 *   myId?:string,
 *   players?: Player[] | Record<string, Player>,
 *   entities?: Entity[] | Record<string, Entity>
 * }} Snapshot
 */

export class World {
  /** @type {number} */ time = 0;
  /** @type {Map<string, Player>} */ players = new Map();
  /** @type {Map<string, Entity>} */ entities = new Map();
  /** @type {string|null} */ myId = null;

  // Back-compat: expose misspelled alias if legacy code expects it
  /** @returns {Map<string, Player>} */ get palyers() { return this.players; }

    /** @param {Snapshot=} seed */
    constructor(seed) {
        if (seed) this.applySnapshot(seed);
    }

    /**
     * Apply partial or full snapshot. Non-specified fields remain.
     * Replaces existing players and entities only for items present in the snapshot.
     * @param {Snapshot} snap
     */
    applySnapshot(snap) {
        if (!snap || typeof snap !== 'object') return;

        if (typeof snap.time === 'number') this.time = snap.time;
        if (typeof snap.myId === 'string') this.myId = snap.myId;

        // Players
        if (snap.players) {
            const list = Array.isArray(snap.players)
                ? snap.players
                : Object.values(snap.players);
            for (const p of list) {
                if (p && p.id) this.players.set(p.id, { ...this.players.get(p.id), ...p });
            }
        }

        // Entities
        if (snap.entities) {
            const list = Array.isArray(snap.entities)
                ? snap.entities
                : Object.values(snap.entities);
            for (const e of list) {
                if (!e || !e.id) continue;
                const prev = this.entities.get(e.id) || { id: e.id };
                this.entities.set(e.id, { ...prev, ...e });
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
    getEntity(id) {
        return this.entities.get(id) || null;
    }

  /** Convenience helpers */
  /** @param {Entity} e */ upsertEntity(e) {
        if (!e || !e.id) return;
        const prev = this.entities.get(e.id) || { id: e.id };
        this.entities.set(e.id, { ...prev, ...e });
    }
  /** @param {string} id */ removeEntity(id) { this.entities.delete(id); }
    clear() { this.players.clear(); this.entities.clear(); this.time = 0; this.myId = null; }
}

export default World;

// Usage example:
// import World from './world.js'
// const world = new World();
// function cullCompute() { return Array.from(world.entities.values()); }
