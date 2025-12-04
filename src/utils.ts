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

import * as types from './types';

// ----------------------
// ------- 工具函数 ------
// ----------------------

/** --- 最后一次 touchstart 的时间戳 --- */
let lastTouchTime: number = 0;

// --- 添加 touchstart 事件，既优化了点击行为，也记录了 touch 的时间戳信息 ---
if (typeof document !== 'undefined') {
    document.addEventListener('touchstart', function() {
        lastTouchTime = Date.now();
    }, {
        'passive': true
    });
}

/**
 * --- 判断当前的事件是否是含有 touch 的设备触发的，如果当前就是 touch 则直接返回 false（false 代表 OK，true 代表 touch 设备却触发了 mouse 事件） ---
 * @param e 事件对象
 */
export function hasTouchButMouse(e: MouseEvent | TouchEvent | PointerEvent): boolean {
    if (e instanceof TouchEvent || e.type === 'touchstart') {
        return false;
    }
    if (((e as any).pointerType === 'touch') && (e.type === 'contextmenu')) {
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
export function getEventPos(e: MouseEvent | TouchEvent, type: 'client' | 'changed' = 'client'): { 'x': number; 'y': number; } {
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
export function getMoveDir(dx: number, dy: number): types.TDirection {
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
export function isDisabled(el: HTMLElement | null): boolean {
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
