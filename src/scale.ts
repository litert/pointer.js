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
import { move } from './move';

/**
 * --- 绑定缩放，要绑定到 mousedown、touchstart、touchmove、touchend、wheel 上 ---
 * @param oe 触发的事件
 * @param handler 回调函数
 */
export function scale(oe: MouseEvent | TouchEvent | WheelEvent, handler: types.TScaleHandler): void {
    const el = oe.currentTarget as HTMLElement;
    if (!el) {
        return;
    }
    if (oe instanceof TouchEvent) {
        // --- 指头 ---
        if (oe.type === 'touchend') {
            if (!oe.touches.length) {
                el.removeAttribute('data-scale');
            }
            return;
        }
        const t0 = oe.touches[0], t1 = oe.touches[1];
        const ex = [t0.clientX, t1?.clientX ?? -1000];
        const ey = [t0.clientY, t1?.clientY ?? -1000];
        const hasTwoFingers = ex[1] !== -1000;
        const ndis = hasTwoFingers ? Math.hypot(ex[0] - ex[1], ey[0] - ey[1]) : 0;
        const epos = hasTwoFingers
            ? { 'x': (ex[0] + ex[1]) / 2, 'y': (ey[0] + ey[1]) / 2 }
            : { 'x': ex[0], 'y': ey[0] };
        if (el.dataset.scale === undefined) {
            el.dataset.scale = JSON.stringify({ 'dis': ndis, 'x': ex, 'y': ey, 'pos': epos });
            return;
        }
        const d = JSON.parse(el.dataset.scale);
        const notchange = hasTwoFingers !== (d.x[1] !== -1000);
        const scale = (ndis > 0 && d.dis > 0) ? ndis / d.dis : 1;
        handler(oe, scale, {
            'x': notchange ? 0 : epos.x - d.pos.x,
            'y': notchange ? 0 : epos.y - d.pos.y
        }) as any;
        el.dataset.scale = JSON.stringify({ 'dis': ndis, 'x': ex, 'y': ey, 'pos': epos });
        return;
    }
    if (oe instanceof WheelEvent) {
        if (!oe.deltaY) {
            return;
        }
        const delta = Math.abs(oe.deltaY);
        const zoomFactor = delta * (delta > 50 ? 0.0015 : 0.003);
        handler(oe, oe.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor, { 'x': 0, 'y': 0 }) as any;
        return;
    }
    // --- 纯鼠标拖动 ---
    move(oe, {
        'move': (e, opt) => {
            handler(oe, 1, { 'x': opt.ox, 'y': opt.oy }) as any;
        }
    });
}
