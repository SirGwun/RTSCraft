import { client } from '../client.js';
import { Model } from './model.js';
import { World } from '../data/world.js';

export class Synchronizer {
    world;
    model;


    constructor(world, model) {
        this.world = world;
        this.model = model;
    }

    onSnapshot(snap) {
        const lastAckSeq = snap.lastAckSeq; 
        if (lastAckSeq) {
            model.sqush(lastAckSeq);
        }

        if (snap.entities) {
            const list = Array.isArray(snap.entities)
                ? snap.entities
                : Object.values(snap.entities);
            for (const e of list) {
                if (!e || !e.id) continue;
                const prev = this.entities.get(e.id) || { id: e.id }; 
                this.model.sinc(prev, e);
                this.world.entities.set(e.id, { ...prev, ...e });
            }
        }
    }



// Players
if (snap.players) {
    const list = Array.isArray(snap.players)
        ? snap.players
        : Object.values(snap.players);
    for (const p of list) {
        if (p && p.id) this.players.set(p.id, { ...this.players.get(p.id), ...p });
    }
}


    updateWorld(newData) {

    }
}