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

// ----------------------
// ------- Types --------
// ----------------------

/** --- 方向类型 --- */
export type TDirection = 'top' | 'right' | 'bottom' | 'left';

/** --- 边界方向类型，从左上开始 --- */
export type TBorder = 'lt' | 't' | 'tr' | 'r' | 'rb' | 'b' | 'bl' | 'l' | '';

/** --- hover 选项 --- */
export interface IHoverOptions {
    enter?: (e: PointerEvent) => void | Promise<void>;
    move?: (e: PointerEvent) => void | Promise<void>;
    leave?: (e: PointerEvent) => void | Promise<void>;
}

/** --- down 选项 --- */
export interface IDownOptions<T extends PointerEvent | MouseEvent> {
    down?: (e: T) => void | Promise<void>;
    start?: (e: T) => any;
    move?: (e: T, dir: TDirection) => any;
    /** --- 必有 up（包括 cancel） --- */
    up?: (e: T) => void | Promise<void>;
    /** --- 有 start 才有 end --- */
    end?: (e: T) => void | Promise<void>;
}

/** --- long 选项 --- */
export interface ILongOptions<T extends PointerEvent | MouseEvent> {
    /** --- 长按时间，默认 300 ms --- */
    'time'?: number;
    down?: (e: T) => void | Promise<void>;
    up?: (e: T) => void | Promise<void>;
}

/** --- move 回调参数 --- */
export interface IMoveDetail {
    /** --- x 轴偏移量 --- */
    'ox': number;
    /** --- y 轴偏移量 --- */
    'oy': number;
    /** --- 当前 x 坐标 --- */
    'x': number;
    /** --- 当前 y 坐标 --- */
    'y': number;
    /** --- 边界类型 --- */
    'border': TBorder;
    /** --- 是否在边界 --- */
    'inBorder': {
        'top': boolean;
        'right': boolean;
        'bottom': boolean;
        'left': boolean;
    };
    /** --- 移动方向 --- */
    'dir': TDirection;
}

/** --- 移动时间记录 --- */
export interface IMoveTime {
    'time': number;
    'ox': number;
    'oy': number;
}

/** --- move 选项 --- */
export interface IMoveOptions {
    /** --- 限制区域元素 --- */
    'areaObject'?: HTMLElement;
    /** --- 左边界 --- */
    'left'?: number;
    /** --- 上边界 --- */
    'top'?: number;
    /** --- 右边界 --- */
    'right'?: number;
    /** --- 下边界 --- */
    'bottom'?: number;
    /** --- 左边界偏移 --- */
    'offsetLeft'?: number;
    /** --- 上边界偏移 --- */
    'offsetTop'?: number;
    /** --- 右边界偏移 --- */
    'offsetRight'?: number;
    /** --- 下边界偏移 --- */
    'offsetBottom'?: number;
    /** --- 对象左坐标 --- */
    'objectLeft'?: number;
    /** --- 对象上坐标 --- */
    'objectTop'?: number;
    /** --- 对象宽度 --- */
    'objectWidth'?: number;
    /** --- 对象高度 --- */
    'objectHeight'?: number;
    /** --- 拖拽对象 --- */
    'object'?: HTMLElement;
    /** --- 光标样式 --- */
    'cursor'?: string;
    /** --- 开始回调 --- */
    start?: (x: number, y: number) => any;
    /** --- 移动回调 --- */
    move?: (e: PointerEvent, detail: IMoveDetail) => void;
    /** --- 进入边界回调 --- */
    borderIn?: (x: number, y: number, border: TBorder, e: PointerEvent) => void;
    /** --- 离开边界回调 --- */
    borderOut?: () => void;
    /** --- 鼠标抬起回调 --- */
    up?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
    /** --- 结束回调 --- */
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}

/** --- move 返回值 --- */
export interface IMoveResult {
    'left': number;
    'top': number;
    'right': number;
    'bottom': number;
}

/** --- resize 选项 --- */
export interface IResizeOptions {
    /** --- 边界方向 --- */
    'border': TBorder;
    /** --- 最小宽度 --- */
    'minWidth'?: number;
    /** --- 最小高度 --- */
    'minHeight'?: number;
    /** --- 最大宽度 --- */
    'maxWidth'?: number;
    /** --- 最大高度 --- */
    'maxHeight'?: number;
    /** --- 对象元素 --- */
    'object'?: HTMLElement;
    /** --- 对象左坐标 --- */
    'objectLeft'?: number;
    /** --- 对象上坐标 --- */
    'objectTop'?: number;
    /** --- 对象宽度 --- */
    'objectWidth'?: number;
    /** --- 对象高度 --- */
    'objectHeight'?: number;
    /** --- 开始回调 --- */
    start?: (x: number, y: number) => any;
    /** --- 移动回调 --- */
    move?: (left: number, top: number, width: number, height: number, x: number, y: number, border: TBorder) => void;
    /** --- 结束回调 --- */
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}

/** --- drag 选项 --- */
export interface IDragOptions {
    /** --- 拖拽元素 --- */
    'data'?: any;
    /** --- 开始回调 --- */
    start?: (x: number, y: number) => any;
    /** --- 移动回调 --- */
    move?: (e: PointerEvent, detail: IMoveDetail) => void;
    /** --- 结束回调 --- */
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}

/** --- scale 回调函数类型 --- */
export type TScaleHandler = (e: PointerEvent | WheelEvent, scale: number, cpos: { 'x': number; 'y': number; }) => void | Promise<void>;

/** --- gesture before 回调函数类型，返回 1 显示 gesture，0 不处理，-1 stopPropagation --- */
export type TGestureBeforeHandler = (e: PointerEvent | WheelEvent, dir: TDirection) => number;

/** --- gesture handler 回调函数类型 --- */
export type TGestureHandler = (dir: TDirection) => void | Promise<void>;

/** --- menu handler 回调函数类型 --- */
export type TMenuHandler = (e: PointerEvent | MouseEvent) => void | Promise<void>;

/** --- move down 全局钩子函数类型 --- */
export type TMoveDownHook = (e: PointerEvent, opt: IMoveOptions) => void | Promise<void>;

/** --- move up 全局钩子函数类型 --- */
export type TMoveUpHook = (e: PointerEvent, opt: IMoveOptions) => void | Promise<void>;
