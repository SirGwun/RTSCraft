export class Player {
    id;
    name;
    color;
    gold;
    wood;

    /**
     * @param {string} id 
     * @param {string} name
     * @param {string} color 
     * @param {number} gold
     * @param {number} wood
     */

    constructor(id, name, color, gold, wood) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.gold = gold;
        this.wood = wood;
    }
}