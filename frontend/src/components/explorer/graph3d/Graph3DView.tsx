import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { Box } from "lucide-react";
import { EmptyState } from "../../ui/EmptyState";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useAppStore } from "../../../stores/appStore";
import { flattenLevelsToGraph, type GraphNode } from "./graphData";
import { GraphLegend } from "./GraphLegend";
import { NodeTooltip } from "./NodeTooltip";

export function Graph3DView() {
  const { t } = useTranslation();
  const root = useScanStore((s) => s.root);
  const levels = useScanStore((s) => s.levels);
  const ensureLevel = useScanStore((s) => s.ensureLevel);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);
  const theme = useAppStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    root ? new Set([root]) : new Set(),
  );

  // Reset expansion when the user opens a different root.
  useEffect(() => {
    if (root) setExpanded(new Set([root]));
    else setExpanded(new Set());
  }, [root]);

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
    () => (root ? flattenLevelsToGraph(root, levels, expanded, theme) : null),
    [root, levels, expanded, theme],
  );

  const handleNodeClick = useCallback(
    (n: GraphNode) => {
      setFocusedPath(n.id);
      if (n.kind === "folder" && !expanded.has(n.id)) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(n.id);
          return next;
        });
        void ensureLevel(n.id);
      }
    },
    [setFocusedPath, expanded, ensureLevel],
  );

  const ringColor = theme === "dark" ? 0x8b5cf6 : 0x7c3aed;
  const nodeThreeObject = useCallback(
    (n: GraphNode) => {
      if (!n.expanded) return null;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(n.radius * 1.35, n.radius * 1.55, 32),
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      return ring;
    },
    [ringColor],
  );

  if (!root || !data || data.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Box} headline={t("graph3d.emptyState")} />
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
        nodeVal={(n: GraphNode) => n.radius ** 3}
        nodeColor={(n: GraphNode) => n.color}
        nodeLabel={(n: GraphNode) => n.name}
        nodeThreeObjectExtend
        nodeThreeObject={nodeThreeObject}
        linkColor={() => (theme === "dark" ? "rgba(148,163,184,0.25)" : "rgba(71,85,105,0.3)")}
        linkOpacity={0.4}
        onNodeClick={handleNodeClick}
        onNodeHover={(n: GraphNode | null) => setHovered(n)}
        cooldownTicks={60}
        d3AlphaDecay={0.04}
        warmupTicks={0}
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
