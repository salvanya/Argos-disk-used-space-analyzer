import { useTranslation } from "react-i18next";
import { nodeColor, type NodeKind, type ThemeMode } from "./graphData";

const KINDS: NodeKind[] = ["folder", "file", "symlink", "inaccessible"];

export function GraphLegend({ theme }: { theme: ThemeMode }) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-canvas-border bg-canvas-surface/60 p-3 text-xs backdrop-blur-xl">
      <ul className="space-y-1.5">
        {KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2 text-fg-muted">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: nodeColor(kind, theme) }}
            />
            <span>{t(`graph3d.legend.${kind}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
