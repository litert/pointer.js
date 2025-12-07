# @litert/pointer

<p align="center">
    <a href="https://github.com/litert/pointer.js/blob/main/LICENSE">
        <img alt="License" src="https://img.shields.io/github/license/litert/pointer.js?color=blue" />
    </a>
    <a href="https://www.npmjs.com/package/@litert/pointer">
        <img alt="NPM stable version" src="https://img.shields.io/npm/v/@litert/pointer?color=brightgreen&logo=npm" />
    </a>
    <a href="https://github.com/litert/pointer.js/releases">
        <img alt="GitHub releases" src="https://img.shields.io/github/v/release/litert/pointer.js?color=brightgreen&logo=github" />
    </a>
    <a href="https://github.com/litert/pointer.js/issues">
        <img alt="GitHub issues" src="https://img.shields.io/github/issues/litert/pointer.js?color=blue&logo=github" />
    </a>
</p>

A lightweight pointer event library for handling mouse, touch, and pen interactions in browsers. Provides unified APIs for down, move, click, long, hover, drag, resize and more.

## Features

- 🖱️ Unified pointer event handling (mouse, touch, pen)
- 📱 Mobile-friendly with touch support
- 🎯 Click, double-click, and long-press detection
- 👆 Hover detection with enter/move/leave callbacks
- 🔄 Drag and drop with customizable constraints
- 📐 Resize functionality with border detection
- 🎨 Global cursor management
- 🪝 Global hooks for move events
- 📦 Zero dependencies
- 🔷 Full TypeScript support
- 🌐 ESM and UMD bundle support

## Installation

### NPM

```bash
npm install @litert/pointer
```

### CDN

```html
<!-- UMD (Development) -->
<script src="https://unpkg.com/@litert/pointer/dist/index.umd.js"></script>

<!-- UMD (Production, minified) -->
<script src="https://unpkg.com/@litert/pointer/dist/index.umd.min.js"></script>
```

## Usage

### ESM (Recommended)

```typescript
import * as pointer from '@litert/pointer';

element.addEventListener('pointerdown', (e) => {
    pointer.move(e, {
        move: (e, detail) => {
            console.log('Moving:', detail.ox, detail.oy);
        }
    });
});
```

### Browser (UMD)

```html
<script src="https://unpkg.com/@litert/pointer/dist/index.umd.min.js"></script>
<script>
element.addEventListener('pointerdown', function(e) {
    pointer.move(e, {
        move: function(e, detail) {
            console.log('Moving:', detail.ox, detail.oy);
        }
    });
});
</script>
```

### Core Functions

#### `down(e, options)`

Down and up events, bind to pointer events.

```typescript
pointer.down(e, {
    down: (e) => { /* Triggered when pressed */ },
    start: (e) => { /* Triggered when start moving, return false to cancel subsequent events */ },
    move: (e, dir) => { /* Triggered when moving, dir is the direction of movement */ },
    up: (e) => { /* Triggered when released */ },
    end: (e) => { /* Triggered when moving ends */ }
});
```

#### `click(e, handler)`

Click takes effect only when the pointer does not move and the time is less than 250ms.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.click(e, (e, x, y) => {
        console.log('Clicked at:', x, y);
    });
});
```

#### `dblClick(e, handler)`

Double-click event, the interval between two clicks is less than 300ms and the position difference is less than 10px.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.dblClick(e, (e, x, y) => {
        console.log('Double clicked at:', x, y);
    });
});
```

#### `long(e, handler, options?)`

Long press event, default 300ms.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.long(e, (e) => {
        console.log('Long press detected!');
    }, { 'time': 500 });
});
```

#### `hover(e, options)`

Hover event, handles enter, move, and leave for mouse and touch.

```typescript
const cb = (e) => {
    pointer.hover(e, {
        enter: (e) => {
            console.log('Pointer entered');
        },
        move: (e) => {
            console.log('Pointer moving at:', e.clientX, e.clientY);
        },
        leave: (e) => {
            console.log('Pointer left');
        }
    });
};
element.addEventListener('pointerdown', cb);
element.addEventListener('pointerenter', cb);
```

#### `move(e, options)`

Drag event, supports boundary detection and constraints.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.move(e, {
        // --- Constraint area ---
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        // --- Or use an element as a constraint area ---
        // areaObject: document.getElementById('container'),
        // --- Drag object (used to calculate boundary offset) ---
        object: element,
        // --- Callbacks ---
        start: (x, y) => {
            console.log('Start at:', x, y);
        },
        move: (e, detail) => {
            console.log('Move:', detail.ox, detail.oy);
            console.log('Position:', detail.x, detail.y);
            console.log('Border:', detail.border);
            console.log('Direction:', detail.dir);
        },
        up: (moveTimes, e) => {
            console.log('Up');
        },
        end: (moveTimes, e) => {
            console.log('End');
        },
        borderIn: (x, y, border, e) => {
            console.log('Border in:', border);
        },
        borderOut: () => {
            console.log('Border out');
        }
    });
});
```

#### `addMoveHook(event, hook)` & `removeMoveHook(event, hook)`

Global hooks for move events. These hooks are called for all move operations.

```typescript
// --- Register global move down hook ---
pointer.addMoveHook('down', (e, opt) => {
    console.log('Global move down hook:', e, opt);
});

// --- Register global move up hook ---
pointer.addMoveHook('up', (e, opt) => {
    console.log('Global move up hook:', moveTimes, e, opt);
});

// --- Remove a hook ---
pointer.removeMoveHook('down', hookFunction);
```

#### `resize(e, options)`

Resize event.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.resize(e, {
        object: element,
        border: 'rb', // lt, t, tr, r, rb, b, bl, l
        minWidth: 100,
        minHeight: 100,
        maxWidth: 500,
        maxHeight: 500,
        start: (x, y) => {
            console.log('Resize start');
        },
        move: (left, top, width, height, x, y, border) => {
            element.style.left = left + 'px';
            element.style.top = top + 'px';
            element.style.width = width + 'px';
            element.style.height = height + 'px';
        },
        end: () => {
            console.log('Resize end');
        }
    });
});
```

#### `drag(e, el, options)`

Drag event, supports drag and drop to target elements.

```typescript
// --- Set drag source ---
dragSource.addEventListener('pointerdown', (e) => {
    pointer.drag(e, dragSource, {
        data: { id: 1, name: 'item' },
        start: (x, y) => {
            console.log('Drag start');
        },
        move: (e, detail) => {
            console.log('Dragging');
        },
        end: (moveTimes, e) => {
            console.log('Drag end');
        }
    });
});

// --- Set drop target ---
dropTarget.dataset.drop = '';
dropTarget.addEventListener('dragenter', (e) => {
    console.log('Drag enter');
});
dropTarget.addEventListener('dragleave', (e) => {
    console.log('Drag leave');
});
dropTarget.addEventListener('drop', (e) => {
    const data = pointer.getDragData();
    console.log('Dropped:', data);
});
```

#### `scale(e, handler)`

Scale/zoom event, supports pinch-to-zoom on touch devices and mouse wheel.

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.scale(e, (e, scale, cpos) => {
        console.log('Scale:', scale, 'Center:', cpos.x, cpos.y);
    });
});
element.addEventListener('wheel', (e) => {
    pointer.scale(e, (e, scale, cpos) => {
        console.log('Scale:', scale, 'Center:', cpos.x, cpos.y);
    });
});
```

#### `gesture(e, before, handler)`

Gesture event for swipe actions (up, down, left, right).

```typescript
element.addEventListener('pointerdown', (e) => {
    pointer.gesture(e, (e, dir) => {
        // Return 1 to show gesture indicator, 0 to ignore, -1 to stop propagation
        return 1;
    }, (dir) => {
        console.log('Gesture completed:', dir);
    });
});
element.addEventListener('wheel', (e) => {
    pointer.gesture(e, (e, dir) => {
        return 1;
    }, (dir) => {
        console.log('Wheel gesture:', dir);
    });
});
```

### Utility Functions

#### `setCursor(type?)`

Set/cancel global mouse style.

```typescript
pointer.setCursor('move');
// ...
pointer.setCursor(); // Cancel
```

#### `isTouch(e)`

Check if the pointer event is from a touch device.

```typescript
const isTouch = pointer.isTouch(e);
console.log('Is touch device:', isTouch);
```

## Types

### `TDirection`

Direction type.

```typescript
type TDirection = 'top' | 'right' | 'bottom' | 'left';
```

### `TBorder`

Border direction type.

```typescript
type TBorder = 'lt' | 't' | 'tr' | 'r' | 'rb' | 'b' | 'bl' | 'l' | '';
```

### `IDownOptions`

Options for the down function.

```typescript
interface IDownOptions {
    down?: (e: PointerEvent) => void;
    start?: (e: PointerEvent) => any;
    move?: (e: PointerEvent, dir: TDirection) => any;
    up?: (e: PointerEvent) => void | Promise<void>;
    end?: (e: PointerEvent) => void | Promise<void>;
}
```

### `IHoverOptions`

Options for the hover function.

```typescript
interface IHoverOptions {
    enter?: (e: PointerEvent) => void;
    move?: (e: PointerEvent) => void;
    leave?: (e: PointerEvent) => void;
}
```

### `ILongOptions`

Options for the long function.

```typescript
interface ILongOptions {
    time?: number; // Long press time, default 300 ms
    down?: (e: PointerEvent) => void | Promise<void>;
    up?: (e: PointerEvent) => void | Promise<void>;
}
```

### `IMoveDetail`

Detailed information in the move callback.

```typescript
interface IMoveDetail {
    ox: number;      // x-axis offset
    oy: number;      // y-axis offset
    x: number;       // Current x coordinate
    y: number;       // Current y coordinate
    border: TBorder; // Border type
    inBorder: {      // Whether at the border
        top: boolean;
        right: boolean;
        bottom: boolean;
        left: boolean;
    };
    dir: TDirection; // Direction of movement
}
```

### `IMoveTime`

Movement time record.

```typescript
interface IMoveTime {
    time: number;
    ox: number;
    oy: number;
}
```

### `IMoveOptions`

Options for the move function.

```typescript
interface IMoveOptions {
    areaObject?: HTMLElement;
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
    offsetLeft?: number;
    offsetTop?: number;
    offsetRight?: number;
    offsetBottom?: number;
    objectLeft?: number;
    objectTop?: number;
    objectWidth?: number;
    objectHeight?: number;
    object?: HTMLElement;
    cursor?: string;
    start?: (x: number, y: number) => any;
    move?: (e: PointerEvent, detail: IMoveDetail) => void;
    borderIn?: (x: number, y: number, border: TBorder, e: PointerEvent) => void;
    borderOut?: () => void;
    up?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}
```

### `IMoveResult`

Result returned by the move function.

```typescript
interface IMoveResult {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
```

### `IResizeOptions`

Options for the resize function.

```typescript
interface IResizeOptions {
    border: TBorder;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    object?: HTMLElement;
    objectLeft?: number;
    objectTop?: number;
    objectWidth?: number;
    objectHeight?: number;
    start?: (x: number, y: number) => any;
    move?: (left: number, top: number, width: number, height: number, x: number, y: number, border: TBorder) => void;
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}
```

### `IDragOptions`

Options for the drag function.

```typescript
interface IDragOptions {
    data?: any;
    start?: (x: number, y: number) => any;
    move?: (e: PointerEvent, detail: IMoveDetail) => void;
    end?: (moveTimes: IMoveTime[], e: PointerEvent) => void;
}
```

### `TScaleHandler`

Handler function type for scale events.

```typescript
type TScaleHandler = (e: PointerEvent | WheelEvent, scale: number, cpos: { x: number; y: number; }) => void | Promise<void>;
```

### `TGestureBeforeHandler`

Before handler function type for gesture events. Return 1 to show gesture, 0 to ignore, -1 to stop propagation.

```typescript
type TGestureBeforeHandler = (e: PointerEvent | WheelEvent, dir: TDirection) => number;
```

### `TGestureHandler`

Handler function type for gesture events.

```typescript
type TGestureHandler = (dir: TDirection) => void | Promise<void>;
```

### `TMenuHandler`

Handler function type for menu events.

```typescript
type TMenuHandler = (e: PointerEvent | MouseEvent) => void | Promise<void>;
```

### `TMoveDownHook`

Global hook function type for move down events.

```typescript
type TMoveDownHook = (e: PointerEvent, opt: IMoveOptions) => void | Promise<void>;
```

### `TMoveUpHook`

Global hook function type for move up events.

```typescript
type TMoveUpHook = (e: PointerEvent, opt: IMoveOptions) => void | Promise<void>;
```

## Demo

Clone the repository and open `dist/test/index.html` in your browser.

```bash
git clone https://github.com/litert/pointer.js.git
cd pointer.js
npm install
npm run build
```

Then open `dist/test/index.html` in your browser.

## Browser Support

- Chrome 55+
- Firefox 59+
- Safari 13+
- Edge 79+
- Mobile browsers (iOS Safari 13+, Chrome for Android)

Requires Pointer Events API support. For older browsers, consider using a polyfill.

## License

This library is published under [Apache-2.0](./LICENSE) license.
