import { selection } from './selectionStore.js';
import { issue } from '../client.js';

// === UI (HUD, inspector, join) ===
export class UI {
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

    /**
     * 
     * @param {() => []} ent
     */
    initSelectionPanel(ent) {
        const panel = document.getElementById('selectionList');

        const handler = (selection) => {
            console.log('handle');
            const { ids } = selection;
            panel.innerHTML = '';

            if (!ids.length) return;
            if (ids.length === 1) {
                const entity = ent.get(ids[0]);
                if (!entity) return;

                const table = document.createElement('table');
                for (const [key, value] of Object.entries(entity)) {
                    if (key === 'x' || key === 'y' || key === 'w' || key === 'h' || key === 'collor') continue;
                    if (typeof value === 'function') continue;
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${key}</td><td>${value}</td>`;
                    table.appendChild(row);
                }
                panel.appendChild(table);
                return;
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

    bindJoin/** @param {(data:{name:string,color:string})=>void} onJoin */(onJoin) {
        const nameInput = document.getElementById('playerName');
        const colorInput = document.getElementById('playerColor');

        const savedName = localStorage.getItem('playerName') || '';
        const savedColor = localStorage.getItem('playerColor') || 'red';

        if (nameInput) nameInput.value = savedName;
        if (colorInput) colorInput.value = savedColor;

        this.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // берём свежие значения
            let name = nameInput.value.trim();
            let color = colorInput.value.trim();

            // нормализуем имя
            name = name.slice(0, 16).replace(/[^\w\u0400-\u04FF -]/g, '');
            if (!name) name = 'Player';

            // проверяем цвет
            if (!isValidCssColor(color)) color = 'red';

            // сохраняем в localStorage
            localStorage.setItem('playerName', name);
            localStorage.setItem('playerColor', color);

            // скрываем окно
            this.joinOverlay.classList.add('hidden');

            // вызываем колбэк
            onJoin({ name, color });
        });

        // автологин, если имя сохранено
        if (savedName) {
            this.joinOverlay.classList.add('hidden');
            onJoin({ name: savedName, color: savedColor });
        }

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