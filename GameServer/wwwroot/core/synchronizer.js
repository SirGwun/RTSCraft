import { Player, Players } from '../client.js';
import { World } from '../data/world.js';
import { Model } from './core/model.js';

/** @type { World }*/
let world;
let model;

export function initSynchronizer(w, m) {
    world = w;
    model = m;
}

export function onSnapshot(snap) {
    if (snap.MyId && Player.id !== snap.MyId) {
        Player.id = snap.MyId;
        world.myId = String(snap.MyId);
        world.setPlayers(snap.Players);
    }



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