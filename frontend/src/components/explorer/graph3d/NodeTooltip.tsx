import { useTranslation } from "react-i18next";
import { formatSize } from "../columns/tree/treeUtils";
import type { GraphNode } from "./graphData";

export function NodeTooltip({ node }: { node: GraphNode | null }) {
  const { t } = useTranslation();
  if (!node) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-4 max-w-xs rounded-xl border border-canvas-border bg-canvas-surface/70 p-3 text-xs backdrop-blur-xl">
      <div className="truncate font-medium text-fg-default">{node.name}</div>
      <div className="mt-1 text-fg-muted">
        {t("graph3d.tooltip.size")}: <span className="font-mono">{formatSize(node.size)}</span>
      </div>
      {node.kind === "folder" && (
        <div className="text-fg-muted">
          {t("graph3d.tooltip.children")}: <span className="font-mono">{node.childCount}</span>
        </div>
      )}
    </div>
  );
}
