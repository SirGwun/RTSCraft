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
  /** @type {boolean} */ selectable;
    moveOrder = {};
    sincOrder = {};
    prevState = {}; 

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

    /** @param {{x:number,y:number}} p */
    setPos(p) {
        this.prevState = {
            x: this.x,
            y: this.y
        }

        this.x = p.x;
        this.y = p.y;
    }

    /** @param {{x:number,y:number}} delta */
    moveBy(delta) {
        this.prevState = {
            x: this.x,
            y: this.y
        }

        this.x += delta.x;
        this.y += delta.y;
    }

    /** @returns {boolean} */
    isAlive() { return this.hp > 0; }

    /** @param {number} dmg */
    applyDamage(dmg) {
        this.hp = Math.max(0, this.hp - dmg);
    }

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

    renderEntityCard() {
        const card = document.createElement('div');
        card.style.display = 'grid';
        card.style.gridTemplateColumns = '1fr 1fr';
        card.style.gridTemplateRows = 'auto auto auto';
        card.style.gap = '6px';
        card.style.background = '#0f172a';

        // имя (id)
        const nameEl = document.createElement('div');
        nameEl.textContent = this.id;
        nameEl.style.fontSize = '22px';
        nameEl.style.gridColumn = '1 / span 2'; // растянуть на 2 колонки
        nameEl.style.textAlign = 'left';
        nameEl.style.fontWeight = 'bold';
        card.appendChild(nameEl);

        // тип
        const typeEl = document.createElement('div');
        typeEl.textContent = `Тип: ${this.type}`;
        typeEl.style.gridColumn = '1 / span 2';
        typeEl.style.textAlign = 'left';
        typeEl.style.fontSize = '13px';
        typeEl.style.opacity = '0.85';
        card.appendChild(typeEl);

        // HP (по центру, крупнее)
        const hpEl = document.createElement('div');
        hpEl.textContent = `HP: ${this.hp}`;
        hpEl.style.gridColumn = '1 / span 2';
        hpEl.style.textAlign = 'center';
        hpEl.style.fontSize = '18px';
        hpEl.style.fontWeight = 'bold';
        card.appendChild(hpEl);

        // координаты (слева внизу)
        const coordEl = document.createElement('div');
        coordEl.textContent = `(${this.x}, ${this.y})`;
        coordEl.style.justifySelf = 'start';
        coordEl.style.alignSelf = 'end';
        card.appendChild(coordEl);

        // хозяин (справа внизу)
        const ownerEl = document.createElement('div');
        ownerEl.textContent = `Владелец: ${this.owner}`;
        ownerEl.style.justifySelf = 'end';
        ownerEl.style.alignSelf = 'end';
        card.appendChild(ownerEl);

        return card;
    }
}

export function renderEntityCard(entity) {
    const card = document.createElement('div');
    card.style.display = 'grid';
    card.style.gridTemplateColumns = '1fr 1fr';
    card.style.gridTemplateRows = 'auto auto auto';
    card.style.gap = '6px';
    card.style.background = '#0f172a';

    // имя (id)
    const nameEl = document.createElement('div');
    nameEl.textContent = entity.id;
    nameEl.style.fontSize = '22px';
    nameEl.style.gridColumn = '1 / span 2'; // растянуть на 2 колонки
    nameEl.style.textAlign = 'left';
    nameEl.style.fontWeight = 'bold';
    card.appendChild(nameEl);

    // тип
    const typeEl = document.createElement('div');
    typeEl.textContent = `Тип: ${entity.type}`;
    typeEl.style.gridColumn = '1 / span 2';
    typeEl.style.textAlign = 'left';
    typeEl.style.fontSize = '13px';
    typeEl.style.opacity = '0.85';
    card.appendChild(typeEl);

    // HP (по центру, крупнее)
    const hpEl = document.createElement('div');
    hpEl.textContent = `HP: ${entity.hp}`;
    hpEl.style.gridColumn = '1 / span 2';
    hpEl.style.textAlign = 'center';
    hpEl.style.fontSize = '18px';
    hpEl.style.fontWeight = 'bold';
    card.appendChild(hpEl);

    // координаты (слева внизу)
    const coordEl = document.createElement('div');
    coordEl.textContent = `(${entity.x}, ${entity.y})`;
    coordEl.style.justifySelf = 'start';
    coordEl.style.alignSelf = 'end';
    card.appendChild(coordEl);

    // хозяин (справа внизу)
    const ownerEl = document.createElement('div');
    ownerEl.textContent = `Владелец: ${entity.owner}`;
    ownerEl.style.justifySelf = 'end';
    ownerEl.style.alignSelf = 'end';
    card.appendChild(ownerEl);

    return card;
}

