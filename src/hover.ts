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
import * as utils from './utils';
import * as types from './types';

/**
 * --- 绑定鼠标移入 -> 移出与手指按下/移出 -> 抬起/移出 等效的事件 ---
 * --- 绑定在 pointerdown、pointerenter 事件中，有防抖不会被重复执行 ---
 * @param oe PointerEvent
 * @param opt 回调选项
 */
export function hover(oe: PointerEvent, opt: types.IHoverOptions): void {
    const el = oe.currentTarget as HTMLElement | null;
    if (!el) {
        return;
    }

    if (utils.isTouch(oe)) {
        // --- down、enter 都视为 enter 事件 ---
        if (el.dataset.pointerHover) {
            // --- 防抖：down 和 enter 同时触发 ---
            return;
        }
        el.dataset.pointerHover = '1';
        opt.enter?.(oe) as any;
        const move = function(e: PointerEvent): void {
            opt.move?.(e) as any;
        };
        const leave = function(e: PointerEvent): void {
            opt.leave?.(e) as any;
            delete el.dataset.pointerHover;
            el.removeEventListener('pointerleave', leave);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', leave);
            window.removeEventListener('pointercancel', leave);
        };
        // --- 绑定事件 ---
        el.addEventListener('pointerleave', leave);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', leave);
        window.addEventListener('pointercancel', leave);
    }
    else {
        // --- down 不能处理 ---
        if (oe.type === 'pointerdown') {
            return;
        }
        opt.enter?.(oe) as any;
        const move = function(e: PointerEvent): void {
            opt.move?.(e) as any;
        };
        const leave = function(e: PointerEvent): void {
            opt.leave?.(e) as any;
            window.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
        };
        window.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
    }
}
