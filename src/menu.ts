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
import { long } from './long';
import { down } from './down';

/**
 * --- 右键菜单事件，电脑触发 contextmenu、手机触发长按 ---
 * --- 绑定在 pointerdown 事件中，会自动阻断默认的菜单 ---
 * @param oe PointerEvent
 * @param handler 回调函数
 */
export function menu(oe: PointerEvent, handler: types.TMenuHandler): void {
    const win = utils.getWindow(oe);
    // --- 鼠标动态绑定 contextmenu 事件触发 ---
    if (utils.isTouch(oe)) {
        // --- 触摸设备使用 long 库长按触发 ---
        const contextMenuHandler = (e: MouseEvent): void => {
            e.preventDefault();
        };
        win.addEventListener('contextmenu', contextMenuHandler);
        long(oe, handler, {
            up: async () => {
                // --- 必须等待一下，因为本次 up 可能就是被 contextmenu 中断导致触发的 ---
                await utils.sleep(34, win);
                win.removeEventListener('contextmenu', contextMenuHandler);
            }
        });
        return;
    }
    // --- 鼠标动态绑定 contextmenu 事件触发 ---
    if (oe.button !== 2) {
        return;
    }
    const contextMenuHandler = (e: MouseEvent): void => {
        e.preventDefault();
        handler(e) as any;
    };
    down(oe, {
        up: async () => {
            // --- 必须等待一下，因为本次 up 可能就是被 contextmenu 中断导致触发的 ---
            await utils.sleep(34, win);
            win.removeEventListener('contextmenu', contextMenuHandler);
        }
    });
    win.addEventListener('contextmenu', contextMenuHandler);
}
