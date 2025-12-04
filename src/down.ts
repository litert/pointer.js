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
import * as utils from './utils';

/**
 * --- 绑定按下以及弹起事件 ---
 * @param oe PointerEvent
 * @param opt 回调选项
 */
export function down(oe: PointerEvent, opt: types.IDownOptions): void {
    /** --- 目标元素 --- */
    const target = oe.target as HTMLElement;
    let { 'x': ox, 'y': oy } = utils.getEventPos(oe);
    let isStart = false;

    let end: ((e: PointerEvent) => void) | undefined = undefined;
    const move = function(e: PointerEvent): void {
        if ((!e.target || !document.body.contains(e.target as HTMLElement)) && e.cancelable) {
            e.preventDefault();
        }
        const { x, y } = utils.getEventPos(e);
        if (x === ox && y === oy) {
            return;
        }
        const dir = utils.getMoveDir(x - ox, y - oy);
        ox = x;
        oy = y;
        if (!isStart) {
            isStart = true;
            if (opt.start?.(e) === false) {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', end as EventListener);
                window.removeEventListener('pointercancel', end as EventListener);
                return;
            }
        }
        if (opt.move?.(e, dir) === false) {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end as EventListener);
            window.removeEventListener('pointercancel', end as EventListener);
        }
    };

    end = function(e: PointerEvent): void {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end as EventListener);
        window.removeEventListener('pointercancel', end as EventListener);
        opt.up?.(e) as any;
        if (isStart) {
            opt.end?.(e) as any;
        }
    };

    // --- 捕获指针以确保即使指针离开元素也能接收事件 ---
    target?.setPointerCapture?.(oe.pointerId);
    window.addEventListener('pointermove', move, { 'passive': false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    opt.down?.(oe);
}
