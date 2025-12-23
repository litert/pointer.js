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
import * as cursor from './cursor';
import { down } from './down';

/** --- 目前是否正在拖动 --- */
export let isMoving: boolean = false;

/** --- 全局钩子列表 --- */
const hooks: {
    'down': types.TMoveDownHook[];
    'up': types.TMoveUpHook[];
} = {
    'down': [],
    'up': [],
};

/**
 * --- 添加全局钩子 ---
 * @param event 事件
 * @param hook 钩子函数
 */
export function addHook(
    event: 'down', hook: types.TMoveDownHook
): void;
export function addHook(
    event: 'up', hook: types.TMoveUpHook
): void;
export function addHook(
    event: 'down' | 'up', hook: types.TMoveDownHook | types.TMoveUpHook
): void {
    hooks[event].push(hook);
}

/** --- 移动全局钩子 --- */
export function removeHook(
    event: 'down', hook: types.TMoveDownHook
): void;
export function removeHook(
    event: 'up', hook: types.TMoveUpHook
): void;
export function removeHook(
    event: 'down' | 'up', hook: types.TMoveDownHook | types.TMoveUpHook
): void {
    const index = hooks[event].indexOf(hook);
    if (index !== -1) {
        hooks[event].splice(index, 1);
    }
}

/**
 * --- 计算边界限制后的坐标 ---
 * --- 用于在拖动过程中限制元素位置不超过指定的边界范围 ---
 * @param val 当前坐标
 * @param prevVal 上一次坐标
 * @param nowMin 当前理论最小边界位置
 * @param nowMax 当前理论最大边界位置
 * @param min 最小边界
 * @param max 最大边界
 * @param offsetMin 最小偏移
 * @param offsetMax 最大偏移
 * @returns 返回经过边界限制后的坐标信息
 */
function clampToBorder(
    val: number, prevVal: number,
    nowMin: number, nowMax: number,
    min: number, max: number,
    offsetMin: number, offsetMax: number
): {
        /** --- 经过边界限制后的坐标值 --- */
        'val': number;
        /** --- 是否到达最小边界 --- */
        'atMin': boolean;
        /** --- 是否到达最大边界 --- */
        'atMax': boolean;
    } {
    let atMin = false, atMax = false;
    if (nowMin <= min) {
        atMin = true;
        if (nowMin < min && val < prevVal) {
            val = (prevVal - offsetMin > min) ? min + offsetMin : prevVal;
        }
    }
    else if (offsetMax !== 0) {
        if (nowMax >= max) {
            atMax = true;
            if (nowMax > max && val > prevVal) {
                val = (prevVal + offsetMax < max) ? max - offsetMax : prevVal;
            }
        }
    }
    else {
        const m1 = max - 1;
        if (val >= m1) {
            atMax = true;
            if (val > m1 && val > prevVal) {
                val = (prevVal < m1) ? m1 : prevVal;
            }
        }
    }
    return { 'val': val, 'atMin': atMin, 'atMax': atMax };
}

/**
 * --- 计算边界类型 ---
 * --- 用于根据当前位置和边界信息确定具体的边界位置类型，用于调整大小或拖动时的光标显示 ---
 * @param inTop 是否在顶部边界
 * @param inRight 是否在右侧边界
 * @param inBottom 是否在底部边界
 * @param inLeft 是否在左侧边界
 * @param x 当前 X 坐标
 * @param y 当前 Y 坐标
 * @param left 边界左侧位置
 * @param top 边界顶部位置
 * @param right 边界右侧位置
 * @param bottom 边界底部位置
 * @returns 返回边界类型，如 'lt'(左上), 'tr'(右上), 't'(上), 'r'(右), 'rb'(右下), 'b'(下), 'bl'(左下), 'l'(左), ''(不在边界)
 */
function calcBorderType(
    inTop: boolean, inRight: boolean, inBottom: boolean, inLeft: boolean,
    x: number, y: number,
    left: number, top: number, right: number, bottom: number
): types.TBorder {
    // --- 同时触碰两个相邻边界时直接返回角类型 ---
    if (inTop && inLeft) {
        return 'lt';
    }
    if (inTop && inRight) {
        return 'tr';
    }
    if (inBottom && inRight) {
        return 'rb';
    }
    if (inBottom && inLeft) {
        return 'bl';
    }
    // --- 只触碰单边时使用鼠标位置 20px 容差判断是否靠近角 ---
    if (inTop) {
        return (x - left <= 20) ? 'lt' : (right - x <= 20) ? 'tr' : 't';
    }
    if (inRight) {
        return (y - top <= 20) ? 'tr' : (bottom - y <= 20) ? 'rb' : 'r';
    }
    if (inBottom) {
        return (right - x <= 20) ? 'rb' : (x - left <= 20) ? 'bl' : 'b';
    }
    if (inLeft) {
        return (y - top <= 20) ? 'lt' : (bottom - y <= 20) ? 'bl' : 'l';
    }
    return '';
}

/**
 * --- 绑定拖动事件 ---
 * @param e pointerdown 的 event
 * @param opt 回调选项
 */
export function move(e: PointerEvent, opt: types.IMoveOptions): types.IMoveResult {
    isMoving = true;
    cursor.set(opt.cursor ?? getComputedStyle(e.target as Element).cursor);
    let { x: tx, y: ty } = utils.getEventPos(e);

    // --- 计算边界 ---
    let left: number, top: number, right: number, bottom: number;
    const win = utils.getWindow(e);
    if (opt.areaObject) {
        const areaRect = opt.areaObject.getBoundingClientRect();
        const s = getComputedStyle(opt.areaObject);
        left = areaRect.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
        top = areaRect.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
        right = areaRect.left + areaRect.width - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
        bottom = areaRect.top + areaRect.height - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
    }
    else {
        left = opt.left ?? 0;
        top = opt.top ?? 0;
        right = opt.right ?? win.innerWidth;
        bottom = opt.bottom ?? win.innerHeight;
    }
    left += opt.offsetLeft ?? 0;
    top += opt.offsetTop ?? 0;
    right += opt.offsetRight ?? 0;
    bottom += opt.offsetBottom ?? 0;

    let isBorder = false;
    let objectLeft = 0, objectTop = 0, objectWidth = 0, objectHeight = 0;
    let offsetLeft = 0, offsetTop = 0, offsetRight = 0, offsetBottom = 0;
    const moveTimes: types.IMoveTime[] = [];

    // --- 执行全局 down 钩子 ---
    for (const hook of hooks.down) {
        hook(e, opt) as any;
    }
    down(e, {
        start: () => {
            if (opt.start?.(tx, ty) === false) {
                cursor.set();
                return false;
            }
            if (opt.object) {
                const rect = opt.object.getBoundingClientRect();
                objectLeft = rect.left;
                objectTop = rect.top;
                objectWidth = rect.width;
                objectHeight = rect.height;
            }
            else {
                objectLeft = opt.objectLeft ?? 0;
                objectTop = opt.objectTop ?? 0;
                objectWidth = opt.objectWidth ?? 0;
                objectHeight = opt.objectHeight ?? 0;
            }
            if (objectWidth > 0) {
                offsetLeft = tx - objectLeft;
            }
            if (objectHeight > 0) {
                offsetTop = ty - objectTop;
            }
            offsetRight = objectWidth - offsetLeft;
            offsetBottom = objectHeight - offsetTop;
        },
        move: (ne, dir) => {
            let { x, y } = utils.getEventPos(ne);
            if (x === tx && y === ty) {
                return;
            }
            // --- 边界检测 ---
            /** --- 检测横轴 --- */
            const xResult = clampToBorder(x, tx, x - offsetLeft, x + offsetRight, left, right, offsetLeft, offsetRight);
            /** --- 检测纵轴 --- */
            const yResult = clampToBorder(y, ty, y - offsetTop, y + offsetBottom, top, bottom, offsetTop, offsetBottom);
            x = xResult.val;
            y = yResult.val;
            const inBorderLeft = xResult.atMin, inBorderRight = xResult.atMax;
            const inBorderTop = yResult.atMin, inBorderBottom = yResult.atMax;
            /** --- 在任意一个边界上 --- */
            const anyBorder = inBorderTop || inBorderRight || inBorderBottom || inBorderLeft;
            const border = anyBorder ?
                calcBorderType(
                    inBorderTop, inBorderRight, inBorderBottom, inBorderLeft, x, y, left, top, right, bottom
                ) : '';
            if (anyBorder) {
                if (!isBorder) {
                    isBorder = true;
                    opt.borderIn?.(x, y, border, ne);
                }
            }
            else if (isBorder) {
                isBorder = false;
                opt.borderOut?.();
            }
            const ox = x - tx, oy = y - ty;
            moveTimes.push({ 'time': Date.now(), 'ox': ox, 'oy': oy });
            opt.move?.(ne, {
                'ox': ox, 'oy': oy, 'x': x, 'y': y, 'border': border,
                'inBorder': { 'top': inBorderTop, 'right': inBorderRight, 'bottom': inBorderBottom, 'left': inBorderLeft },
                'dir': dir
            });
            tx = x;
            ty = y;
        },
        up: ne => {
            isMoving = false;
            cursor.set();
            // --- 执行全局 up 钩子 ---
            for (const hook of hooks.up) {
                hook(e, opt) as any;
            }
            opt.up?.(moveTimes, ne);
        },
        end: ne => {
            opt.end?.(moveTimes, ne);
        }
    });

    return { 'left': left, 'top': top, 'right': right, 'bottom': bottom };
}
