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

// --- Export Types ---
export type {
    TDirection,
    TBorder,
    IDownOptions,
    IMoveDetail,
    IMoveTime,
    IMoveOptions,
    IMoveResult,
    IResizeOptions,
    IDragOptions,
    TScaleHandler,
    TGestureBeforeHandler,
    TGestureHandler
} from './types';

// --- Export Utils ---
export {
    hasTouchButMouse,
    getEventPos,
    getMoveDir
} from './utils';

// --- Export Cursor ---
export { set as setCursor } from './cursor';

// --- Export Core Functions ---
export { down } from './down';
export { move, isMoving } from './move';
export { click, dblClick, long, allowEvent } from './click';
export { resize } from './resize';
export { drag, getData as getDragData, setData as setDragData } from './drag';
export { scale } from './scale';
export { gesture } from './gesture';
