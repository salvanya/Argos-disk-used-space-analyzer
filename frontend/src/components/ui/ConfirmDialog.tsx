import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduce = usePrefersReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const duration = reduce ? 0 : 0.15;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: reduce ? 1 : 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: reduce ? 1 : 0.96, opacity: 0 }}
            transition={{ duration }}
            className="w-full max-w-md rounded-2xl border border-canvas-border bg-canvas-raised p-6 shadow-[0_0_40px_-10px_rgba(79,139,255,0.25)]"
          >
            <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
            <p className="mt-2 text-sm text-fg-secondary">{body}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="rounded-sm border border-canvas-border px-4 py-1.5 text-xs font-medium text-fg-primary transition hover:bg-canvas-hover"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={[
                  "rounded-sm px-4 py-1.5 text-xs font-medium transition",
                  destructive
                    ? "bg-red-500/80 text-white hover:bg-red-500"
                    : "bg-accent-blue text-white hover:bg-accent-blue/90",
                ].join(" ")}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
