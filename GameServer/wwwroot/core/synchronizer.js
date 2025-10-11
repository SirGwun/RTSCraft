import { Player, Players, model as mainModel, world as mainWorld} from '../client.js';
import { World } from '../data/world.js';
import { createModel } from './model.js'; 

let tempModel;

export function onSnapshot(snap) {
    if (!snap.lastAckSeq) return;
    if (snap.myId && Player.id !== snap.myId) {
        Player.id = snap.myId;
        mainWorld.myId = String(snap.myId);
        mainWorld.setPlayers(snap.players);
    }

    const newWorld = new World(snap);
    const notApliedCommands = mainModel.cutPending(snap.lastAckSeq);

    if (notApliedCommands.length > 0 && snap.serverTime) {
        if (tempModel) tempModel.stop(); //если окажется что модель не успевает - достать состояние мира на момент остановки и слить его с серверной симуляцией (пока что не нужно)
        tempModel = createModel({ world: newWorld });
        tempModel.startSimulation(snap.serverTime, notApliedCommands, sincWorld);
    } else {
        sincWorld(newWorld);
    }
}

/**
 * @param {World} newWorld
 */
function sincWorld(newWorld) {
    const SINC_STEPS = 3; //можно динамически определять смотря по различию

    for (const [id, newU] of newWorld.entities) {
        const oldU = mainWorld.entities.get(id);
        // (spawn/kill) происходят отдельными коммандами от сервера - в снапшоты они не попадут
        if (!oldU) {
            mainModel.issue.spawnUnit(newU);
        }
        if (changed(newU, oldU)) {
            mainModel.issue.sinc(
                newU,
                oldU,
                SINC_STEPS
            );
        }
        for (const [k, v] of Object.entries(pickInstantStats(newU))) {
            if (v !== undefined) oldU[k] = v;
        }
    }
}


function changed(a, b) {
    return a.x !== b.x ||
        a.y !== b.y;
}

/**
 * @param {import('../data/entity.js').Entity} u
 * @returns
 */
function pickInstantStats(u) {
    return {
        id: u.id, hp: u.hp,
        w: u.w, h: u.h, owner: u.owner,
        speed: u.speed, color: u.color 
    };
}