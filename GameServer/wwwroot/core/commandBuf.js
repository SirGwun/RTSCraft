export class CommandBuf {
    hi = []; // SYNC, системные
    lo = []; // пользовательские, предикт

    enqueue(cmd, prio = 'lo') {
        (prio === 'hi' ? this.hi : this.lo).push(cmd);
    }
    drain() {
        const a = this.hi; this.hi = [];
        const b = this.lo; this.lo = [];
        return a.concat(b);
    }
}