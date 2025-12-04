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
 * --- 绑定按下以及弹起事件，touch 和 mouse 事件只可能成功绑定一个 ---
 * @param oe MouseEvent | TouchEvent
 * @param opt 回调选项
 */
export function down<T extends MouseEvent | TouchEvent>(oe: T, opt: types.IDownOptions<T>): void {
    if (utils.hasTouchButMouse(oe)) {
        return;
    }
    const isMouse = oe instanceof MouseEvent;
    /** --- 目标元素 --- */
    const target = oe.target as HTMLElement;
    let { 'x': ox, 'y': oy } = utils.getEventPos(oe);
    let isStart = false;

    let end: (<TU extends T>(e: TU) => void) | undefined = undefined;
    const move = function<TU extends T>(e: TU): void {
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
                if (isMouse) {
                    window.removeEventListener('mousemove', move as EventListener);
                    window.removeEventListener('mouseup', end as EventListener);
                }
                else if (target) {
                    target.removeEventListener('touchmove', move as EventListener);
                    target.removeEventListener('touchend', end as EventListener);
                    target.removeEventListener('touchcancel', end as EventListener);
                }
                return;
            }
        }
        if (opt.move?.(e, dir) === false) {
            if (isMouse) {
                window.removeEventListener('mousemove', move as EventListener);
                window.removeEventListener('mouseup', end as EventListener);
            }
            else if (target) {
                target.removeEventListener('touchmove', move as EventListener);
                target.removeEventListener('touchend', end as EventListener);
                target.removeEventListener('touchcancel', end as EventListener);
            }
        }
    };

    end = function<TU extends T>(e: TU): void {
        if (isMouse) {
            window.removeEventListener('mousemove', move as EventListener);
            window.removeEventListener('mouseup', end as EventListener);
        }
        else if (target) {
            target.removeEventListener('touchmove', move as EventListener);
            target.removeEventListener('touchend', end as EventListener);
            target.removeEventListener('touchcancel', end as EventListener);
        }
        opt.up?.(e) as any;
        if (isStart) {
            opt.end?.(e) as any;
        }
    };

    if (isMouse) {
        window.addEventListener('mousemove', move as (e: MouseEvent) => void, { 'passive': false });
        window.addEventListener('mouseup', end as (e: MouseEvent) => void);
    }
    else {
        target.addEventListener('touchmove', move as (e: TouchEvent) => void, { 'passive': false });
        target.addEventListener('touchend', end as (e: TouchEvent) => void);
        target.addEventListener('touchcancel', end as (e: TouchEvent) => void);
    }
    opt.down?.(oe);
}
