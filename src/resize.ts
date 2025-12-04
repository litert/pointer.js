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
import { move } from './move';

/**
 * --- 绑定拖动改变大小事件 ---
 * @param e pointerdown 的 event
 * @param opt 选项，width, height 当前对象宽高
 */
export function resize(e: PointerEvent, opt: types.IResizeOptions): void {
    const minW = opt.minWidth ?? 0, minH = opt.minHeight ?? 0;
    const { x, y } = utils.getEventPos(e);
    let offsetLeft!: number, offsetTop!: number, offsetRight!: number, offsetBottom!: number;
    let left!: number, top!: number, right!: number, bottom!: number;

    // --- 获取 object 的 x,y 和 w,h 信息 ---
    if (opt.objectLeft === undefined || opt.objectTop === undefined
        || opt.objectWidth === undefined || opt.objectHeight === undefined
    ) {
        if (!opt.object) {
            return;
        }
        const rect = opt.object.getBoundingClientRect();
        opt.objectLeft = rect.left;
        opt.objectTop = rect.top;
        opt.objectWidth = rect.width;
        opt.objectHeight = rect.height;
    }

    const b = opt.border;
    const isRight = b === 'tr' || b === 'r' || b === 'rb';
    const isLeft = b === 'bl' || b === 'l' || b === 'lt';
    const isBottom = b === 'rb' || b === 'b' || b === 'bl';
    const isTop = b === 'lt' || b === 't' || b === 'tr';

    if (isRight) {
        left = opt.objectLeft + minW;
        offsetLeft = offsetRight = x - (opt.objectLeft + opt.objectWidth);
        if (opt.maxWidth) {
            right = opt.objectLeft + opt.maxWidth;
        }
    }
    else if (isLeft) {
        right = opt.objectLeft + opt.objectWidth - minW;
        offsetLeft = offsetRight = x - opt.objectLeft;
        if (opt.maxWidth) {
            left = opt.objectLeft + opt.objectWidth - opt.maxWidth;
        }
    }
    if (isBottom) {
        top = opt.objectTop + minH;
        offsetTop = offsetBottom = y - (opt.objectTop + opt.objectHeight);
        if (opt.maxHeight) {
            bottom = opt.objectTop + opt.maxHeight;
        }
    }
    else if (isTop) {
        bottom = opt.objectTop + opt.objectHeight - minH;
        offsetTop = offsetBottom = y - opt.objectTop;
        if (opt.maxHeight) {
            top = opt.objectTop + opt.objectHeight - opt.maxHeight;
        }
    }
    move(e, {
        'left': left, 'top': top, 'right': right, 'bottom': bottom,
        'offsetLeft': offsetLeft, 'offsetTop': offsetTop, 'offsetRight': offsetRight, 'offsetBottom': offsetBottom,
        'start': opt.start,
        'move': (ne, o) => {
            if (isRight) {
                opt.objectWidth! += o.ox;
            }
            else if (isLeft) {
                opt.objectWidth! -= o.ox;
                opt.objectLeft! += o.ox;
            }
            if (isBottom) {
                opt.objectHeight! += o.oy;
            }
            else if (isTop) {
                opt.objectHeight! -= o.oy;
                opt.objectTop! += o.oy;
            }
            opt.move?.(opt.objectLeft!, opt.objectTop!, opt.objectWidth!, opt.objectHeight!, o.x, o.y, o.border);
        },
        'end': opt.end
    });
}
