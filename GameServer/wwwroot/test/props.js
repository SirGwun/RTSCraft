import { world, me, model } from "../client.js";
import { Entity } from "../data/entity.js";

export function makeTestUnits1() {
    world.upsertEntity(new Entity({
        id: 'unit1',
        type: 'unit_peasant',
        x: 50, y: 50,
        w: 24, h: 24,
        hp: 50,
        owner: me.id,
        speed: 90,
        color: 'yellow'
    }));
    world.upsertEntity(new Entity({
        id: 'unit2',
        type: 'unit_soldier',
        x: 60, y: 60,
        w: 32, h: 32,
        hp: 100,
        owner: me.id,
        speed: 90,
        color: 'green'
    }));
    world.upsertEntity(new Entity({
        id: 'unit3',
        type: 'unit_soldier',
        x: 200, y: 160,
        w: 32, h: 32,
        hp: 80,
        owner: me.id,
        speed: 90,
        color: 'red'
    }));
    world.upsertEntity(new Entity({
        id: 'unit4',
        type: 'unit_peasant',
        x: 104, y: 64,
        w: 12, h: 24,
        hp: 50,
        owner: me.id,
        speed: 90,
        color: 'blue'
    }));

    model.issue.spawnUnit({ id: 'u2', type: 'unit_peasant', x: 94, y: 94, w: 24, h: 24, color: 'orange', speed: 80, owner: me.id });
}
