export const selection = (() => {
    /** @type {Set<number>} */
    let ids = new Set();
    /** @type {{id?: number, entity?: any, kind?: 'ally'|'enemy'|'resource'|'ground'}|null} */
    let hovel = null;

    const subs = new Set();

    const notify = () => { subs.forEach(fn => fn(get())); };

    const get = () => { return { ids: Array.from(ids), hovel }; };
    const set = (newSelect) => { ids = new Set(newSelect), notify(); };

    const add = (id) => { ids.add(id), notify(); };
    const del = (id) => { ids.delete(id), notify(); };
    const clear = () => { ids.clear(), notify(); };
    const setHovel = (hov) => { hovel = hov, notify(); };
    const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };

    return { get, set, add, del, clear, setHovel, onChange };
})();