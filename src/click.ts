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
import { down } from './down';

/**
 * --- 鼠标/手指没移动时，click 才生效 ---
 * @param e 事件对象
 * @param handler 回调
 */
export function click(
    e: PointerEvent,
    handler: (e: PointerEvent, x: number, y: number) => void | Promise<void>
): void {
    if (e.button > 0) {
        return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const time = Date.now();
    down(e, {
        up: (ne) => {
            if (Date.now() - time >= 250) {
                return;
            }
            const nx = ne.clientX;
            const ny = ne.clientY;
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
 * @param e 事件对象
 * @param handler 回调
 */
export function dblClick(
    e: PointerEvent,
    handler: (e: PointerEvent, x: number, y: number) => void | Promise<void>
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

// --- 全局新增 tap 和 dbltap 事件 ---

document.addEventListener('pointerdown', oe => {
    click(oe, () => {
        // --- 创建 tap 的原生自定义事件 ---
        const tapEvent = new CustomEvent('tap', {
            // --- 让事件可以冒泡 ---
            'bubbles': true,
            // --- 允许阻止默认行为 ---
            'cancelable': true,
            'detail': {
                // --- 把原始点击事件带过去 ---
                'originalEvent': oe,
            },
        });
        // --- 原生和 Vue 的 @tap 监听器此时会捕捉到这个事件 ---
        oe.target?.dispatchEvent(tapEvent);
    });
    dblClick(oe, () => {
        // --- 创建 dbltap 的原生自定义事件 ---
        const dbltapEvent = new CustomEvent('dbltap', {
            // --- 让事件可以冒泡 ---
            'bubbles': true,
            // --- 允许阻止默认行为 ---
            'cancelable': true,
            'detail': {
                // --- 把原始点击事件带过去 ---
                'originalEvent': oe,
            },
        });
        // --- 原生和 Vue 的 @dbltap 监听器此时会捕捉到这个事件 ---
        oe.target?.dispatchEvent(dbltapEvent);
    });
}, true);
