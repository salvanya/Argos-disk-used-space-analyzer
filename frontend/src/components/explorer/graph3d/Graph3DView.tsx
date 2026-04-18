import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ForceGraph3D from "react-force-graph-3d";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useAppStore } from "../../../stores/appStore";
import { flattenTreeToGraph, type GraphNode } from "./graphData";
import { GraphLegend } from "./GraphLegend";
import { NodeTooltip } from "./NodeTooltip";

export function Graph3DView() {
  const { t } = useTranslation();
  const result = useScanStore((s) => s.result);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);
  const theme = useAppStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<GraphNode | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () => (result ? flattenTreeToGraph(result.root, theme) : null),
    [result, theme],
  );

  if (!result || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-muted">
        {t("graph3d.emptyState")}
      </div>
    );
  }

  const bg = theme === "dark" ? "#0a0a0b" : "#fafafa";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl">
      <ForceGraph3D
        graphData={data}
        width={dims.w || undefined}
        height={dims.h || undefined}
        backgroundColor={bg}
        nodeRelSize={1}
        nodeVal={(n: GraphNode) => n.radius}
        nodeColor={(n: GraphNode) => n.color}
        nodeLabel={(n: GraphNode) => n.name}
        linkColor={() => (theme === "dark" ? "rgba(148,163,184,0.25)" : "rgba(71,85,105,0.3)")}
        linkOpacity={0.4}
        onNodeClick={(n: GraphNode) => setFocusedPath(n.id)}
        onNodeHover={(n: GraphNode | null) => setHovered(n)}
      />

      <GraphLegend theme={theme} />
      <NodeTooltip node={hovered} />

      {data.downsampled && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-canvas-border bg-canvas-surface/70 px-3 py-1.5 text-xs text-fg-muted backdrop-blur-xl">
          {t("graph3d.downsampledNotice", { count: data.aggregatedCount })}
        </div>
      )}
    </div>
  );
}
