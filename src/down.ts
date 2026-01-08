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

/**
 * --- 绑定按下以及弹起事件 ---
 * @param oe PointerEvent，非必要勿绑定 MouseEvent
 * @param opt 回调选项
 */
export function down<T extends PointerEvent | MouseEvent>(oe: T, opt: types.IDownOptions<T>): void {
    const win = utils.getWindow(oe);
    let { 'x': ox, 'y': oy } = utils.getEventPos(oe);
    /** --- 是否已经触发过 start 事件 --- */
    let isStart = false;
    /** --- 是否为 PointerEvent --- */
    const isPointer = oe.type.startsWith('pointer');

    let end: ((e: T) => void) | undefined = undefined;
    const move = function(e: T): void {
        // --- 检查元素是否还在文档中 ---
        if (
            (!e.target || !(e.target as HTMLElement).ownerDocument.body.contains(e.target as HTMLElement))
            && e.cancelable
        ) {
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
                if (isPointer) {
                    win.removeEventListener('pointermove', move as EventListener);
                    win.removeEventListener('pointerup', end as EventListener);
                    win.removeEventListener('pointercancel', end as EventListener);
                }
                else {
                    win.removeEventListener('mousemove', move as EventListener);
                    win.removeEventListener('mouseup', end as EventListener);
                }
                return;
            }
        }
        if (opt.move?.(e, dir) === false) {
            if (isPointer) {
                win.removeEventListener('pointermove', move as EventListener);
                win.removeEventListener('pointerup', end as EventListener);
                win.removeEventListener('pointercancel', end as EventListener);
            }
            else {
                win.removeEventListener('mousemove', move as EventListener);
                win.removeEventListener('mouseup', end as EventListener);
            }
        }
    };

    end = function(e: T): void {
        if (isPointer) {
            win.removeEventListener('pointermove', move as EventListener);
            win.removeEventListener('pointerup', end as EventListener);
            win.removeEventListener('pointercancel', end as EventListener);
        }
        else {
            win.removeEventListener('mousemove', move as EventListener);
            win.removeEventListener('mouseup', end as EventListener);
        }
        opt.up?.(e) as any;
        if (isStart) {
            opt.end?.(e) as any;
        }
    };

    // --- 捕获指针以确保即使指针离开元素也能接收事件 ---
    if (isPointer) {
        win.addEventListener('pointermove', move as EventListener, { 'passive': false });
        win.addEventListener('pointerup', end as EventListener);
        win.addEventListener('pointercancel', end as EventListener);
    }
    else {
        win.addEventListener('mousemove', move as EventListener, { 'passive': false });
        win.addEventListener('mouseup', end as EventListener);
    }
    opt.down?.(oe) as any;
}
