﻿// === Networking ===
import { onSnapshot } from './synchronizer.js';
import { Player } from '../client.js';
export class Network {
  /** @type {WebSocket|null} */         socket = null;
                                        pingPeriodMs = 2500;
                                        _pingTimer = null;
  /** @type {(snap:Snapshot)=>void} */  onSnapshot = () => { };
  /** @type {(evt:any)=>void} */        onEvent = () => { };
  /** @type {(ms:number)=>void} */      onPing = () => { };

  /** @type {(state:'connecting'|'open'|'closed'|'error')=>void} */ onState = () => { };

    connect() {
        this.url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            this.close();
        }
        this.onState('connecting');
        const ws = new WebSocket(this.url);
        this.socket = ws;

        this.socket.onopen = () => { this.onState("open"); this._startPing(); };
        this.socket.onclose = () => this.onState('closed');
        this.socket.onerror = () => this.onState('error');
        this.socket.onmessage = (ev) => this._routeMessage(ev.data);
    }

    _routeMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); }
        catch {
            console.log('Не удалось распарсить сообщение', raw);
            return;
        }
        const type = msg?.type;

        switch (type) {
            case 'snapshot':
                this._handleSnapshot(msg);
                break;
            case 'event':
                this._handleEvent(msg);
                break;
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

    _handlePong(msg) {
        try {
            if (msg.type === 'pong' && typeof msg.clientTime === 'number') {
                this.onPing(msg.serverTime - msg.clientTime);
            }
        } catch { }
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
            this._pingTimer = null;
        }
    }

    close() {
        if (this._pingTimer != null) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
        this._lastPingT = null;

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
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type type, ...payload }));
        }
        else {
            console.log("Connection is not open")
        }
    }

    /** @param {{name:string,color:string}} payload */
    sendJoin(payload) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "join", ...payload }));
        } else {
            console.log("Connection is not open")
        }
    }
    /** @param {any} cmd */
    sendCommand(cmd) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "command", ...cmd }));
        } else {
            console.log("Connection is not open")
        }
    }

    sendPing() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            const clientTime = Date.now();
            this.socket.send(JSON.stringify({ type: "ping", clientTime }));
        } else {
            console.log("Connection is not open")
        }
    }

    _validateSnapshot(msg) {
        return true;
    }
}