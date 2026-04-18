import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  subtext?: string;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, headline, subtext, cta, className }: EmptyStateProps) {
  const reduce = usePrefersReducedMotion();
  const variants = reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
      className={[
        "flex flex-col items-center justify-center gap-3 p-8 text-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="rounded-full bg-canvas-hover p-3 text-fg-muted">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg-secondary">{headline}</p>
        {subtext && <p className="max-w-xs text-xs text-fg-muted">{subtext}</p>}
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-1 rounded-sm bg-accent-blue/90 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-accent-blue"
        >
          {cta.label}
        </button>
      )}
    </motion.div>
  );
}
