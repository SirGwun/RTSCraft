// === Networking ===
import { onSnapshot } from './synchronizer.js';
import { init, world, me } from '../client.js';
import { Player } from '../data/player.js';
export class Network {
    /** @type {(state:'connecting'|'open'|'closed'|'error')=>void} */
    onState = () => { };

    /** @type {WebSocket|null} */
    socket = null;

    pingPeriodMs = 2500;
    _pingTimer = 0;
    onEvent = () => { };
    onPing = () => { };
    pendingOut = [];

    connect() {
        this.url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            this.close();
        }
        this.onState('connecting');
        const ws = new WebSocket(this.url);
        this.socket = ws;

        this.socket.onopen = () => {
            this.onState("open");

            for (const out of this.pendingOut) ws.send(out);
            this.pendingOut = [];

            this._startPing();
        };
        this.socket.onclose = () => this.onState('closed');
        this.socket.onerror = () => {
            this.onState('error');
            console.log('ws error');
        }
        this.socket.onmessage = (ev) => this._routeMessage(ev.data);
    }

    _routeMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); }
        catch {
            console.log('Failed to parse message', raw);
            return;
        }
        const type = msg?.type;

        switch (type) {
            case 'snapshot':
                this._handleSnapshot(msg);
                break;
            case 'init':
                this._applyInit(msg);
            case 'pong':
                this._handlePong(msg);
                break;
            default:
                this._handleUnknown(msg);
                break;
        }

    }

    _handleSnapshot(msg) {
        if (this._validateSnapshot(msg)) {
            onSnapshot(msg);
        }
    } 

    _applyInit(msg) {
        //validation later
        console.log('Server joining success');
        init(msg);
    }

    _handlePong(msg) {
        try {
            if (msg.type === 'pong' && typeof msg.clientTime === 'number') {
                this.onPing(msg.serverTime - msg.clientTime);
            }
        } catch { }
    }


    close() {
        if (this._pingTimer != 0) {
            clearInterval(this._pingTimer);
            this._pingTimer = 0;
        }
        this._lastPingT = 0;

        if (this.socket) {
            try {
                this.socket.onopen = null;
                this.socket.onmessage = null;
                this.socket.onerror = null;
                this.socket.onclose = null;

                if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                    this.socket.close(1000, 'client closing');
                }
            } catch (_) { /* ignore */ }
            this.socket = null;
        }
        this.onState('closed');
    }

    toSend(type, payload) {
        this._send(JSON.stringify({ type: type, ...payload }));
    }

    /** @param {{name:string,color:string}} payload */
    sendJoin(payload) {
        console.log('Waiting to join server');
        this._send(JSON.stringify({ type: "join", ...payload }));
    }

    sendCommand(cmd) {
        console.log("Sending cmd,", cmd);
        this._send(JSON.stringify({ type: "cmd", clientId: me.id, ...cmd }));
    }

    sendPing() {
        this._send(JSON.stringify({ type: "ping", clientTime: Date.now() }));
    }

    _send(json) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(json);
        } else {
            this.pendingOut.push(json);
        }
    }

    _handleUnknown(msg) {
        console.log('Uncnown server message: ', msg);
    }

    _startPing() {
        this._stopPing();
        this._pingTimer = setInterval(() => this.sendPing(), this.pingPeriodMs);
        this.sendPing();
    }

    _stopPing() {
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = 0;
        }
    }

    _validateSnapshot(msg) {
        return true;
    }
}