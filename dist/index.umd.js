(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.pointer = {}));
})(this, (function (exports) { 'use strict';

    function isTouch(e) {
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

    function down(oe, opt) {
        const target = oe.target;
        let { 'x': ox, 'y': oy } = getEventPos(oe);
        let isStart = false;
        let end = undefined;
        const move = function (e) {
            if ((!e.target || !document.body.contains(e.target)) && e.cancelable) {
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
                    window.removeEventListener('pointermove', move);
                    window.removeEventListener('pointerup', end);
                    window.removeEventListener('pointercancel', end);
                    return;
                }
            }
            if (opt.move?.(e, dir) === false) {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', end);
                window.removeEventListener('pointercancel', end);
            }
        };
        end = function (e) {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            opt.up?.(e);
            if (isStart) {
                opt.end?.(e);
            }
        };
        target?.setPointerCapture?.(oe.pointerId);
        window.addEventListener('pointermove', move, { 'passive': false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        opt.down?.(oe);
    }

    exports.isMoving = false;
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
        exports.isMoving = true;
        set(opt.cursor ?? getComputedStyle(e.target).cursor);
        let { x: tx, y: ty } = getEventPos(e);
        let left, top, right, bottom;
        if (opt.areaObject) {
            const areaRect = opt.areaObject.getBoundingClientRect();
            const s = getComputedStyle(opt.areaObject);
            left = areaRect.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
            top = areaRect.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
            right = areaRect.left + areaRect.width - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
            bottom = areaRect.top + areaRect.height - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
        }
        else {
            left = opt.left ?? 0;
            top = opt.top ?? 0;
            right = opt.right ?? window.innerWidth;
            bottom = opt.bottom ?? window.innerHeight;
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
                exports.isMoving = false;
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
            up: (ne) => {
                if (Date.now() - time >= 250) {
                    return;
                }
                const nx = ne.clientX;
                const ny = ne.clientY;
                if (nx === x && ny === y) {
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
            if (now - lastDblClickData.time <= 300) {
                const xx = Math.abs(x - lastDblClickData.x);
                const xy = Math.abs(y - lastDblClickData.y);
                if (xx < 10 && xy < 10) {
                    handler(ne, x, y);
                    lastDblClickData.time = 0;
                    lastDblClickData.x = 0;
                    lastDblClickData.y = 0;
                    return;
                }
            }
            lastDblClickData.time = now;
            lastDblClickData.x = x;
            lastDblClickData.y = y;
        });
    }
    let lastLongTime = 0;
    function long(e, long, time) {
        const { 'x': tx, 'y': ty, } = getEventPos(e);
        let ox = 0, oy = 0, isLong = false;
        let timer = window.setTimeout(() => {
            timer = undefined;
            if (ox <= 1 && oy <= 1) {
                isLong = true;
                Promise.resolve(long(e)).catch((err) => { throw err; });
            }
        }, time ?? 300);
        down(e, {
            move: (ne) => {
                const { x, y } = getEventPos(ne);
                ox = Math.abs(x - tx);
                oy = Math.abs(y - ty);
            },
            up: () => {
                if (timer !== undefined) {
                    clearTimeout(timer);
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

    function scaleWheel(oe, handler) {
        if (!oe.deltaY) {
            return;
        }
        oe.preventDefault();
        const delta = Math.abs(oe.deltaY);
        const zoomFactor = delta * (delta > 50 ? 0.0015 : 0.003);
        handler(oe, oe.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor, { 'x': 0, 'y': 0 });
    }
    function scale(oe, handler) {
        if (oe instanceof WheelEvent) {
            scaleWheel(oe, handler);
            return;
        }
        const target = oe.target;
        if (!target) {
            return;
        }
        const state = {
            'pointers': new Map(),
            'lastDis': 0,
            'lastPos': { 'x': 0, 'y': 0 },
            'lastSinglePos': { 'x': oe.clientX, 'y': oe.clientY }
        };
        state.pointers.set(oe.pointerId, { 'x': oe.clientX, 'y': oe.clientY });
        let down = undefined;
        const move = (e) => {
            if (!state.pointers.has(e.pointerId)) {
                state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
                if (state.pointers.size === 2) {
                    const pts = Array.from(state.pointers.values());
                    state.lastDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                    state.lastPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
                }
                return;
            }
            state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
            if (state.pointers.size >= 2) {
                const pts = Array.from(state.pointers.values());
                const newDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                const newPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
                const scaleVal = state.lastDis > 0 ? newDis / state.lastDis : 1;
                const dx = newPos.x - state.lastPos.x;
                const dy = newPos.y - state.lastPos.y;
                handler(e, scaleVal, { 'x': dx, 'y': dy });
                state.lastDis = newDis;
                state.lastPos = newPos;
            }
            else {
                const dx = e.clientX - state.lastSinglePos.x;
                const dy = e.clientY - state.lastSinglePos.y;
                if (dx !== 0 || dy !== 0) {
                    handler(e, 1, { 'x': dx, 'y': dy });
                    state.lastSinglePos = { 'x': e.clientX, 'y': e.clientY };
                }
            }
        };
        const up = (e) => {
            state.pointers.delete(e.pointerId);
            if (state.pointers.size === 1) {
                state.lastDis = 0;
                const pts = Array.from(state.pointers.values());
                state.lastSinglePos = { 'x': pts[0].x, 'y': pts[0].y };
            }
            if (state.pointers.size === 0) {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', up);
                window.removeEventListener('pointerdown', down);
            }
        };
        down = (e) => {
            target.setPointerCapture?.(e.pointerId);
            state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
            if (state.pointers.size === 2) {
                const pts = Array.from(state.pointers.values());
                state.lastDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                state.lastPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
            }
        };
        target.setPointerCapture?.(oe.pointerId);
        window.addEventListener('pointermove', move, { 'passive': false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        window.addEventListener('pointerdown', down);
    }

    const gestureWheel = {
        'last': 0,
        'offset': 0,
        'done': false,
        'timer': 0,
        'firstTimer': false,
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
            gestureEl.insertAdjacentHTML('afterend', `<style>.pointer-gesture{position:fixed;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,.7);pointer-events:none;z-index:999999;opacity:0;transition:opacity 0.2s;transform-origin:center;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,.3));}.pointer-gesture-done::before{content:'';background:rgba(255,255,255,.9);border-radius:50%;width:10px;height:10px;}</style>`);
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
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function gesture(oe, before, handler) {
        const el = oe.currentTarget;
        if (!el) {
            return;
        }
        const rect = el.getBoundingClientRect();
        const g = getGestureEl();
        if (oe instanceof PointerEvent) {
            let offset = 0, origin = 0, first = 1;
            let dir = 'top';
            down(oe, {
                move: (e, d) => {
                    if (first < 0) {
                        if (first > -30) {
                            const rtn = before(e, dir);
                            if (rtn === 1) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                            else if (rtn === -1) {
                                e.stopPropagation();
                            }
                            --first;
                        }
                        return;
                    }
                    if (first === 1) {
                        first = 0;
                        dir = reverseDir[d];
                        const rtn = before(e, dir);
                        if (rtn === 1) {
                            e.stopPropagation();
                            e.preventDefault();
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
                end: () => {
                    g.style.opacity = '0';
                    if (offset >= 90) {
                        handler?.(dir);
                    }
                }
            });
        }
        else {
            (async () => {
                const now = Date.now();
                if (now - gestureWheel.last > 250) {
                    gestureWheel.offset = 0;
                    gestureWheel.done = false;
                    gestureWheel.timer = 0;
                    gestureWheel.firstTimer = false;
                    gestureWheel.dir = '';
                }
                gestureWheel.last = now;
                if (gestureWheel.firstTimer || gestureWheel.done) {
                    return;
                }
                let deltaY = oe.deltaY, deltaX = oe.deltaX;
                if (gestureWheel.dir === '') {
                    gestureWheel.dir = getMoveDir(deltaX, deltaY);
                    const rtn = before(oe, gestureWheel.dir);
                    if (rtn === 1) {
                        oe.stopPropagation();
                        oe.preventDefault();
                    }
                    else {
                        if (rtn === -1) {
                            oe.stopPropagation();
                            gestureWheel.done = true;
                        }
                        else {
                            gestureWheel.dir = '';
                        }
                        return;
                    }
                    updateGestureStyle(rect, gestureWheel.dir, 0, true);
                    gestureWheel.firstTimer = true;
                    await sleep(30);
                    gestureWheel.firstTimer = false;
                    g.classList.add('ani');
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
                clearTimeout(gestureWheel.timer);
                if (offset < 90) {
                    gestureWheel.timer = window.setTimeout(() => {
                        g.style.opacity = '0';
                        g.classList.remove('ani');
                    }, 250);
                    return;
                }
                gestureWheel.done = true;
                handler?.(gestureWheel.dir);
                await sleep(500);
                g.style.opacity = '0';
                g.classList.remove('ani');
            })().catch(() => { });
        }
    }

    exports.addMoveHook = addHook;
    exports.allowEvent = allowEvent;
    exports.click = click;
    exports.dblClick = dblClick;
    exports.down = down;
    exports.drag = drag;
    exports.gesture = gesture;
    exports.getDragData = getData;
    exports.getEventPos = getEventPos;
    exports.getMoveDir = getMoveDir;
    exports.isTouch = isTouch;
    exports.long = long;
    exports.move = move;
    exports.removeMoveHook = removeHook;
    exports.resize = resize;
    exports.scale = scale;
    exports.setCursor = set;
    exports.setDragData = setData;

}));
