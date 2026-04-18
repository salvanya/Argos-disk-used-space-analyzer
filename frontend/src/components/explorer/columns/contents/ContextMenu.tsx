import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { ScanNode } from "../../../../lib/types";

interface ContextMenuProps {
  x: number;
  y: number;
  node: ScanNode;
  onClose: () => void;
  onCopyPath: () => void;
  onProperties: () => void;
}

export function ContextMenu({ x, y, node: _node, onClose, onCopyPath, onProperties }: ContextMenuProps) {
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

  useEffect(() => {
    if (!ref.current) return;
    const menu = ref.current;
    const { innerWidth, innerHeight } = window;
    const rect = menu.getBoundingClientRect();
    if (rect.right > innerWidth) menu.style.left = `${innerWidth - rect.width - 8}px`;
    if (rect.bottom > innerHeight) menu.style.top = `${innerHeight - rect.height - 8}px`;
  });

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[160px] rounded-xl border border-white/10 bg-[#1a1a1f]/90 py-1 shadow-xl backdrop-blur-xl"
      style={{ left: x, top: y }}
    >
      <button
        role="menuitem"
        className="flex w-full items-center px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/10"
        onClick={() => { onCopyPath(); onClose(); }}
      >
        {t("explorer.contents.copyPath")}
      </button>
      <button
        role="menuitem"
        className="flex w-full items-center px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/10"
        onClick={() => { onProperties(); onClose(); }}
      >
        {t("explorer.contents.properties")}
      </button>
      <div className="my-1 border-t border-white/10" />
      <button
        role="menuitem"
        disabled
        className="flex w-full items-center px-3 py-1.5 text-left text-sm text-white/30 cursor-not-allowed"
      >
        {t("explorer.contents.openInExplorer")}
      </button>
      <button
        role="menuitem"
        disabled
        className="flex w-full items-center px-3 py-1.5 text-left text-sm text-red-400/30 cursor-not-allowed"
      >
        {t("explorer.contents.delete")}
      </button>
    </div>,
    document.body
  );
}
