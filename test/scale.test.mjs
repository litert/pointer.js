import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

/** --- Test source directly using the existing TypeScript dependency. --- */
function moduleUrl(source) {
    return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
}
async function compile(name) {
    const source = await readFile(new URL('../src/' + name + '.ts', import.meta.url), 'utf8');
    return ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
}
const utilsUrl = moduleUrl(await compile('utils'));
const scaleSource = (await compile('scale')).replace(/from ['"]\.\/utils['"]/, 'from ' + JSON.stringify(utilsUrl));
const { scale } = await import(moduleUrl(scaleSource));

/** --- Minimal event routing with observable listener cleanup; real touch is also checked in Chrome. --- */
class Surface {
    listeners = new Map();
    innerHeight = 800;
    setTimeout = setTimeout;

    addEventListener(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event) {
        Object.defineProperty(event, 'currentTarget', { value: this, configurable: true });
        for (const listener of [...(this.listeners.get(event.type) ?? [])]) {
            if (this.listeners.get(event.type).has(listener)) {
                listener(event);
            }
        }
        return !event.defaultPrevented;
    }

    get listenerCount() {
        return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0);
    }
}

class Region extends Surface {
    nodeType = 1;
    clientHeight = 400;

    constructor(win, parent = null) {
        super();
        this.ownerDocument = { defaultView: win };
        this.parent = parent;
    }

    contains(target) {
        for (let node = target; node; node = node.parent) {
            if (node === this) {
                return true;
            }
        }
        return false;
    }
}

function emit(target, type, props = {}) {
    const win = target.ownerDocument?.defaultView ?? target;
    const path = [];
    for (let node = target; node instanceof Region; node = node.parent) {
        path.push(node);
    }
    path.push(win);
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, {
        target: { value: target },
        composedPath: { value: () => path }
    });
    Object.assign(event, {
        view: win, pointerId: 1, pointerType: 'touch', button: 0, buttons: 1,
        clientX: 0, clientY: 0, deltaY: 0, deltaMode: 0, ...props
    });
    for (const node of path) {
        node.dispatchEvent(event);
    }
    return event;
}

function fixture(options = {}) {
    const win = new Surface();
    const target = new Region(win);
    const outside = new Region(win);
    const updates = [];
    const counts = [];
    const ends = [];
    const disposers = [];
    const handler = (event, factor, cpos, detail) => { updates.push({ factor, cpos, detail }); };
    const opt = {
        onPointers: (event, count) => counts.push(count),
        onEnd: (event, reason) => ends.push(reason),
        ...options
    };
    target.addEventListener('pointerdown', event => disposers.push(scale(event, handler, opt)));
    target.addEventListener('wheel', event => disposers.push(scale(event, handler, opt)));
    return { win, target, outside, updates, counts, ends, disposers };
}

test('legacy three-argument handler pans once and finishes without listeners', () => {
    const f = fixture();
    emit(f.target, 'pointerdown', { clientX: 10, clientY: 20 });
    const event = emit(f.outside, 'pointermove', { clientX: 25, clientY: 35 });
    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(f.updates[0], {
        factor: 1, cpos: { x: 15, y: 15 },
        detail: { mode: 'pan', center: { x: 25, y: 35 }, previousCenter: { x: 10, y: 20 }, pointers: 1 }
    });
    emit(f.outside, 'pointerup');
    assert.deepEqual(f.counts, [1, 0]);
    assert.deepEqual(f.ends, ['up']);
    assert.equal(f.win.listenerCount, 0);
    const legacy = [];
    const listener = event => scale(event, (e, factor, cpos) => { legacy.push([factor, cpos]); });
    f.outside.addEventListener('pointerdown', listener);
    emit(f.outside, 'pointerdown');
    emit(f.outside, 'pointermove', { clientX: 3 });
    emit(f.outside, 'pointerup');
    assert.deepEqual(legacy, [[1, { x: 3, y: 0 }]]);
});

test('two pointerdown calls share one session and report the actual pinch center', () => {
    const f = fixture();
    emit(f.target, 'pointerdown');
    const listenerCount = f.win.listenerCount;
    emit(f.target, 'pointerdown', { pointerId: 2, clientX: 100 });
    assert.equal(f.win.listenerCount, listenerCount);
    assert.equal(f.disposers[0], f.disposers[1]);
    assert.deepEqual(f.counts, [1, 2]);
    emit(f.target, 'pointermove', { pointerId: 2, clientX: 120 });
    assert.equal(f.updates.length, 1);
    assert.deepEqual(f.updates[0], {
        factor: 1.2, cpos: { x: 10, y: 0 },
        detail: { mode: 'pinch', center: { x: 60, y: 0 }, previousCenter: { x: 50, y: 0 }, pointers: 2 }
    });
    f.disposers[0]();
    f.disposers[1]();
    assert.deepEqual(f.ends, ['dispose']);
    assert.equal(f.win.listenerCount, 0);
});

test('outside pointerdowns and unknown hover moves cannot join a gesture', () => {
    const f = fixture();
    emit(f.target, 'pointerdown');
    emit(f.outside, 'pointerdown', { pointerId: 2, clientX: 100 });
    emit(f.outside, 'pointermove', { pointerId: 2, clientX: 120 });
    emit(f.target, 'pointermove', { pointerId: 3, pointerType: 'mouse', buttons: 0, clientX: 300 });
    emit(f.outside, 'pointerup', { pointerId: 2 });
    assert.deepEqual(f.counts, [1]);
    assert.equal(f.updates.length, 0);
    emit(f.target, 'pointermove', { clientX: 10 });
    assert.deepEqual(f.updates[0].cpos, { x: 10, y: 0 });
    emit(f.target, 'pointerup');
    assert.equal(f.win.listenerCount, 0);
});

test('nested gesture regions do not both own the same pointer', () => {
    const f = fixture();
    const inner = new Region(f.win, f.target);
    let innerCalls = 0;
    inner.addEventListener('pointerdown', event => scale(event, () => { innerCalls++; }));
    emit(inner, 'pointerdown');
    emit(inner, 'pointermove', { clientX: 10 });
    assert.equal(innerCalls, 1);
    assert.equal(f.updates.length, 0);
    emit(inner, 'pointerup');
    assert.equal(f.win.listenerCount, 0);
});

test('adjacent regions keep independent sessions', () => {
    const f = fixture();
    let otherCalls = 0;
    f.outside.addEventListener('pointerdown', event => scale(event, () => { otherCalls++; }));
    emit(f.target, 'pointerdown');
    emit(f.outside, 'pointerdown', { pointerId: 2 });
    emit(f.target, 'pointermove', { clientX: 5 });
    emit(f.outside, 'pointermove', { pointerId: 2, clientX: 10 });
    assert.equal(f.updates.length, 1);
    assert.equal(otherCalls, 1);
    emit(f.target, 'pointerup');
    emit(f.outside, 'pointerup', { pointerId: 2 });
    assert.equal(f.win.listenerCount, 0);
});

test('three-to-two-to-one pointer transitions rebase without jumps', () => {
    const f = fixture();
    emit(f.target, 'pointerdown');
    emit(f.target, 'pointerdown', { pointerId: 2, clientX: 100 });
    emit(f.target, 'pointerdown', { pointerId: 3, clientX: 200 });
    emit(f.target, 'pointermove', { pointerId: 3, clientX: 250 });
    assert.equal(f.updates.length, 0);
    emit(f.target, 'pointerup');
    emit(f.target, 'pointermove', { pointerId: 3, clientX: 265 });
    assert.equal(f.updates[0].factor, 1.1);
    assert.deepEqual(f.updates[0].cpos, { x: 7.5, y: 0 });
    emit(f.target, 'pointerup', { pointerId: 2 });
    emit(f.target, 'pointermove', { pointerId: 3, clientX: 270 });
    assert.equal(f.updates[1].factor, 1);
    assert.deepEqual(f.updates[1].cpos, { x: 5, y: 0 });
    emit(f.target, 'pointerup', { pointerId: 3 });
    assert.deepEqual(f.counts, [1, 2, 3, 2, 1, 0]);
    assert.equal(f.win.listenerCount, 0);
});

test('coincident fingers never produce zero, NaN, or infinite zoom', () => {
    const f = fixture();
    emit(f.target, 'pointerdown');
    emit(f.target, 'pointerdown', { pointerId: 2, clientX: 10 });
    emit(f.target, 'pointermove', { pointerId: 2 });
    emit(f.target, 'pointermove', { pointerId: 2, clientX: 10 });
    emit(f.target, 'pointermove', { pointerId: 2, clientX: 20 });
    assert.deepEqual(f.updates.map(update => update.factor), [1, 1, 2]);
    f.disposers[0]();
});

test('cancel, blur, abort, and dispose release ownership and all window listeners', () => {
    for (const reason of ['cancel', 'blur', 'abort', 'dispose']) {
        const controller = new AbortController();
        const f = fixture({ signal: controller.signal });
        emit(f.target, 'pointerdown');
        emit(f.target, 'pointerdown', { pointerId: 2, clientX: 100 });
        if (reason === 'cancel') { emit(f.target, 'pointercancel', { pointerId: 2 }); }
        else if (reason === 'blur') { emit(f.win, 'blur'); }
        else if (reason === 'abort') { controller.abort(); }
        else { f.disposers[0](); }
        f.disposers[0]();
        assert.deepEqual(f.ends, [reason]);
        assert.equal(f.win.listenerCount, 0);
        emit(f.target, 'pointermove', { clientX: 20 });
        assert.equal(f.updates.length, 0);
    }
});

test('aborted signals and non-primary buttons create no session', () => {
    const controller = new AbortController();
    controller.abort();
    const f = fixture({ signal: controller.signal });
    emit(f.target, 'pointerdown');
    assert.equal(f.win.listenerCount, 0);
    const other = fixture();
    emit(other.target, 'pointerdown', { pointerType: 'mouse', button: 2 });
    assert.equal(other.win.listenerCount, 0);
    assert.deepEqual(other.counts, []);
});

test('wheel deltas are finite, positive, reversible, and normalized by deltaMode', () => {
    const f = fixture();
    for (const deltaY of [1000, -1000, 48, -48, Number.MAX_VALUE, -Number.MAX_VALUE]) {
        const event = emit(f.target, 'wheel', { deltaY, clientX: 80, clientY: 120 });
        assert.equal(event.defaultPrevented, true);
        const update = f.updates.at(-1);
        assert.ok(update.factor > 0 && Number.isFinite(update.factor));
        assert.deepEqual(update.cpos, { x: 0, y: 0 });
        assert.deepEqual(update.detail.center, { x: 80, y: 120 });
        assert.deepEqual(update.detail.previousCenter, update.detail.center);
        assert.equal(update.detail.pointers, 0);
    }
    assert.ok(Math.abs(f.updates[0].factor * f.updates[1].factor - 1) < 1e-12);
    emit(f.target, 'wheel', { deltaY: 48 });
    emit(f.target, 'wheel', { deltaY: 3, deltaMode: 1 });
    emit(f.target, 'wheel', { deltaY: 0.12, deltaMode: 2 });
    assert.deepEqual(f.updates.slice(-3).map(update => update.factor), Array(3).fill(Math.exp(-0.096)));
    const count = f.updates.length;
    for (const deltaY of [0, NaN, Infinity]) { emit(f.target, 'wheel', { deltaY }); }
    assert.equal(f.updates.length, count);
    assert.equal(f.win.listenerCount, 0);
    assert.deepEqual(f.ends, []);
});

test('center coordinates keep the content point anchored while zooming and panning', () => {
    const f = fixture();
    emit(f.target, 'pointerdown', { clientX: 100, clientY: 80 });
    emit(f.target, 'pointerdown', { pointerId: 2, clientX: 200, clientY: 80 });
    emit(f.target, 'pointermove', { pointerId: 2, clientX: 250, clientY: 100 });
    const { factor, detail } = f.updates[0];
    const origin = { x: 30, y: 20 };
    const offset = { x: 15, y: -10 };
    const zoom = 2;
    const contentPoint = {
        x: (detail.previousCenter.x - origin.x - offset.x) / zoom,
        y: (detail.previousCenter.y - origin.y - offset.y) / zoom
    };
    const nextOffset = {
        x: detail.center.x - origin.x - (detail.previousCenter.x - origin.x - offset.x) * factor,
        y: detail.center.y - origin.y - (detail.previousCenter.y - origin.y - offset.y) * factor
    };
    assert.ok(Math.abs(origin.x + nextOffset.x + contentPoint.x * zoom * factor - detail.center.x) < 1e-10);
    assert.ok(Math.abs(origin.y + nextOffset.y + contentPoint.y * zoom * factor - detail.center.y) < 1e-10);
    f.disposers[0]();
});

test('explicit target supports delegated listeners and rejects events outside the region', () => {
    const win = new Surface();
    const region = new Region(win);
    const child = new Region(win, region);
    const outside = new Region(win);
    const updates = [];
    const delegated = event => scale(event, (e, factor, cpos) => { updates.push(cpos); }, { target: region });
    win.addEventListener('pointerdown', delegated);
    emit(outside, 'pointerdown');
    assert.equal(win.listenerCount, 1);
    emit(child, 'pointerdown');
    emit(child, 'pointermove', { clientX: 10 });
    emit(child, 'pointerup');
    assert.deepEqual(updates, [{ x: 10, y: 0 }]);
    assert.equal(win.listenerCount, 1);
});

test('callback failure tears down the session before propagating the error', () => {
    const win = new Surface();
    const target = new Region(win);
    const error = new Error('consumer failed');
    const reasons = [];
    target.addEventListener('pointerdown', event => scale(event, () => { throw error; }, {
        onEnd: (event, reason) => reasons.push(reason)
    }));
    emit(target, 'pointerdown');
    assert.throws(() => emit(target, 'pointermove', { clientX: 10 }), error);
    assert.equal(win.listenerCount, 0);
    assert.deepEqual(reasons, ['cancel']);
});

test('a rejected async handler cleans up and reports the error', async () => {
    const win = new Surface();
    const target = new Region(win);
    const error = new Error('async consumer failed');
    const reports = [];
    win.setTimeout = callback => { reports.push(callback); };
    target.addEventListener('pointerdown', event => scale(event, () => Promise.reject(error)));
    emit(target, 'pointerdown');
    emit(target, 'pointermove', { clientX: 10 });
    await Promise.resolve();
    assert.equal(win.listenerCount, 0);
    assert.equal(reports.length, 1);
    assert.throws(reports[0], error);
});

test('a failing pointer-count callback leaves no half-initialized session', () => {
    const win = new Surface();
    const target = new Region(win);
    const error = new Error('pointer-count consumer failed');
    const start = event => scale(event, () => {}, { onPointers: () => { throw error; } });
    target.addEventListener('pointerdown', start);
    assert.throws(() => emit(target, 'pointerdown'), error);
    assert.equal(win.listenerCount, 0);
    target.removeEventListener('pointerdown', start);
    let count = 0;
    target.addEventListener('pointerdown', event => scale(event, () => { count++; }));
    emit(target, 'pointerdown');
    emit(target, 'pointermove', { clientX: 5 });
    emit(target, 'pointerup');
    assert.equal(count, 1);
    assert.equal(win.listenerCount, 0);
});
