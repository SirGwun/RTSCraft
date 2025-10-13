import { selection } from './selectionStore.js';
import { state } from '../render/render.js';
import { Entity } from '../data/entity.js';
import { issue } from '../client.js';

// === UI (HUD, inspector, join) ===
export class UI {
    /** @type {HTMLElement} */ root = document.getElementById('root');

      /** @type {HTMLElement} */ playerName = document.getElementById('playerName');
      /** @type {HTMLElement} */ hudConn = document.getElementById('conn');
      /** @type {HTMLElement} */ hudPing = document.getElementById('ping');
      /** @type {HTMLElement} */ hudFps = document.getElementById('fps');
      /** @type {HTMLElement} */ hudPlayers = document.getElementById('players');
      /** @type {HTMLElement} */ hudGold = document.getElementById('gold');
      /** @type {HTMLElement} */ hudWood = document.getElementById('wood');
      /** @type {HTMLElement} */ selectionList = document.getElementById('selectionList');
      /** @type {HTMLElement} */ actions = document.getElementById('actions');
      /** @type {HTMLElement} */ log = document.getElementById('log');
      /** @type {HTMLDivElement} */ joinOverlay = document.getElementById('join');
      /** @type {HTMLFormElement} */ joinForm = document.getElementById('joinForm');


    init(world) {
        this.showMouseCoord();
        this.initSelectionPanel(world.entities);
    }

    showMouseCoord() {
        const panel = document.getElementById('center');
        panel.style.position = 'relative';
        const mouseWindow = document.createElement('div');

        mouseWindow.style.position = 'absolute';
        mouseWindow.style.right = '10px';
        mouseWindow.style.top = '10px';

        window.addEventListener('mousemove', () => {
            mouseWindow.innerHTML = `
                                      <div>mouse: ${state.mouse.x} ${state.mouse.y}</div>
                                      <div>camera: ${state.camera.x} ${state.camera.y}</div>`
        });

        panel.appendChild(mouseWindow);
    }


    /**
     * 
     * @param {() => Entity[]} ent
     */
    initSelectionPanel(ent) {
        const panel = document.getElementById('selectionList');

        /**
        * @param {selection} selection
        */
        const handler = (snap) => {
            if (!panel) return;
            const { ids } = snap;
            panel.innerHTML = '';

            if (!ids.length) return;
            if (ids.length === 1) {
                const entity = ent[0];
                if (!entity) return;
                panel.appendChild(entity.renderEntityCard());
            } else {
                console.log(ids);
                const table = document.createElement('table');
                const row = document.createElement('tr');
                row.innerHTML = `<td>${ids}</td>`;
                table.appendChild(row);
                panel.appendChild(table);
            }
        }

        handler(selection.get());
        selection.onChange(handler);
    }

    bindJoin() {
        const joinForm = document.createElement('div');
        joinForm.innerHTML = `
            <form id="joinForm">
                <label>
                    Имя игрока
                    <input id="playerName" maxlength="16" placeholder="Герой" />
                 </label>
                <label style="display:block;margin-top:8px;">
                    Цвет игрока
                    <input id="playerColor" placeholder="red" />
                </label>
                <button type="submit" style="margin-top:10px;">В игру</button>
            </form>`;
        joinForm.setId('join');
        this.root.appendChild(joinForm);

        let name = document.getElementById('playerName').value.trim();
        let color = document.getElementById('playerColor').value.trim();

        const savedName = localStorage.getItem('playerName') || '';
        const savedColor = localStorage.getItem('playerColor') || 'red';

        if (nameInput) nameInput.value = savedName;
        if (colorInput) colorInput.value = savedColor;

        this.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();

            name = name.slice(0, 26).replace(/[^\w\u0400-\u04FF -]/g, '');
            if (!name) name = 'Player';
            if (!isValidCssColor(color)) color = 'red';

            localStorage.setItem('playerName', name);
            localStorage.setItem('playerColor', color);

            this.joinOverlay.classList.add('hidden');
            this.playerName.textContent = nameInput.value.trim();
            onJoin({ name, color });
        });

        function isValidCssColor(value) {
            const s = new Option().style;
            s.color = value;
            return s.color !== '';
        }
    }


    setConnState /** @param {string} text */(text) {
        this.hudConn.textContent = text;
    }
    setPing /** @param {number} ms */(ms) {
        this.hudPing.textContent = ms;
    }
    setFps /** @param {number} fps */(fps) {
        this.hudFps.textContent = fps;
    }
    setPlayers /** @param {number} n */(n) {
        this.hudPlayers.textContent = n;
    }
    setResources /** @param {{gold:number, wood:number}} r */(r) {
        this.hudGold.textContent = r.gold;
        this.hudWood.textContent = r.wood;
    }

    pushLog /** @param {string} text */(text) {
        const div = document.createElement("div");
        div.textContent = text;
        this.log.appendChild(div);
        this.log.scrollTop = this.log.scrollHeight;
    }
}