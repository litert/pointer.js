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

// ----------------------
// ------- 工具函数 ------
// ----------------------

/**
 * --- 简单的 sleep 工具函数 ---
 * @param ms 毫秒数
 * @param win 可选的 window 对象，默认为当前 window
 */
export function sleep(ms: number, win: Window = window): Promise<void> {
    return new Promise(resolve => win.setTimeout(resolve, ms));
}

/**
 * --- 判断当前是否是触摸指针类型 ---
 * @param e 事件对象
 */
export function isTouch(e: PointerEvent | MouseEvent): boolean {
    if (!(e instanceof PointerEvent)) {
        return false;
    }
    return e.pointerType === 'touch';
}

/**
 * --- 从事件中获取坐标 ---
 * @param e 事件对象
 */
export function getEventPos(e: PointerEvent | MouseEvent): { 'x': number; 'y': number; } {
    return { 'x': e.clientX, 'y': e.clientY };
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

/**
 * --- 获取事件或元素所属的 window 对象 ---
 * @param e 事件或元素
 */
export function getWindow(e: PointerEvent | MouseEvent | HTMLElement): Window {
    // --- 优先判断 view 属性 (PointerEvent) ---
    // if (e instanceof PointerEvent) { // --- 不能用 instanceof，因为可能跨 iframe ---
    if (('view' in e) && e.view) {
        return e.view;
    }
    // --- 其次判断 ownerDocument (HTMLElement) ---
    if ('ownerDocument' in e && e.ownerDocument) {
        return e.ownerDocument.defaultView ?? window;
    }
    return window;
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
