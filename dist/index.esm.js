/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// ----------------------
// ------- 工具函数 ------
// ----------------------
/** --- 最后一次 touchstart 的时间戳 --- */
let lastTouchTime = 0;
// --- 添加 touchstart 事件，既优化了点击行为，也记录了 touch 的时间戳信息 ---
if (typeof document !== 'undefined') {
    document.addEventListener('touchstart', function () {
        lastTouchTime = Date.now();
    }, {
        'passive': true
    });
}
/**
 * --- 判断当前的事件是否是含有 touch 的设备触发的，如果当前就是 touch 则直接返回 false（false 代表 OK，true 代表 touch 设备却触发了 mouse 事件） ---
 * @param e 事件对象
 */
function hasTouchButMouse(e) {
    if (e instanceof TouchEvent || e.type === 'touchstart') {
        return false;
    }
    if ((e.pointerType === 'touch') && (e.type === 'contextmenu')) {
        // --- 当前是 mouse 但是却是 touch 触发的 ---
        return true;
    }
    const now = Date.now();
    if (now - lastTouchTime < 60_000) {
        // --- 当前是 mouse 但是 60_000ms 内有 touch start ---
        return true;
    }
    return false;
}
/**
 * --- 从事件中获取坐标 ---
 * @param e 事件对象
 * @param type 获取类型，client（触摸中） 或 changed（已结束，用于 touchend）
 */
function getEventPos(e, type = 'client') {
    if (e instanceof MouseEvent) {
        return { 'x': e.clientX, 'y': e.clientY };
    }
    const touch = type === 'changed' ? e.changedTouches[0] : e.touches[0];
    return { 'x': touch.clientX, 'y': touch.clientY };
}
/**
 * --- 根据坐标差值计算移动方向 ---
 * @param dx x 轴差值
 * @param dy y 轴差值
 */
function getMoveDir(dx, dy) {
    return Math.abs(dy) > Math.abs(dx)
        ? (dy < 0 ? 'top' : 'bottom')
        : (dx < 0 ? 'left' : 'right');
}
// ----------------------
// ------- DOM 工具 ------
// ----------------------
const DISABLED_REGEX = /disabled/i;
/**
 * --- 判断一个元素是否被禁用 ---
 * @param el 要判断的元素
 */
function isDisabled(el) {
    while (el) {
        // --- 优先检查 class 字符串 ---
        if (DISABLED_REGEX.test(el.className)) {
            return true;
        }
        // --- 遍历 dataset 键名 ---
        for (const key in el.dataset) {
            if (DISABLED_REGEX.test(key)) {
                return true;
            }
        }
        // --- 向上查找父元素 ---
        el = el.parentElement;
    }
    // --- 遍历到顶层仍未发现 disabled 信息 ---
    return false;
}

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** --- 全局 cursor 设置的 style 标签 --- */
let globalCursorStyle = null;
/**
 * --- 设置全局鼠标样式 ---
 * @param type 样式或留空，留空代表取消
 */
function set(type) {
    if (!globalCursorStyle) {
        // --- 创建全局 cursor style ---
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

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * --- 绑定按下以及弹起事件，touch 和 mouse 事件只可能成功绑定一个 ---
 * @param oe MouseEvent | TouchEvent
 * @param opt 回调选项
 */
function down(oe, opt) {
    if (hasTouchButMouse(oe)) {
        return;
    }
    const isMouse = oe instanceof MouseEvent;
    /** --- 目标元素 --- */
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
                if (isMouse) {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', end);
                }
                else if (target) {
                    target.removeEventListener('touchmove', move);
                    target.removeEventListener('touchend', end);
                    target.removeEventListener('touchcancel', end);
                }
                return;
            }
        }
        if (opt.move?.(e, dir) === false) {
            if (isMouse) {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', end);
            }
            else if (target) {
                target.removeEventListener('touchmove', move);
                target.removeEventListener('touchend', end);
                target.removeEventListener('touchcancel', end);
            }
        }
    };
    end = function (e) {
        if (isMouse) {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', end);
        }
        else if (target) {
            target.removeEventListener('touchmove', move);
            target.removeEventListener('touchend', end);
            target.removeEventListener('touchcancel', end);
        }
        opt.up?.(e);
        if (isStart) {
            opt.end?.(e);
        }
    };
    if (isMouse) {
        window.addEventListener('mousemove', move, { 'passive': false });
        window.addEventListener('mouseup', end);
    }
    else {
        target.addEventListener('touchmove', move, { 'passive': false });
        target.addEventListener('touchend', end);
        target.addEventListener('touchcancel', end);
    }
    opt.down?.(oe);
}

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** --- 目前是否正在拖动 --- */
let isMoving = false;
/**
 * --- 计算边界限制后的坐标 ---
 * --- 用于在拖动过程中限制元素位置不超过指定的边界范围 ---
 * @param val 当前坐标
 * @param prevVal 上一次坐标
 * @param nowMin 当前理论最小边界位置
 * @param nowMax 当前理论最大边界位置
 * @param min 最小边界
 * @param max 最大边界
 * @param offsetMin 最小偏移
 * @param offsetMax 最大偏移
 * @returns 返回经过边界限制后的坐标信息
 */
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
/**
 * --- 计算边界类型 ---
 * --- 用于根据当前位置和边界信息确定具体的边界位置类型，用于调整大小或拖动时的光标显示 ---
 * @param inTop 是否在顶部边界
 * @param inRight 是否在右侧边界
 * @param inBottom 是否在底部边界
 * @param inLeft 是否在左侧边界
 * @param x 当前X坐标
 * @param y 当前Y坐标
 * @param left 边界左侧位置
 * @param top 边界顶部位置
 * @param right 边界右侧位置
 * @param bottom 边界底部位置
 * @returns 返回边界类型，如 'lt'(左上), 'tr'(右上), 't'(上), 'r'(右), 'rb'(右下), 'b'(下), 'bl'(左下), 'l'(左), ''(不在边界)
 */
function calcBorderType(inTop, inRight, inBottom, inLeft, x, y, left, top, right, bottom) {
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
/**
 * --- 绑定拖动事件 ---
 * @param e mousedown 或 touchstart 的 event
 * @param opt 回调选项
 */
function move(e, opt) {
    if (hasTouchButMouse(e)) {
        return { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 };
    }
    isMoving = true;
    set(opt.cursor ?? getComputedStyle(e.target).cursor);
    let { x: tx, y: ty } = getEventPos(e);
    // --- 计算边界 ---
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
    e.preventDefault();
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
            // --- 边界检测 ---
            /** --- 检测横轴 --- */
            const xResult = clampToBorder(x, tx, x - offsetLeft, x + offsetRight, left, right, offsetLeft, offsetRight);
            /** --- 检测纵轴 --- */
            const yResult = clampToBorder(y, ty, y - offsetTop, y + offsetBottom, top, bottom, offsetTop, offsetBottom);
            x = xResult.val;
            y = yResult.val;
            const inBorderLeft = xResult.atMin, inBorderRight = xResult.atMax;
            const inBorderTop = yResult.atMin, inBorderBottom = yResult.atMax;
            /** --- 在任意一个边界上 --- */
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
        up: (ne) => {
            isMoving = false;
            set();
            opt.up?.(moveTimes, ne);
        },
        end: (ne) => {
            opt.end?.(moveTimes, ne);
        }
    });
    return { 'left': left, 'top': top, 'right': right, 'bottom': bottom };
}

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * --- 鼠标/手指没移动时，click 才生效 ---
 * --- touch 和 mouse 事件只可能成功绑定一个 ---
 * @param e 事件对象
 * @param handler 回调
 */
function click(e, handler) {
    if (hasTouchButMouse(e)) {
        return;
    }
    if ((e instanceof MouseEvent) && (e.button > 0)) {
        return;
    }
    const x = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    const time = Date.now();
    down(e, {
        up: (ne) => {
            if (Date.now() - time >= 250) {
                return;
            }
            const nx = ne instanceof MouseEvent ? ne.clientX : ne.changedTouches[0].clientX;
            const ny = ne instanceof MouseEvent ? ne.clientY : ne.changedTouches[0].clientY;
            if (nx === x && ny === y) {
                handler(ne, nx, ny);
            }
        }
    });
}
/** --- 双击事件中，最后一次单击的数据 --- */
const lastDblClickData = {
    'time': 0,
    'x': 0,
    'y': 0,
};
/**
 * --- 相当于鼠标/手指两次 click 的效果，并且两次位置差别不太大，dblclick 才生效 ---
 * --- touch 和 mouse 事件只可能成功绑定一个 ---
 * @param e 事件对象
 * @param handler 回调
 */
function dblClick(e, handler) {
    click(e, (ne, x, y) => {
        // --- 判断当前第几次点击 ---
        const now = Date.now();
        if (now - lastDblClickData.time <= 300) {
            // --- 判断位置差别 ---
            const xx = Math.abs(x - lastDblClickData.x);
            const xy = Math.abs(y - lastDblClickData.y);
            if (xx < 10 && xy < 10) {
                // --- 响应双击 ---
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
/** --- 最后一次长按触发的时间 --- */
let lastLongTime = 0;
/**
 * --- 绑定长按事件 ---
 * --- touch 和 mouse 事件只可能成功绑定一个 ---
 * @param e 事件原型
 * @param long 长按回调
 */
function long(e, long) {
    if (hasTouchButMouse(e)) {
        return;
    }
    const { 'x': tx, 'y': ty, } = getEventPos(e);
    let ox = 0, oy = 0, isLong = false;
    let timer = window.setTimeout(() => {
        timer = undefined;
        if (ox <= 1 && oy <= 1) {
            isLong = true;
            Promise.resolve(long(e)).catch((err) => { throw err; });
        }
    }, 300);
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
/**
 * --- 判断是否允许事件通过（检查是否被禁用） ---
 * @param e 事件对象
 * @returns true 允许，false 不允许
 */
function allowEvent(e) {
    const now = Date.now();
    if (now - lastLongTime < 5) {
        // --- 防抖处理，刚刚结束了 long 的所有事件不响应 ---
        return false;
    }
    const current = e.currentTarget;
    if (isDisabled(current)) {
        return false;
    }
    return true;
}

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * --- 绑定拖动改变大小事件 ---
 * @param e mousedown 或 touchstart 的 event
 * @param opt 选项，width, height 当前对象宽高
 */
function resize(e, opt) {
    if (hasTouchButMouse(e)) {
        return;
    }
    const minW = opt.minWidth ?? 0, minH = opt.minHeight ?? 0;
    const { x, y } = getEventPos(e);
    let offsetLeft, offsetTop, offsetRight, offsetBottom;
    let left, top, right, bottom;
    // --- 获取 object 的 x,y 和 w,h 信息 ---
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

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** --- 要传输的 drag data 数据 --- */
let bindDragData = undefined;
/**
 * --- 获取当前拖拽数据 ---
 */
function getData() {
    return bindDragData;
}
/**
 * --- 重新绑定 drag 数据 ---
 * @param data 要绑定的数据
 */
function setData(data) {
    bindDragData = data;
}
/**
 * --- 触发拖拽事件 ---
 */
function dispatchEvent(el, type) {
    el?.dispatchEvent(new CustomEvent(type, { 'detail': { 'value': bindDragData } }));
}
/**
 * --- 绑定拖动 ---
 * @param e 鼠标事件
 * @param el 拖动元素
 * @param opt 参数
 */
function drag(e, el, opt) {
    bindDragData = opt?.data;
    let otop = 0, oleft = 0;
    /** --- 当前拖拽时鼠标悬停的可放置元素 --- */
    let nel = null;
    /** --- 拖拽指示器元素 --- */
    let dragEl = null;
    move(e, {
        'object': el,
        'start': (x, y) => {
            const rect = el.getBoundingClientRect();
            // --- 创建拖拽指示器 ---
            dragEl = document.createElement('div');
            dragEl.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:rgba(0,0,0,0.1);border:1px dashed #666;pointer-events:none;z-index:999999;`;
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
            // --- 获取当前 element ---
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
            // --- not found ---
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

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * --- 绑定缩放，要绑定到 mousedown、touchstart、touchmove、touchend、wheel 上 ---
 * @param oe 触发的事件
 * @param handler 回调函数
 */
function scale(oe, handler) {
    const el = oe.currentTarget;
    if (!el) {
        return;
    }
    if (oe instanceof TouchEvent) {
        // --- 指头 ---
        if (oe.type === 'touchend') {
            if (!oe.touches.length) {
                el.removeAttribute('data-scale');
            }
            return;
        }
        const t0 = oe.touches[0], t1 = oe.touches[1];
        const ex = [t0.clientX, t1?.clientX ?? -1e3];
        const ey = [t0.clientY, t1?.clientY ?? -1e3];
        const hasTwoFingers = ex[1] !== -1e3;
        const ndis = hasTwoFingers ? Math.hypot(ex[0] - ex[1], ey[0] - ey[1]) : 0;
        const epos = hasTwoFingers
            ? { 'x': (ex[0] + ex[1]) / 2, 'y': (ey[0] + ey[1]) / 2 }
            : { 'x': ex[0], 'y': ey[0] };
        if (el.dataset.scale === undefined) {
            el.dataset.scale = JSON.stringify({ 'dis': ndis, 'x': ex, 'y': ey, 'pos': epos });
            return;
        }
        const d = JSON.parse(el.dataset.scale);
        const notchange = hasTwoFingers !== (d.x[1] !== -1e3);
        const scale = (ndis > 0 && d.dis > 0) ? ndis / d.dis : 1;
        handler(oe, scale, {
            'x': notchange ? 0 : epos.x - d.pos.x,
            'y': notchange ? 0 : epos.y - d.pos.y
        });
        el.dataset.scale = JSON.stringify({ 'dis': ndis, 'x': ex, 'y': ey, 'pos': epos });
        return;
    }
    if (oe instanceof WheelEvent) {
        if (!oe.deltaY) {
            return;
        }
        const delta = Math.abs(oe.deltaY);
        const zoomFactor = delta * (delta > 50 ? 0.0015 : 0.003);
        handler(oe, oe.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor, { 'x': 0, 'y': 0 });
        return;
    }
    // --- 纯鼠标拖动 ---
    move(oe, {
        'move': (e, opt) => {
            handler(oe, 1, { 'x': opt.ox, 'y': opt.oy });
        }
    });
}

/**
 * Copyright 2024-2025 MAIYUYN.NET
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** --- 绑定拖拉响应操作的 wheel 数据对象 --- */
const gestureWheel = {
    'last': 0,
    'offset': 0,
    'done': false,
    'timer': 0,
    'firstTimer': false,
    'dir': ''
};
/** --- 反转方向映射 --- */
const reverseDir = {
    'top': 'bottom', 'bottom': 'top', 'left': 'right', 'right': 'left'
};
/** --- gesture 指示器元素 --- */
let gestureEl = null;
/**
 * --- 获取或创建 gesture 指示器元素 ---
 */
function getGestureEl() {
    if (!gestureEl) {
        gestureEl = document.createElement('div');
        gestureEl.className = 'pointer-gesture';
        gestureEl.style.cssText = `position:fixed;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.3);pointer-events:none;z-index:999999;opacity:0;transition:opacity 0.2s;transform-origin:center;`;
        document.body.appendChild(gestureEl);
    }
    return gestureEl;
}
/**
 * --- 更新 gesture 元素位置和样式 ---
 */
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
/**
 * --- 简单的 sleep 工具函数 ---
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * --- 绑定上拉、下拉、左拉、右拉手势 ---
 * @param oe 响应事件
 * @param before before 事件，返回 1 则显示 gesture，0 则不处理（可能会向上传递事件），-1 则 stopPropagation（本层可拖动，若实际不可拖动则可能导致浏览器页面滚动）
 * @param handler 执行完毕的话才会回调
 */
function gesture(oe, before, handler) {
    const el = oe.currentTarget;
    if (!el) {
        return;
    }
    const rect = el.getBoundingClientRect();
    const g = getGestureEl();
    if ((oe instanceof MouseEvent || oe instanceof TouchEvent) && !(oe instanceof WheelEvent)) {
        // --- touch / mouse 触发的，dir 会和鼠标的 dir 相反，向下拖动是上方加载 ---
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
                g.classList.toggle('done', offset >= 90);
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
        // --- wheel 触发 ---
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
            g.classList.toggle('done', offset >= 90);
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

export { allowEvent, click, dblClick, down, drag, gesture, getData as getDragData, getEventPos, getMoveDir, hasTouchButMouse, isMoving, long, move, resize, scale, set as setCursor, setData as setDragData };
