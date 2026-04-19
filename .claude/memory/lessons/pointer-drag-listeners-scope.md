# Lesson: Pointer-drag listeners belong inside `pointerdown`, not `useEffect`

## Symptom
A `ResizeHandle` component's drag tests failed: firing `pointerDown` then `pointerMove(window)` never invoked `onChange`. The `pointermove` handler was never attached even though a `useEffect` with a ref check "should have" installed it.

## Root cause
`useEffect` only re-runs when its deps change. A mutable ref (`dragRef.current = { startX, startWidth }` set inside `handlePointerDown`) does **not** trigger re-renders or effect re-runs, so the `window.addEventListener("pointermove", ...)` inside the effect was only evaluated at mount — when `dragRef.current` was still `null` and the effect returned early.

## Fix / workaround
Attach window listeners **inside** the `onPointerDown` handler, and tear them down inside a locally-scoped `pointerup` handler. No `useEffect` involved:

```tsx
const handlePointerDown = useCallback((e) => {
  const startX = e.clientX;
  const startWidth = currentRef.current;
  function handleMove(ev) { onChange(clamp(...)); }
  function handleUp() {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
  }
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}, [onChange, min, max, fromLeft]);
```

## How to recognize it next time
- Any "drag / resize / brush / marquee" interaction where move listeners need to survive outside the original target.
- If you're tempted to put a `useEffect` that reads a `useRef` to decide whether to attach listeners — that's the shape of the bug. The effect can't see ref mutations.
- Rule of thumb: listeners whose lifetime equals a single gesture should be installed and removed by the gesture handler itself, not by component lifecycle.
