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

/** --- 要传输的 drag data 数据 --- */
let bindDragData: any = undefined;

/**
 * --- 获取当前拖拽数据 ---
 */
export function getData(): any {
    return bindDragData;
}

/**
 * --- 重新绑定 drag 数据 ---
 * @param data 要绑定的数据
 */
export function setData(data?: string | number | boolean | Record<string, any>): void {
    bindDragData = data;
}

/**
 * --- 触发拖拽事件 ---
 */
function dispatchEvent(el: HTMLElement | null, type: string): void {
    el?.dispatchEvent(new CustomEvent(type, { 'detail': { 'value': bindDragData } }));
}

/**
 * --- 绑定拖动 ---
 * @param e 鼠标事件
 * @param el 拖动元素
 * @param opt 参数
 */
export function drag(e: MouseEvent | TouchEvent, el: HTMLElement, opt?: types.IDragOptions): void {
    bindDragData = opt?.data;
    let otop = 0, oleft = 0;
    /** --- 当前拖拽时鼠标悬停的可放置元素 --- */
    let nel: HTMLElement | null = null;

    /** --- 拖拽指示器元素 --- */
    let dragEl: HTMLElement | null = null;

    move(e, {
        'object': el,
        'start': (x, y) => {
            const rect = el.getBoundingClientRect();
            // --- 创建拖拽指示器 ---
            dragEl = document.createElement('div');
            dragEl.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:rgba(0,0,0,0.1);border:1px dashed #666;pointer-events:none;z-index:999999;`;
            document.body.appendChild(dragEl);
            otop = rect.top;
            oleft = rect.left;
            opt?.start?.(x, y);
        },
        'move': (e, o) => {
            otop += o.oy;
            oleft += o.ox;
            if (dragEl) {
                dragEl.style.left = `${oleft}px`;
                dragEl.style.top = `${otop}px`;
            }
            // --- 获取当前 element ---
            const els = document.elementsFromPoint(o.x, o.y) as HTMLElement[];
            for (const item of els) {
                if (item.dataset.drop === undefined || item === el) {
                    continue;
                }
                if (item === nel) {
                    return;
                }
                if (nel) {
                    nel.removeAttribute('data-hover');
                    dispatchEvent(nel, 'dragleave');
                }
                item.dataset.hover = '';
                nel = item;
                dispatchEvent(nel, 'dragenter');
                return;
            }
            // --- not found ---
            if (nel) {
                nel.removeAttribute('data-hover');
                dispatchEvent(nel, 'dragleave');
                nel = null;
            }
            opt?.move?.(e, o);
        },
        'end': (moveTimes, e) => {
            if (dragEl) {
                dragEl.remove();
                dragEl = null;
            }
            if (nel) {
                nel.removeAttribute('data-hover');
                dispatchEvent(nel, 'drop');
            }
            opt?.end?.(moveTimes, e);
            bindDragData = undefined;
        },
    });
}
