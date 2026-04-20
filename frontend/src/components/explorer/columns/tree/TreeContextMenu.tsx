import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

interface TreeContextMenuProps {
  x: number;
  y: number;
  onRescan: () => void;
  onClose: () => void;
}

export function TreeContextMenu({ x, y, onRescan, onClose }: TreeContextMenuProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[180px] rounded-xl border border-canvas-border bg-canvas-modal py-1 shadow-xl backdrop-blur-xl"
      style={{ left: x, top: y }}
    >
      <button
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg-primary hover:bg-canvas-hover"
        onClick={() => {
          onRescan();
          onClose();
        }}
      >
        <RefreshCw size={12} className="text-fg-muted" />
        {t("tree.rescanThisFolder")}
      </button>
    </div>,
    document.body,
  );
}
