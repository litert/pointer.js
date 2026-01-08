/**
 * Copyright 2007-2026 MAIYUYN.NET
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

import * as types from './types';
import * as utils from './utils';
import { down } from './down';

/** --- 绑定拖拉响应操作的 wheel 数据对象 --- */
const gestureWheel = {
    /** --- 最后一次触发的时间 --- */
    'last': 0,
    /** --- 当前偏移量 --- */
    'offset': 0,
    /** --- 是否已完成手势 --- */
    'done': false,
    /** --- 自动隐藏的计时器 ID --- */
    'timer': 0,
    /** --- 拖拉方向 --- */
    'dir': '' as ('' | types.TDirection)
};

/** --- 反转方向映射 --- */
const reverseDir: Record<string, types.TDirection> = {
    'top': 'bottom', 'bottom': 'top', 'left': 'right', 'right': 'left'
};

/** --- gesture 指示器元素 --- */
let gestureEl: HTMLElement | null = null;

/**
 * --- 获取或创建 gesture 指示器元素 ---
 */
function getGestureEl(): HTMLElement {
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

/**
 * --- 更新 gesture 元素位置和样式 ---
 * @param rect 目标元素的矩形区域
 * @param dir 手势方向
 * @param offset 偏移量
 * @param isInit 是否为初始化
 */
function updateGestureStyle(
    rect: DOMRect,
    dir: types.TDirection,
    offset: number,
    isInit: boolean = false
): void {
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
 * --- 绑定上拉、下拉、左拉、右拉手势 ---
 * @param oe 响应事件
 * @param before before 事件，返回 1 则显示 gesture ，0 则不处理（可能会向上传递事件），-1 则 stopPropagation （本层可拖动，若实际不可拖动则可能导致浏览器页面滚动）
 * @param handler 执行完毕的话才会回调
 */
export function gesture(
    oe: PointerEvent | WheelEvent,
    before: types.TGestureBeforeHandler,
    handler?: types.TGestureHandler
): void {
    const el = oe.currentTarget as HTMLElement | null;
    if (!el) {
        return;
    }
    const rect = el.getBoundingClientRect();
    const g = getGestureEl();
    if (oe instanceof PointerEvent) {
        // --- pointer 触发的，dir 会和 wheel 的 dir 相反，向下拖动是上方加载 ---
        /** --- 当前手势的偏移量，用于计算手势进度 --- */
        let offset = 0;
        /** --- 手势开始时的初始坐标位置 --- */
        let origin = 0;
        /** --- 标志变量，用于控制手势初始化的逻辑 --- */
        let first = 1;
        /** --- 方向 --- */
        let dir: types.TDirection = 'top';
        /** --- 标志变量，用于指示当前是否已经进入手势模式，用于动态禁止滚动 --- */
        let isGesture = false;
        /** --- 动态禁止滚动的监听器 --- */
        const onTouchMove = (e: TouchEvent): void => {
            if (isGesture && e.cancelable) {
                e.preventDefault();
            }
        };
        const win = utils.getWindow(oe);
        if (oe.pointerType === 'touch') {
            win.addEventListener('touchmove', onTouchMove, { 'passive': false });
        }
        down(oe, {
            move: (e, d) => {
                if (first < 0) {
                    if (first > -30) {
                        const rtn = before(e, dir);
                        if (rtn === 1) {
                            isGesture = true;
                            e.stopPropagation();
                            if (e.cancelable) {
                                e.preventDefault();
                            }
                            if (el && e.pointerId !== undefined) {
                                el.setPointerCapture(e.pointerId);
                            }
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
                        isGesture = true;
                        e.stopPropagation();
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                        if (el && e.pointerId !== undefined) {
                            el.setPointerCapture(e.pointerId);
                        }
                    }
                    else {
                        if (rtn === -1) {
                            e.stopPropagation();
                        }
                        first = -1;
                        return;
                    }
                    const { x, y } = utils.getEventPos(oe);
                    origin = (dir === 'top' || dir === 'bottom') ? y : x;
                }
                const { x, y } = utils.getEventPos(e);
                const pos = (dir === 'top' || dir === 'bottom') ? y : x;
                offset = (dir === 'top' || dir === 'left') ? pos - origin : origin - pos;
                offset = Math.max(0, Math.min(90, offset));
                g.style.opacity = offset > 0 ? '1' : '0';
                g.classList.toggle('pointer-gesture-done', offset >= 90);
                updateGestureStyle(rect, dir, offset);
            },
            up: () => {
                if (oe.pointerType === 'touch') {
                    win.removeEventListener('touchmove', onTouchMove);
                }
            },
            end: () => {
                g.style.opacity = '0';
                if (offset >= 90) {
                    handler?.(dir) as any;
                }
            }
        });
    }
    else {
        // --- wheel 触发 ---
        const now = Date.now();
        if (now - gestureWheel.last > 250) {
            gestureWheel.offset = 0;
            gestureWheel.done = false;
            gestureWheel.timer = 0;
            gestureWheel.dir = '';
        }
        gestureWheel.last = now;
        if (gestureWheel.dir !== '' && oe.cancelable) {
            oe.stopPropagation();
            oe.preventDefault();
        }
        if (gestureWheel.done) {
            return;
        }
        let deltaY = oe.deltaY, deltaX = oe.deltaX;
        if (gestureWheel.dir === '') {
            gestureWheel.dir = utils.getMoveDir(deltaX, deltaY);
            const rtn = before(oe, gestureWheel.dir);
            if (rtn === 1) {
                // --- 才滚 ---
                oe.stopPropagation();
                if (oe.cancelable) {
                    oe.preventDefault();
                }
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
            // --- 强制重绘，让初始位置生效，否则会直接跳到 offset 位置 ---
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
        const win = utils.getWindow(oe as any);
        win.clearTimeout(gestureWheel.timer);
        if (offset < 90) {
            gestureWheel.timer = win.setTimeout(() => {
                g.style.opacity = '0';
                g.classList.remove('pointer-gesture-ani');
            }, 250);
            return;
        }
        gestureWheel.done = true;
        handler?.(gestureWheel.dir) as any;
        utils.sleep(500).then(() => {
            g.style.opacity = '0';
            g.classList.remove('pointer-gesture-ani');
        }).catch(() => {});
    }
}
