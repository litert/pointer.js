function sleep(ms, win = window) {
    return new Promise(resolve => win.setTimeout(resolve, ms));
}
function isTouch(e) {
    if (typeof e.pointerId !== 'number') {
        return false;
    }
    return e.pointerType === 'touch';
}
function getEventPos(e) {
    return { 'x': e.clientX, 'y': e.clientY };
}
function getMoveDir(dx, dy) {
    return Math.abs(dy) > Math.abs(dx)
        ? (dy < 0 ? 'top' : 'bottom')
        : (dx < 0 ? 'left' : 'right');
}
function getWindow(e) {
    if (('view' in e) && e.view) {
        return e.view;
    }
    if ('ownerDocument' in e && e.ownerDocument) {
        return e.ownerDocument.defaultView ?? window;
    }
    return window;
}
const DISABLED_REGEX = /disabled/i;
function isDisabled(el) {
    while (el) {
        if (DISABLED_REGEX.test(el.className)) {
            return true;
        }
        for (const key in el.dataset) {
            if (DISABLED_REGEX.test(key)) {
                return true;
            }
        }
        el = el.parentElement;
    }
    return false;
}

let globalCursorStyle = null;
function set(type) {
    if (!globalCursorStyle) {
        globalCursorStyle = document.createElement('style');
        globalCursorStyle.id = 'pointer-global-cursor';
        document.head.appendChild(globalCursorStyle);
    }
    if (type) {
        globalCursorStyle.innerHTML = `*, *::after, *::before {cursor: ${type} !important;}`;
    }
    else {
        globalCursorStyle.innerHTML = '';
    }
}

function hover(oe, opt) {
    const el = oe.currentTarget;
    if (!el) {
        return;
    }
    const win = getWindow(oe);
    if (isTouch(oe)) {
        if (el.dataset.pointerHover) {
            return;
        }
        el.dataset.pointerHover = '1';
        opt.enter?.(oe);
        const move = function (e) {
            opt.move?.(e);
        };
        const leave = function (e) {
            opt.leave?.(e);
            delete el.dataset.pointerHover;
            el.removeEventListener('pointerleave', leave);
            win.removeEventListener('pointermove', move);
            win.removeEventListener('pointerup', leave);
            win.removeEventListener('pointercancel', leave);
        };
        el.addEventListener('pointerleave', leave);
        win.addEventListener('pointermove', move);
        win.addEventListener('pointerup', leave);
        win.addEventListener('pointercancel', leave);
    }
    else {
        if (oe.type === 'pointerdown') {
            return;
        }
        opt.enter?.(oe);
        const move = function (e) {
            opt.move?.(e);
        };
        const leave = function (e) {
            opt.leave?.(e);
            win.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
        };
        win.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
    }
}

function down(oe, opt) {
    const win = getWindow(oe);
    let { 'x': ox, 'y': oy } = getEventPos(oe);
    let isStart = false;
    const isPointer = oe.type.startsWith('pointer');
    let end = undefined;
    const move = function (e) {
        if ((!e.target || !e.target.ownerDocument.body.contains(e.target))
            && e.cancelable) {
            e.preventDefault();
        }
        const { x, y } = getEventPos(e);
        if (x === ox && y === oy) {
            return;
        }
        const dir = getMoveDir(x - ox, y - oy);
        ox = x;
        oy = y;
        if (!isStart) {
            isStart = true;
            if (opt.start?.(e) === false) {
                if (isPointer) {
                    win.removeEventListener('pointermove', move);
                    win.removeEventListener('pointerup', end);
                    win.removeEventListener('pointercancel', end);
                }
                else {
                    win.removeEventListener('mousemove', move);
                    win.removeEventListener('mouseup', end);
                }
                return;
            }
        }
        if (opt.move?.(e, dir) === false) {
            if (isPointer) {
                win.removeEventListener('pointermove', move);
                win.removeEventListener('pointerup', end);
                win.removeEventListener('pointercancel', end);
            }
            else {
                win.removeEventListener('mousemove', move);
                win.removeEventListener('mouseup', end);
            }
        }
    };
    end = function (e) {
        if (isPointer) {
            win.removeEventListener('pointermove', move);
            win.removeEventListener('pointerup', end);
            win.removeEventListener('pointercancel', end);
        }
        else {
            win.removeEventListener('mousemove', move);
            win.removeEventListener('mouseup', end);
        }
        opt.up?.(e);
        if (isStart) {
            opt.end?.(e);
        }
    };
    if (isPointer) {
        win.addEventListener('pointermove', move, { 'passive': false });
        win.addEventListener('pointerup', end);
        win.addEventListener('pointercancel', end);
    }
    else {
        win.addEventListener('mousemove', move, { 'passive': false });
        win.addEventListener('mouseup', end);
    }
    opt.down?.(oe);
}

let isMoving = false;
const hooks = {
    'down': [],
    'up': [],
};
function addHook(event, hook) {
    hooks[event].push(hook);
}
function removeHook(event, hook) {
    const index = hooks[event].indexOf(hook);
    if (index !== -1) {
        hooks[event].splice(index, 1);
    }
}
function clampToBorder(val, prevVal, nowMin, nowMax, min, max, offsetMin, offsetMax) {
    let atMin = false, atMax = false;
    if (nowMin <= min) {
        atMin = true;
        if (nowMin < min && val < prevVal) {
            val = (prevVal - offsetMin > min) ? min + offsetMin : prevVal;
        }
    }
    else if (offsetMax !== 0) {
        if (nowMax >= max) {
            atMax = true;
            if (nowMax > max && val > prevVal) {
                val = (prevVal + offsetMax < max) ? max - offsetMax : prevVal;
            }
        }
    }
    else {
        const m1 = max - 1;
        if (val >= m1) {
            atMax = true;
            if (val > m1 && val > prevVal) {
                val = (prevVal < m1) ? m1 : prevVal;
            }
        }
    }
    return { 'val': val, 'atMin': atMin, 'atMax': atMax };
}
function calcBorderType(inTop, inRight, inBottom, inLeft, x, y, left, top, right, bottom) {
    if (inTop && inLeft) {
        return 'lt';
    }
    if (inTop && inRight) {
        return 'tr';
    }
    if (inBottom && inRight) {
        return 'rb';
    }
    if (inBottom && inLeft) {
        return 'bl';
    }
    if (inTop) {
        return (x - left <= 20) ? 'lt' : (right - x <= 20) ? 'tr' : 't';
    }
    if (inRight) {
        return (y - top <= 20) ? 'tr' : (bottom - y <= 20) ? 'rb' : 'r';
    }
    if (inBottom) {
        return (right - x <= 20) ? 'rb' : (x - left <= 20) ? 'bl' : 'b';
    }
    if (inLeft) {
        return (y - top <= 20) ? 'lt' : (bottom - y <= 20) ? 'bl' : 'l';
    }
    return '';
}
function move(e, opt) {
    isMoving = true;
    set(opt.cursor ?? getComputedStyle(e.target).cursor);
    let { x: tx, y: ty } = getEventPos(e);
    let left, top, right, bottom;
    const win = getWindow(e);
    if (opt.areaObject) {
        const areaRect = opt.areaObject.getBoundingClientRect();
        const s = getComputedStyle(opt.areaObject);
        left = areaRect.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
        top = areaRect.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
        right = areaRect.left + areaRect.width - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
        bottom = areaRect.top + areaRect.height - parseFloat(s.borderBottomWidth) - parseFloat(s.paddingBottom);
    }
    else {
        left = opt.left ?? 0;
        top = opt.top ?? 0;
        right = opt.right ?? win.innerWidth;
        bottom = opt.bottom ?? win.innerHeight;
    }
    left += opt.offsetLeft ?? 0;
    top += opt.offsetTop ?? 0;
    right += opt.offsetRight ?? 0;
    bottom += opt.offsetBottom ?? 0;
    let isBorder = false;
    let objectLeft = 0, objectTop = 0, objectWidth = 0, objectHeight = 0;
    let offsetLeft = 0, offsetTop = 0, offsetRight = 0, offsetBottom = 0;
    const moveTimes = [];
    for (const hook of hooks.down) {
        hook(e, opt);
    }
    down(e, {
        start: () => {
            if (opt.start?.(tx, ty) === false) {
                set();
                return false;
            }
            if (opt.object) {
                const rect = opt.object.getBoundingClientRect();
                objectLeft = rect.left;
                objectTop = rect.top;
                objectWidth = rect.width;
                objectHeight = rect.height;
            }
            else {
                objectLeft = opt.objectLeft ?? 0;
                objectTop = opt.objectTop ?? 0;
                objectWidth = opt.objectWidth ?? 0;
                objectHeight = opt.objectHeight ?? 0;
            }
            if (objectWidth > 0) {
                offsetLeft = tx - objectLeft;
            }
            if (objectHeight > 0) {
                offsetTop = ty - objectTop;
            }
            offsetRight = objectWidth - offsetLeft;
            offsetBottom = objectHeight - offsetTop;
        },
        move: (ne, dir) => {
            let { x, y } = getEventPos(ne);
            if (x === tx && y === ty) {
                return;
            }
            const xResult = clampToBorder(x, tx, x - offsetLeft, x + offsetRight, left, right, offsetLeft, offsetRight);
            const yResult = clampToBorder(y, ty, y - offsetTop, y + offsetBottom, top, bottom, offsetTop, offsetBottom);
            x = xResult.val;
            y = yResult.val;
            const inBorderLeft = xResult.atMin, inBorderRight = xResult.atMax;
            const inBorderTop = yResult.atMin, inBorderBottom = yResult.atMax;
            const anyBorder = inBorderTop || inBorderRight || inBorderBottom || inBorderLeft;
            const border = anyBorder ?
                calcBorderType(inBorderTop, inBorderRight, inBorderBottom, inBorderLeft, x, y, left, top, right, bottom) : '';
            if (anyBorder) {
                if (!isBorder) {
                    isBorder = true;
                    opt.borderIn?.(x, y, border, ne);
                }
            }
            else if (isBorder) {
                isBorder = false;
                opt.borderOut?.();
            }
            const ox = x - tx, oy = y - ty;
            moveTimes.push({ 'time': Date.now(), 'ox': ox, 'oy': oy });
            opt.move?.(ne, {
                'ox': ox, 'oy': oy, 'x': x, 'y': y, 'border': border,
                'inBorder': { 'top': inBorderTop, 'right': inBorderRight, 'bottom': inBorderBottom, 'left': inBorderLeft },
                'dir': dir
            });
            tx = x;
            ty = y;
        },
        up: ne => {
            isMoving = false;
            set();
            for (const hook of hooks.up) {
                hook(e, opt);
            }
            opt.up?.(moveTimes, ne);
        },
        end: ne => {
            opt.end?.(moveTimes, ne);
        }
    });
    return { 'left': left, 'top': top, 'right': right, 'bottom': bottom };
}

function click(e, handler) {
    if (e.button > 0) {
        return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const time = Date.now();
    down(e, {
        up: ne => {
            if (Date.now() - time >= 300) {
                return;
            }
            const nx = ne.clientX;
            const ny = ne.clientY;
            if (Math.abs(nx - x) < 5 && Math.abs(ny - y) < 5) {
                handler(ne, nx, ny);
            }
        }
    });
}
const lastDblClickData = {
    'time': 0,
    'x': 0,
    'y': 0,
};
function dblClick(e, handler) {
    click(e, (ne, x, y) => {
        const now = Date.now();
        const diff = now - lastDblClickData.time;
        if (diff <= 50) {
            return;
        }
        if (diff <= 300) {
            const xx = Math.abs(x - lastDblClickData.x);
            const xy = Math.abs(y - lastDblClickData.y);
            if (xx < 10 && xy < 10) {
                handler(ne, x, y);
                setTimeout(() => {
                    lastDblClickData.time = 0;
                    lastDblClickData.x = 0;
                    lastDblClickData.y = 0;
                }, 300);
                return;
            }
        }
        lastDblClickData.time = now;
        lastDblClickData.x = x;
        lastDblClickData.y = y;
    });
}
document.addEventListener('pointerdown', oe => {
    click(oe, () => {
        const tapEvent = new CustomEvent('tap', {
            'bubbles': true,
            'cancelable': true,
            'detail': {
                'originalEvent': oe,
            },
        });
        oe.target?.dispatchEvent(tapEvent);
    });
    dblClick(oe, () => {
        const dbltapEvent = new CustomEvent('dbltap', {
            'bubbles': true,
            'cancelable': true,
            'detail': {
                'originalEvent': oe,
            },
        });
        oe.target?.dispatchEvent(dbltapEvent);
    });
}, true);

let lastLongTime = 0;
function long(e, long, opt) {
    const { 'x': tx, 'y': ty, } = getEventPos(e);
    const win = getWindow(e);
    let ox = 0, oy = 0, isLong = false;
    let timer = win.setTimeout(() => {
        timer = undefined;
        if (ox <= 1 && oy <= 1) {
            isLong = true;
            Promise.resolve(long(e)).catch((err) => { throw err; });
        }
    }, opt?.time ?? 300);
    down(e, {
        down: opt?.down,
        move: (ne) => {
            const { x, y } = getEventPos(ne);
            ox = Math.abs(x - tx);
            oy = Math.abs(y - ty);
        },
        up: () => {
            opt?.up?.(e);
            if (timer !== undefined) {
                win.clearTimeout(timer);
                timer = undefined;
            }
            else if (isLong) {
                lastLongTime = Date.now();
            }
        }
    });
}
function allowEvent(e) {
    const now = Date.now();
    if (now - lastLongTime < 5) {
        return false;
    }
    const current = e.currentTarget;
    if (isDisabled(current)) {
        return false;
    }
    return true;
}

function menu(oe, handler) {
    const win = getWindow(oe);
    if (isTouch(oe)) {
        const contextMenuHandler = (e) => {
            e.preventDefault();
        };
        win.addEventListener('contextmenu', contextMenuHandler);
        long(oe, handler, {
            up: async () => {
                await sleep(34, win);
                win.removeEventListener('contextmenu', contextMenuHandler);
            }
        });
        return;
    }
    if (oe.button !== 2) {
        return;
    }
    const contextMenuHandler = (e) => {
        e.preventDefault();
        handler(e);
    };
    down(oe, {
        up: async () => {
            await sleep(34, win);
            win.removeEventListener('contextmenu', contextMenuHandler);
        }
    });
    win.addEventListener('contextmenu', contextMenuHandler);
}

function resize(e, opt) {
    const minW = opt.minWidth ?? 0, minH = opt.minHeight ?? 0;
    const { x, y } = getEventPos(e);
    let offsetLeft, offsetTop, offsetRight, offsetBottom;
    let left, top, right, bottom;
    if (opt.objectLeft === undefined || opt.objectTop === undefined
        || opt.objectWidth === undefined || opt.objectHeight === undefined) {
        if (!opt.object) {
            return;
        }
        const rect = opt.object.getBoundingClientRect();
        opt.objectLeft = rect.left;
        opt.objectTop = rect.top;
        opt.objectWidth = rect.width;
        opt.objectHeight = rect.height;
    }
    const b = opt.border;
    const isRight = b === 'tr' || b === 'r' || b === 'rb';
    const isLeft = b === 'bl' || b === 'l' || b === 'lt';
    const isBottom = b === 'rb' || b === 'b' || b === 'bl';
    const isTop = b === 'lt' || b === 't' || b === 'tr';
    if (isRight) {
        left = opt.objectLeft + minW;
        offsetLeft = offsetRight = x - (opt.objectLeft + opt.objectWidth);
        if (opt.maxWidth) {
            right = opt.objectLeft + opt.maxWidth;
        }
    }
    else if (isLeft) {
        right = opt.objectLeft + opt.objectWidth - minW;
        offsetLeft = offsetRight = x - opt.objectLeft;
        if (opt.maxWidth) {
            left = opt.objectLeft + opt.objectWidth - opt.maxWidth;
        }
    }
    if (isBottom) {
        top = opt.objectTop + minH;
        offsetTop = offsetBottom = y - (opt.objectTop + opt.objectHeight);
        if (opt.maxHeight) {
            bottom = opt.objectTop + opt.maxHeight;
        }
    }
    else if (isTop) {
        bottom = opt.objectTop + opt.objectHeight - minH;
        offsetTop = offsetBottom = y - opt.objectTop;
        if (opt.maxHeight) {
            top = opt.objectTop + opt.objectHeight - opt.maxHeight;
        }
    }
    move(e, {
        'left': left, 'top': top, 'right': right, 'bottom': bottom,
        'offsetLeft': offsetLeft, 'offsetTop': offsetTop, 'offsetRight': offsetRight, 'offsetBottom': offsetBottom,
        'start': opt.start,
        'move': (ne, o) => {
            if (isRight) {
                opt.objectWidth += o.ox;
            }
            else if (isLeft) {
                opt.objectWidth -= o.ox;
                opt.objectLeft += o.ox;
            }
            if (isBottom) {
                opt.objectHeight += o.oy;
            }
            else if (isTop) {
                opt.objectHeight -= o.oy;
                opt.objectTop += o.oy;
            }
            opt.move?.(opt.objectLeft, opt.objectTop, opt.objectWidth, opt.objectHeight, o.x, o.y, o.border);
        },
        'end': opt.end
    });
}

let bindDragData = undefined;
function getData() {
    return bindDragData;
}
function setData(data) {
    bindDragData = data;
}
function dispatchEvent(el, type) {
    el?.dispatchEvent(new CustomEvent(type, { 'detail': { 'value': bindDragData } }));
}
function drag(e, el, opt) {
    bindDragData = opt?.data;
    let otop = 0, oleft = 0;
    let nel = null;
    let dragEl = null;
    move(e, {
        'object': el,
        'start': (x, y) => {
            const rect = el.getBoundingClientRect();
            dragEl = document.createElement('div');
            dragEl.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:rgba(255,255,255,.8);border:1px dashed rgba(0,0,0,.8);filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));pointer-events:none;z-index:999999;`;
            dragEl.style.borderRadius = getComputedStyle(el).borderRadius;
            document.body.appendChild(dragEl);
            otop = rect.top;
            oleft = rect.left;
            opt?.start?.(x, y);
        },
        'move': (e, o) => {
            otop += o.oy;
            oleft += o.ox;
            if (dragEl) {
                dragEl.style.left = `${oleft}px`;
                dragEl.style.top = `${otop}px`;
            }
            const els = document.elementsFromPoint(o.x, o.y);
            for (const item of els) {
                if (item.dataset.drop === undefined || item === el) {
                    continue;
                }
                if (item === nel) {
                    return;
                }
                if (nel) {
                    nel.removeAttribute('data-hover');
                    dispatchEvent(nel, 'dragleave');
                }
                item.dataset.hover = '';
                nel = item;
                dispatchEvent(nel, 'dragenter');
                return;
            }
            if (nel) {
                nel.removeAttribute('data-hover');
                dispatchEvent(nel, 'dragleave');
                nel = null;
            }
            opt?.move?.(e, o);
        },
        'end': (moveTimes, e) => {
            if (dragEl) {
                dragEl.remove();
                dragEl = null;
            }
            if (nel) {
                nel.removeAttribute('data-hover');
                dispatchEvent(nel, 'drop');
            }
            opt?.end?.(moveTimes, e);
            bindDragData = undefined;
        },
    });
}

const sessions = new WeakMap();
const owners = new WeakMap();
function isElement(target) {
    return !!target && ('nodeType' in target) && target.nodeType === 1;
}
function noop() {
}
function scaleWheel(e, target, handler) {
    if (!Number.isFinite(e.deltaY) || !e.deltaY) {
        return;
    }
    const win = target.ownerDocument.defaultView ?? getWindow(e);
    const unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? (target.clientHeight || win.innerHeight) : 1);
    const factor = Math.exp(Math.max(-1, Math.min(1, -e.deltaY * unit * 0.002)));
    const center = { 'x': e.clientX, 'y': e.clientY };
    if (e.cancelable) {
        e.preventDefault();
    }
    const pending = handler(e, factor, { 'x': 0, 'y': 0 }, {
        'mode': 'wheel', 'center': center, 'previousCenter': { ...center }, 'pointers': 0
    });
    pending?.catch((error) => {
        win.setTimeout(() => { throw error; }, 0);
    });
}
function scale(oe, handler, opt = {}) {
    const candidate = opt.target ?? (isElement(oe.currentTarget) ? oe.currentTarget : oe.target);
    if (!isElement(candidate) || opt.signal?.aborted) {
        return noop;
    }
    const target = candidate;
    if (oe.type === 'wheel') {
        scaleWheel(oe, target, handler);
        return noop;
    }
    const first = oe;
    if (oe.type !== 'pointerdown' || first.button !== 0) {
        return noop;
    }
    if (!oe.composedPath().includes(target) && (!isElement(oe.target) || !target.contains(oe.target))) {
        return noop;
    }
    const win = target.ownerDocument.defaultView ?? getWindow(oe);
    const pointerOwners = owners.get(win) ?? new Map();
    if (!owners.has(win)) {
        owners.set(win, pointerOwners);
    }
    const existing = sessions.get(target);
    if (existing) {
        existing.add(first);
        return existing.dispose;
    }
    if (pointerOwners.has(first.pointerId)) {
        return noop;
    }
    const pointers = new Map();
    let previousCenter = { 'x': first.clientX, 'y': first.clientY };
    let previousDistance = 0;
    let active = true;
    const session = {
        'add': add,
        'dispose': () => { finish('dispose'); }
    };
    const geometry = () => {
        const points = pointers.values();
        const a = points.next().value ?? previousCenter;
        const b = points.next().value;
        return b ? {
            'center': { 'x': (a.x + b.x) / 2, 'y': (a.y + b.y) / 2 },
            'distance': Math.hypot(a.x - b.x, a.y - b.y)
        } : { 'center': { ...a }, 'distance': 0 };
    };
    const rebase = () => {
        const next = geometry();
        previousCenter = next.center;
        previousDistance = next.distance;
    };
    function finish(reason, e) {
        if (!active) {
            return;
        }
        active = false;
        win.removeEventListener('pointermove', move);
        win.removeEventListener('pointerup', up);
        win.removeEventListener('pointercancel', cancel);
        win.removeEventListener('pointerdown', add);
        win.removeEventListener('blur', blur);
        opt.signal?.removeEventListener('abort', abort);
        sessions.delete(target);
        for (const id of pointers.keys()) {
            pointerOwners.delete(id);
        }
        pointers.clear();
        try {
            if (e?.type === 'pointerup') {
                opt.onPointers?.(e, 0);
            }
        }
        finally {
            opt.onEnd?.(e, reason);
        }
    }
    const notifyPointers = (e) => {
        try {
            opt.onPointers?.(e, pointers.size);
        }
        catch (error) {
            finish('cancel', e);
            throw error;
        }
    };
    function add(e) {
        if (!active || e.button !== 0 || pointers.has(e.pointerId) || pointerOwners.has(e.pointerId)) {
            return;
        }
        if (!e.composedPath().includes(target) && (!isElement(e.target) || !target.contains(e.target))) {
            return;
        }
        pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        pointerOwners.set(e.pointerId, session);
        rebase();
        notifyPointers(e);
    }
    function move(e) {
        if (!active || !pointers.has(e.pointerId)) {
            return;
        }
        pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        const next = geometry();
        const cpos = { 'x': next.center.x - previousCenter.x, 'y': next.center.y - previousCenter.y };
        const factor = previousDistance > 0 && next.distance > 0 ? next.distance / previousDistance : 1;
        const detail = {
            'mode': pointers.size > 1 ? 'pinch' : 'pan',
            'center': next.center, 'previousCenter': previousCenter, 'pointers': pointers.size
        };
        previousCenter = next.center;
        previousDistance = next.distance;
        if (!cpos.x && !cpos.y && factor === 1) {
            return;
        }
        if (e.cancelable) {
            e.preventDefault();
        }
        try {
            const pending = handler(e, factor, cpos, detail);
            if (pending) {
                pending.catch((error) => {
                    finish('cancel', e);
                    win.setTimeout(() => { throw error; }, 0);
                });
            }
        }
        catch (error) {
            finish('cancel', e);
            throw error;
        }
    }
    function up(e) {
        if (!active || !pointers.delete(e.pointerId)) {
            return;
        }
        pointerOwners.delete(e.pointerId);
        if (!pointers.size) {
            finish('up', e);
            return;
        }
        rebase();
        notifyPointers(e);
    }
    function cancel(e) {
        if (pointers.has(e.pointerId)) {
            finish('cancel', e);
        }
    }
    function blur(e) { finish('blur', e); }
    function abort() { finish('abort'); }
    sessions.set(target, session);
    win.addEventListener('pointermove', move, { 'passive': false });
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', cancel);
    win.addEventListener('pointerdown', add);
    win.addEventListener('blur', blur);
    opt.signal?.addEventListener('abort', abort, { 'once': true });
    add(first);
    return session.dispose;
}

const gestureWheel = {
    'last': 0,
    'offset': 0,
    'done': false,
    'timer': 0,
    'dir': ''
};
const reverseDir = {
    'top': 'bottom', 'bottom': 'top', 'left': 'right', 'right': 'left'
};
let gestureEl = null;
function getGestureEl() {
    if (!gestureEl) {
        gestureEl = document.createElement('div');
        gestureEl.className = 'pointer-gesture';
        document.body.appendChild(gestureEl);
        gestureEl.insertAdjacentHTML('afterend', `<style>` +
            `.pointer-gesture{position:fixed;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,.7);pointer-events:none;z-index:999999;opacity:0;transition:opacity 0.2s;transform-origin:center;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));}` +
            `.pointer-gesture-done::before{content:'';background:rgba(255,255,255,.9);border-radius:50%;width:10px;height:10px;}` +
            `.pointer-gesture-ani{transition: all .3s cubic-bezier(.39,.575,.565,1);transition-property:left,top,transform;}` +
            `</style>`);
    }
    return gestureEl;
}
function updateGestureStyle(rect, dir, offset, isInit = false) {
    const g = getGestureEl();
    const scale = offset / 90;
    g.style.transform = `scale(${scale})`;
    const isVertical = dir === 'top' || dir === 'bottom';
    if (isVertical) {
        g.style.left = `${rect.left + (rect.width - 20) / 2}px`;
        g.style.top = isInit
            ? `${dir === 'top' ? rect.top + 10 : rect.bottom - 10}px`
            : `${dir === 'top' ? rect.top + offset / 1.5 : rect.bottom - 20 - offset / 1.5}px`;
    }
    else {
        g.style.top = `${rect.top + (rect.height - 20) / 2}px`;
        g.style.left = isInit
            ? `${dir === 'left' ? rect.left + 10 : rect.right - 10}px`
            : `${dir === 'left' ? rect.left + offset / 1.5 : rect.right - 20 - offset / 1.5}px`;
    }
}
function gesture(oe, before, handler) {
    const el = oe.currentTarget;
    if (!el) {
        return;
    }
    const rect = el.getBoundingClientRect();
    const g = getGestureEl();
    if (oe.type.startsWith('pointer')) {
        let offset = 0;
        let origin = 0;
        let first = 1;
        let dir = 'top';
        let isGesture = false;
        const onTouchMove = (e) => {
            if (isGesture && e.cancelable) {
                e.preventDefault();
            }
        };
        const win = getWindow(oe);
        const pe = oe;
        if (pe.pointerType === 'touch') {
            win.addEventListener('touchmove', onTouchMove, { 'passive': false });
        }
        down(oe, {
            move: (e, d) => {
                const p = e;
                if (first < 0) {
                    if (first > -30) {
                        const rtn = before(e, dir);
                        if (rtn === 1) {
                            isGesture = true;
                            e.stopPropagation();
                            if (e.cancelable) {
                                e.preventDefault();
                            }
                            if (el && p.pointerId !== undefined) {
                                el.setPointerCapture(p.pointerId);
                            }
                            const { x, y } = getEventPos(e);
                            origin = (dir === 'top' || dir === 'bottom') ? y : x;
                            first = 0;
                        }
                        else {
                            if (rtn === -1) {
                                e.stopPropagation();
                            }
                            --first;
                        }
                    }
                    return;
                }
                if (first === 1) {
                    first = 0;
                    dir = reverseDir[d];
                    const rtn = before(e, dir);
                    if (rtn === 1) {
                        isGesture = true;
                        e.stopPropagation();
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                        if (el && p.pointerId !== undefined) {
                            el.setPointerCapture(p.pointerId);
                        }
                    }
                    else {
                        if (rtn === -1) {
                            e.stopPropagation();
                        }
                        first = -1;
                        return;
                    }
                    const { x, y } = getEventPos(oe);
                    origin = (dir === 'top' || dir === 'bottom') ? y : x;
                }
                const { x, y } = getEventPos(e);
                const pos = (dir === 'top' || dir === 'bottom') ? y : x;
                offset = (dir === 'top' || dir === 'left') ? pos - origin : origin - pos;
                offset = Math.max(0, Math.min(90, offset));
                g.style.opacity = offset > 0 ? '1' : '0';
                g.classList.toggle('pointer-gesture-done', offset >= 90);
                updateGestureStyle(rect, dir, offset);
            },
            up: () => {
                if (pe.pointerType === 'touch') {
                    win.removeEventListener('touchmove', onTouchMove);
                }
            },
            end: () => {
                g.style.opacity = '0';
                if (offset >= 90) {
                    handler?.(dir);
                }
            }
        });
    }
    else {
        const now = Date.now();
        if (now - gestureWheel.last > 250) {
            gestureWheel.offset = 0;
            gestureWheel.done = false;
            gestureWheel.timer = 0;
            gestureWheel.dir = '';
        }
        gestureWheel.last = now;
        if (gestureWheel.dir !== '') {
            oe.stopPropagation();
            if (oe.cancelable) {
                oe.preventDefault();
            }
        }
        if (gestureWheel.done) {
            return;
        }
        const we = oe;
        let deltaY = we.deltaY, deltaX = we.deltaX;
        if (gestureWheel.dir === '') {
            gestureWheel.dir = getMoveDir(deltaX, deltaY);
            const rtn = before(we, gestureWheel.dir);
            if (rtn === 1) {
                we.stopPropagation();
                if (we.cancelable) {
                    we.preventDefault();
                }
            }
            else {
                if (rtn === -1) {
                    we.stopPropagation();
                }
                gestureWheel.dir = '';
                return;
            }
            updateGestureStyle(rect, gestureWheel.dir, 0, true);
            void g.offsetWidth;
            g.classList.add('pointer-gesture-ani');
        }
        const isVertical = gestureWheel.dir === 'top' || gestureWheel.dir === 'bottom';
        const delta = isVertical ? deltaY : deltaX;
        gestureWheel.offset += (gestureWheel.dir === 'top' || gestureWheel.dir === 'left') ? -delta : delta;
        if (gestureWheel.offset < 0) {
            gestureWheel.offset = 0;
            g.style.opacity = '0';
            return;
        }
        g.style.opacity = '1';
        let offset = Math.min(90, gestureWheel.offset / 1.38);
        g.classList.toggle('pointer-gesture-done', offset >= 90);
        updateGestureStyle(rect, gestureWheel.dir, offset);
        const win = getWindow(oe);
        win.clearTimeout(gestureWheel.timer);
        if (offset < 90) {
            gestureWheel.timer = win.setTimeout(() => {
                g.style.opacity = '0';
                g.classList.remove('pointer-gesture-ani');
            }, 250);
            return;
        }
        gestureWheel.done = true;
        handler?.(gestureWheel.dir);
        sleep(500).then(() => {
            g.style.opacity = '0';
            g.classList.remove('pointer-gesture-ani');
        }).catch(() => { });
    }
}

export { addHook as addMoveHook, allowEvent, click, dblClick, down, drag, gesture, getData as getDragData, getEventPos, getMoveDir, hover, isMoving, isTouch, long, menu, move, removeHook as removeMoveHook, resize, scale, set as setCursor, setData as setDragData };
