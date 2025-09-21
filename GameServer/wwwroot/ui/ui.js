
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

    bindJoin/** @param {(data:{name:string,color:string})=>void} onJoin */(onJoin) {
        const nameInput = document.getElementById('playerName');
        const colorInput = document.getElementById('playerColor');

        const savedName = localStorage.getItem('playerName') || '';
        const savedColor = localStorage.getItem('playerColor') || 'red';
        if (nameInput) nameInput.value = savedName;
        if (colorInput) colorInput.value = savedColor;

        this.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();

            onJoin({ name: savedName, color: savedColor });
            this.hudFps.textContent = fps;

            name = name.slice(0, 16).replace(/[^\w\u0400-\u04FF -]/g, '');
            if (!name) name = 'Player';

            if (!isValidCssColor(color)) color = 'red';

            localStorage.setItem('playerName', name);
            localStorage.setItem('playerColor', color);

            this.joinOverlay.classList.add('hidden');
            onJoin({ name, color });
        });

        if (savedName) {
            this.joinOverlay.classList.add('hidden');
            onJoin({ name: savedName, color: savedColor });
        }
        function isValidCssColor(value) {
            const s = new Option().style;
            s.color = '';
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