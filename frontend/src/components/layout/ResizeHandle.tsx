import { useCallback, useRef } from "react";

const STEP = 16;

interface ResizeHandleProps {
  current: number;
  onChange: (px: number) => void;
  min: number;
  max: number;
  ariaLabel: string;
  /** If true, the controlled width grows when the cursor moves right (left-side panel).
   *  If false, the width shrinks when the cursor moves right (right-side panel). */
  fromLeft?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function ResizeHandle({
  current,
  onChange,
  min,
  max,
  ariaLabel,
  fromLeft = true,
}: ResizeHandleProps) {
  const currentRef = useRef(current);
  currentRef.current = current;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const incrementToward = fromLeft ? STEP : -STEP;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange(clamp(current + incrementToward, min, max));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange(clamp(current - incrementToward, min, max));
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(min);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(max);
      }
    },
    [current, onChange, min, max, fromLeft],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const startX = e.clientX;
      const startWidth = currentRef.current;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      function handleMove(ev: PointerEvent) {
        const dx = ev.clientX - startX;
        const next = fromLeft ? startWidth + dx : startWidth - dx;
        onChange(clamp(next, min, max));
      }
      function handleUp() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onChange, min, max, fromLeft],
  );

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={current}
      aria-valuemin={min}
      aria-valuemax={max}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      className="group relative flex w-1 shrink-0 cursor-col-resize items-stretch outline-none"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-blue-400 opacity-0 transition-opacity duration-150 group-hover:opacity-80 group-focus-visible:opacity-100"
      />
    </div>
  );
}
