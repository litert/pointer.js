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
import * as utils from './utils';
import { down } from './down';

/**
 * --- 鼠标/手指没移动时，click 才生效 ---
 * --- touch 和 mouse 事件只可能成功绑定一个 ---
 * @param e 事件对象
 * @param handler 回调
 */
export function click(
    e: MouseEvent | TouchEvent,
    handler: (e: MouseEvent | TouchEvent, x: number, y: number) => void | Promise<void>
): void {
    if (utils.hasTouchButMouse(e)) {
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
                handler(ne, nx, ny) as any;
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
export function dblClick(
    e: MouseEvent | TouchEvent,
    handler: (e: MouseEvent | TouchEvent, x: number, y: number) => void | Promise<void>
): void {
    click(e, (ne, x, y) => {
        // --- 判断当前第几次点击 ---
        const now = Date.now();
        if (now - lastDblClickData.time <= 300) {
            // --- 判断位置差别 ---
            const xx = Math.abs(x - lastDblClickData.x);
            const xy = Math.abs(y - lastDblClickData.y);
            if (xx < 10 && xy < 10) {
                // --- 响应双击 ---
                handler(ne, x, y) as any;
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
let lastLongTime: number = 0;

/**
 * --- 绑定长按事件 ---
 * --- touch 和 mouse 事件只可能成功绑定一个 ---
 * @param e 事件原型
 * @param long 长按回调
 */
export function long(e: MouseEvent | TouchEvent, long: (e: MouseEvent | TouchEvent) => void | Promise<void>): void {
    if (utils.hasTouchButMouse(e)) {
        return;
    }
    const { 'x': tx, 'y': ty, } = utils.getEventPos(e);
    let ox = 0, oy = 0, isLong = false;
    let timer: number | undefined = window.setTimeout(() => {
        timer = undefined;
        if (ox <= 1 && oy <= 1) {
            isLong = true;
            Promise.resolve(long(e)).catch((err) => { throw err; });
        }
    }, 300);
    down(e, {
        move: (ne) => {
            const { x, y } = utils.getEventPos(ne);
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
export function allowEvent(e: MouseEvent | TouchEvent | KeyboardEvent): boolean {
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
