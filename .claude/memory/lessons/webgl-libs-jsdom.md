# Lesson: WebGL libs need mocking + ResizeObserver stub in jsdom

## Symptom
Importing `react-force-graph-3d` (or any Three.js / WebGL-backed component) in a Vitest + jsdom test either:
- Crashes at module load because Three.js touches `window` / `WebGLRenderingContext`, or
- Throws `ReferenceError: ResizeObserver is not defined` when the component uses a size observer.

## Root cause
- jsdom has no WebGL and no `ResizeObserver` globals.
- The libraries can't detect this and try to initialize regardless.

## Fix / workaround
In `frontend/src/test-setup.ts`:

1. **Stub the library.** Replace `ForceGraph3D` with a plain `<div data-testid="force-graph-3d">` that renders its nodes as `<button>`s wired to `onNodeClick` / `onNodeHover` so click/hover behavior is still testable:
   ```ts
   vi.mock("react-force-graph-3d", () => {
     const ForceGraph3D = React.forwardRef(function (props, _ref) {
       return React.createElement("div", { "data-testid": "force-graph-3d" },
         (props.graphData?.nodes ?? []).map(n =>
           React.createElement("button", {
             key: n.id, "data-testid": `graph-node-${n.id}`,
             onClick: () => props.onNodeClick?.(n),
             onMouseEnter: () => props.onNodeHover?.(n),
             onMouseLeave: () => props.onNodeHover?.(null),
           }, n.id)));
     });
     return { default: ForceGraph3D };
   });
   ```

2. **Polyfill ResizeObserver** before the mock:
   ```ts
   if (typeof globalThis.ResizeObserver === "undefined") {
     globalThis.ResizeObserver = class {
       observe(){} unobserve(){} disconnect(){}
     } as unknown as typeof ResizeObserver;
   }
   ```

## How to recognize it next time
Any new dep that touches canvas, WebGL, or observes element sizes (react-three-fiber, react-konva, react-zdog, visx 3D utilities, etc.). Add both stubs up-front rather than debugging each failure.
