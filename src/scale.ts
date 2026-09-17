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

/** --- 每个区域只有一个活动手势，避免每次 pointerdown 重复注册监听 --- */
interface IScaleSession {
    add: (e: PointerEvent) => void;
    dispose: () => void;
}

/** --- 活动区域索引，清理时释放引用 --- */
const sessions = new WeakMap<Element, IScaleSession>();

/** --- 同一个指针只能属于一个手势，避免嵌套区域和相邻区域相互接管 --- */
const owners = new WeakMap<Window, Map<number, IScaleSession>>();

/**
 * --- 判断跨窗口的事件目标是否是元素，不依赖当前窗口的 Element 构造器 ---
 * @param target 事件目标
 * @returns 是否是元素
 */
function isElement(target: EventTarget | null): target is Element {
    return !!target && ('nodeType' in target) && target.nodeType === 1;
}

/**
 * --- 不创建手势时返回同样可调用的清理函数 ---
 * @returns 无返回值
 */
function noop(): void {
    // --- 滚轮或被忽略的事件没有持续监听 ---
}

/**
 * --- 归一化滚轮单位，以始终为正的指数倍率缩放 ---
 * @param e 滚轮事件
 * @param target 手势区域
 * @param handler 缩放回调
 * @returns 无返回值
 */
function scaleWheel(e: WheelEvent, target: Element, handler: types.TScaleHandler): void {
    if (!Number.isFinite(e.deltaY) || !e.deltaY) {
        return;
    }
    const win = target.ownerDocument.defaultView ?? utils.getWindow(e);
    const unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? (target.clientHeight || win.innerHeight) : 1);
    const factor = Math.exp(Math.max(-1, Math.min(1, -e.deltaY * unit * 0.002)));
    const center = { 'x': e.clientX, 'y': e.clientY };
    if (e.cancelable) {
        e.preventDefault();
    }
    const pending = handler(e, factor, { 'x': 0, 'y': 0 }, {
        'mode': 'wheel', 'center': center, 'previousCenter': { ...center }, 'pointers': 0
    });
    pending?.catch((error: unknown) => {
        win.setTimeout(() => { throw error; }, 0);
    });
}

/**
 * --- 从 pointerdown / wheel 开始平移缩放；同一区域的多指按下共用一个会话 ---
 * @param oe 起始事件；触屏区域需预先设置 touch-action: none
 * @param handler 增量倍率、中心位移和几何信息的回调
 * @param opt 区域、取消信号及生命周期通知
 * @returns 幂等清理函数；用于主动结束手势或控件卸载
 */
export function scale(
    oe: PointerEvent | WheelEvent, handler: types.TScaleHandler, opt: types.IScaleOptions = {}
): () => void {
    const candidate = opt.target ?? (isElement(oe.currentTarget) ? oe.currentTarget : oe.target);
    if (!isElement(candidate) || opt.signal?.aborted) {
        return noop;
    }
    const target = candidate;
    if (oe.type === 'wheel') {
        scaleWheel(oe as WheelEvent, target, handler);
        return noop;
    }
    const first = oe as PointerEvent;
    if (oe.type !== 'pointerdown' || first.button !== 0) {
        return noop;
    }
    if (!oe.composedPath().includes(target) && (!isElement(oe.target) || !target.contains(oe.target))) {
        return noop;
    }
    const win = target.ownerDocument.defaultView ?? utils.getWindow(oe);
    const pointerOwners = owners.get(win) ?? new Map<number, IScaleSession>();
    if (!owners.has(win)) {
        owners.set(win, pointerOwners);
    }
    const existing = sessions.get(target);
    if (existing) {
        existing.add(first);
        return existing.dispose;
    }
    if (pointerOwners.has(first.pointerId)) {
        return noop;
    }

    /** --- Map 插入顺序保持双指组合稳定；额外指针只在前面的指针离开后接替 --- */
    const pointers = new Map<number, types.IScalePoint>();
    let previousCenter: types.IScalePoint = { 'x': first.clientX, 'y': first.clientY };
    let previousDistance = 0;
    let active = true;
    const session: IScaleSession = {
        'add': add,
        'dispose': (): void => { finish('dispose'); }
    };

    /** --- 指针加入/离开后重置基线，避免 1/2/3 指切换时画面跳动 --- */
    const geometry = (): { 'center': types.IScalePoint; 'distance': number; } => {
        const points = pointers.values();
        const a = points.next().value ?? previousCenter;
        const b = points.next().value;
        return b ? {
            'center': { 'x': (a.x + b.x) / 2, 'y': (a.y + b.y) / 2 },
            'distance': Math.hypot(a.x - b.x, a.y - b.y)
        } : { 'center': { ...a }, 'distance': 0 };
    };
    const rebase = (): void => {
        const next = geometry();
        previousCenter = next.center;
        previousDistance = next.distance;
    };

    function finish(reason: types.TScaleEndReason, e?: Event): void {
        if (!active) {
            return;
        }
        active = false;
        win.removeEventListener('pointermove', move);
        win.removeEventListener('pointerup', up);
        win.removeEventListener('pointercancel', cancel);
        win.removeEventListener('pointerdown', add);
        win.removeEventListener('blur', blur);
        opt.signal?.removeEventListener('abort', abort);
        sessions.delete(target);
        for (const id of pointers.keys()) {
            pointerOwners.delete(id);
        }
        pointers.clear();
        try {
            if (e?.type === 'pointerup') {
                opt.onPointers?.(e as PointerEvent, 0);
            }
        }
        finally {
            opt.onEnd?.(e, reason);
        }
    }

    const notifyPointers = (e: PointerEvent): void => {
        try {
            opt.onPointers?.(e, pointers.size);
        }
        catch (error) {
            finish('cancel', e);
            throw error;
        }
    };

    function add(e: PointerEvent): void {
        if (!active || e.button !== 0 || pointers.has(e.pointerId) || pointerOwners.has(e.pointerId)) {
            return;
        }
        /** --- 使用事件路径兼容 Shadow DOM；区域外的新指针不能加入 --- */
        if (!e.composedPath().includes(target) && (!isElement(e.target) || !target.contains(e.target))) {
            return;
        }
        pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        pointerOwners.set(e.pointerId, session);
        rebase();
        notifyPointers(e);
    }

    function move(e: PointerEvent): void {
        if (!active || !pointers.has(e.pointerId)) {
            return;
        }
        pointers.set(e.pointerId, { 'x': e.clientX, 'y': e.clientY });
        const next = geometry();
        const cpos = { 'x': next.center.x - previousCenter.x, 'y': next.center.y - previousCenter.y };
        const factor = previousDistance > 0 && next.distance > 0 ? next.distance / previousDistance : 1;
        const detail: types.IScaleDetail = {
            'mode': pointers.size > 1 ? 'pinch' : 'pan',
            'center': next.center, 'previousCenter': previousCenter, 'pointers': pointers.size
        };
        previousCenter = next.center;
        previousDistance = next.distance;
        if (!cpos.x && !cpos.y && factor === 1) {
            return;
        }
        if (e.cancelable) {
            e.preventDefault();
        }
        try {
            const pending = handler(e, factor, cpos, detail);
            if (pending) {
                pending.catch((error: unknown) => {
                    finish('cancel', e);
                    win.setTimeout(() => { throw error; }, 0);
                });
            }
        }
        catch (error) {
            finish('cancel', e);
            throw error;
        }
    }

    function up(e: PointerEvent): void {
        if (!active || !pointers.delete(e.pointerId)) {
            return;
        }
        pointerOwners.delete(e.pointerId);
        if (!pointers.size) {
            finish('up', e);
            return;
        }
        rebase();
        notifyPointers(e);
    }
    function cancel(e: PointerEvent): void {
        if (pointers.has(e.pointerId)) {
            finish('cancel', e);
        }
    }
    function blur(e: Event): void { finish('blur', e); }
    function abort(): void { finish('abort'); }
    sessions.set(target, session);
    win.addEventListener('pointermove', move, { 'passive': false });
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', cancel);
    win.addEventListener('pointerdown', add);
    win.addEventListener('blur', blur);
    opt.signal?.addEventListener('abort', abort, { 'once': true });
    add(first);
    return session.dispose;
}
