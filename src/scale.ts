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

/** --- 多指针追踪数据 --- */
interface IPointerData {
    'x': number;
    'y': number;
}

/** --- 缩放状态 --- */
interface IScaleState {
    /** --- 指针列表 --- */
    'pointers': Map<number, IPointerData>;
    /** --- 上次双指距离 --- */
    'lastDis': number;
    /** --- 上次双指中心点 --- */
    'lastPos': { 'x': number; 'y': number; };
    /** --- 上次单指位置 --- */
    'lastSinglePos': { 'x': number; 'y': number; };
}

/**
 * --- 绑定滚轮缩放 ---
 * @param oe 触发的 WheelEvent 事件
 * @param handler 回调函数
 */
function scaleWheel(oe: WheelEvent, handler: types.TScaleHandler): void {
    if (!oe.deltaY) {
        return;
    }
    oe.preventDefault();
    const delta = Math.abs(oe.deltaY);
    const zoomFactor = delta * (delta > 50 ? 0.0015 : 0.003);
    handler(oe, oe.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor, { 'x': 0, 'y': 0 }) as any;
}

/**
 * --- 绑定指针缩放/拖动，只需绑定到 pointerdown、或 wheel 事件（也可同时绑定）上，其他事件自动绑定并在结束后自动移除 ---
 * @param oe 触发的 PointerEvent 事件
 * @param handler 回调函数
 */
export function scale(oe: PointerEvent | WheelEvent, handler: types.TScaleHandler): void {
    if (oe instanceof WheelEvent) {
        scaleWheel(oe, handler);
        return;
    }
    const target = oe.target as HTMLElement;
    if (!target) {
        return;
    }
    // --- 初始化状态 ---
    const state: IScaleState = {
        'pointers': new Map(),
        'lastDis': 0,
        'lastPos': { 'x': 0, 'y': 0 },
        'lastSinglePos': { 'x': oe.clientX, 'y': oe.clientY }
    };
    // --- 记录第一个指针 ---
    state.pointers.set(oe.pointerId, { 'x': oe.clientX, 'y': oe.clientY });

    let down: ((e: PointerEvent) => void) | undefined = undefined;

    const move = (e: PointerEvent): void => {
        if (!state.pointers.has(e.pointerId)) {
            // --- 新指针加入 ---
            state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
            if (state.pointers.size === 2) {
                // --- 双指开始，计算初始距离和中心点 ---
                const pts = Array.from(state.pointers.values());
                state.lastDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                state.lastPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
            }
            return;
        }
        // --- 更新指针位置 ---
        state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        if (state.pointers.size >= 2) {
            // --- 双指缩放 ---
            const pts = Array.from(state.pointers.values());
            const newDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const newPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
            const scaleVal = state.lastDis > 0 ? newDis / state.lastDis : 1;
            const dx = newPos.x - state.lastPos.x;
            const dy = newPos.y - state.lastPos.y;
            handler(e, scaleVal, { 'x': dx, 'y': dy }) as any;
            state.lastDis = newDis;
            state.lastPos = newPos;
        }
        else {
            // --- 单指拖动 ---
            const dx = e.clientX - state.lastSinglePos.x;
            const dy = e.clientY - state.lastSinglePos.y;
            if (dx !== 0 || dy !== 0) {
                handler(e, 1, { 'x': dx, 'y': dy }) as any;
                state.lastSinglePos = { 'x': e.clientX, 'y': e.clientY };
            }
        }
    };

    const win = utils.getWindow(oe);

    const up = (e: PointerEvent): void => {
        state.pointers.delete(e.pointerId);
        if (state.pointers.size === 1) {
            // --- 恢复为单指，重置状态 ---
            state.lastDis = 0;
            const pts = Array.from(state.pointers.values());
            state.lastSinglePos = { 'x': pts[0].x, 'y': pts[0].y };
        }
        if (state.pointers.size === 0) {
            // --- 所有指针都释放，移除事件监听 ---
            win.removeEventListener('pointermove', move);
            win.removeEventListener('pointerup', up);
            win.removeEventListener('pointercancel', up);
            win.removeEventListener('pointerdown', down as EventListener);
        }
    };

    down = (e: PointerEvent): void => {
        state.pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        if (state.pointers.size === 2) {
            // --- 双指开始，计算初始距离和中心点 ---
            const pts = Array.from(state.pointers.values());
            state.lastDis = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            state.lastPos = { 'x': (pts[0].x + pts[1].x) / 2, 'y': (pts[0].y + pts[1].y) / 2 };
        }
    };

    // --- 绑定事件 ---
    win.addEventListener('pointermove', move, { 'passive': false });
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', up);
    win.addEventListener('pointerdown', down);
}
