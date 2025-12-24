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

/** --- 最后一次长按触发的时间 --- */
let lastLongTime: number = 0;

/**
 * --- 绑定长按事件 ---
 * @param e 事件原型
 * @param long 长按回调
 * @param opt 选项
 */
export function long(e: PointerEvent, long: (e: PointerEvent) => void | Promise<void>, opt?: types.ILongOptions): void {
    const { 'x': tx, 'y': ty, } = utils.getEventPos(e);
    const win = utils.getWindow(e);
    let ox = 0, oy = 0, isLong = false;
    let timer: number | undefined = win.setTimeout(() => {
        timer = undefined;
        if (ox <= 1 && oy <= 1) {
            isLong = true;
            Promise.resolve(long(e)).catch((err) => { throw err; });
        }
    }, opt?.time ?? 300);
    down(e, {
        down: opt?.down,
        move: (ne) => {
            const { x, y } = utils.getEventPos(ne);
            ox = Math.abs(x - tx);
            oy = Math.abs(y - ty);
        },
        up: () => {
            opt?.up?.(e) as any;
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

/**
 * --- 判断是否允许事件通过（检查是否被禁用） ---
 * @param e 事件对象
 * @returns true 允许，false 不允许
 */
export function allowEvent(e: PointerEvent | KeyboardEvent): boolean {
    const now = Date.now();
    if (now - lastLongTime < 5) {
        // --- 防抖处理，刚刚结束了 long 的所有事件不响应 ---
        return false;
    }
    const current = e.currentTarget as HTMLElement;
    if (utils.isDisabled(current)) {
        return false;
    }
    return true;
}
