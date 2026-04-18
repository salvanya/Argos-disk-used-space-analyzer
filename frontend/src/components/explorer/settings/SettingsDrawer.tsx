import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useExplorerStore } from "../../../stores/explorerStore";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { ScanOptionsSection } from "./ScanOptionsSection";
import { ExclusionsSection } from "./ExclusionsSection";
import { CacheSection } from "./CacheSection";

export function SettingsDrawer() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const open = useExplorerStore((s) => s.settingsOpen);
  const setOpen = useExplorerStore((s) => s.setSettingsOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const duration = reduce ? 0 : 0.2;
  const slide = reduce ? 0 : 480;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.title")}
            initial={{ x: slide }}
            animate={{ x: 0 }}
            exit={{ x: slide }}
            transition={{ duration, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex h-full w-[480px] max-w-full flex-col overflow-hidden border-l border-canvas-border bg-canvas-raised shadow-[0_0_60px_-10px_rgba(0,0,0,0.5)]"
          >
            <header className="flex items-center justify-between border-b border-canvas-border px-6 py-4">
              <h2 className="text-sm font-semibold text-fg-primary">{t("settings.title")}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("settings.close")}
                className="rounded-sm p-1 text-fg-muted transition hover:bg-canvas-hover hover:text-fg-primary"
              >
                <X size={16} />
              </button>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <ScanOptionsSection />
              <div className="h-px bg-canvas-border" />
              <ExclusionsSection />
              <div className="h-px bg-canvas-border" />
              <CacheSection />
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
