/**
 * @typedef {{x:number,y:number}} Vec2
 */

export class Entity {
  /** @type {string} */ id;
  /** @type {string} */ type;
  /** @type {number} */ x;
  /** @type {number} */ y;
  /** @type {number} */ w;
  /** @type {number} */ h;
  /** @type {number} */ hp;
  /** @type {string} */ owner;
  /** @type {number} */ speed;
  /** @type {string} */ color;
  /** @type {boolean} */ selectable

    /**
     * @param {{id:string,type:string,x:number,y:number,w:number,h:number,hp:number,owner:string, speed?:number, color?:string,selectable?:boolean}} data
     */
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.x = data.x;
        this.y = data.y;
        this.w = data.w;
        this.h = data.h;
        this.hp = data.hp;
        this.owner = data.owner;
        this.speed = data.speed || 0;
        this.color = data.color || "red";
        this.selectable = data.selectable
            || data.type.startsWith('unit') 
            || data.type.startsWith('building') 
            || data.type.startsWith('resource');
    }

    /** @returns {Vec2} */
    get pos() { return { x: this.x, y: this.y }; }

    /** @param {Vec2} p */
    set pos(p) { this.x = p.x; this.y = p.y; }

    /** @returns {boolean} */
    isAlive() { return this.hp > 0; }

    /** @param {number} dmg */
    applyDamage(dmg) {
        this.hp = Math.max(0, this.hp - dmg);
    }

    /** @param {{x:number,y:number}} delta */
    moveBy(delta) {
        this.x += delta.x;
        this.y += delta.y;
    }

    /** Serialize for snapshots */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            hp: this.hp,
            owner: this.owner,
            color: this.color
        };
    }
}

export default Entity;
