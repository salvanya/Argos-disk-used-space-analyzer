import { useState, useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useScanStore } from "../../../../stores/scanStore";
import { useExplorerStore } from "../../../../stores/explorerStore";
import {
  getDirectChildren,
  sortItems,
  groupItems,
  type SortKey,
  type SortDir,
  type GroupMode,
} from "./contentsUtils";
import { ContentsRow } from "./ContentsRow";
import { ContextMenu } from "./ContextMenu";
import { PropertiesModal } from "./PropertiesModal";
import type { ScanNode } from "../../../../lib/types";
import { cn } from "../../../../lib/utils";

type ContextMenuState = { x: number; y: number; node: ScanNode };
type VirtualRow =
  | { kind: "group-header"; label: string }
  | { kind: "row"; node: ScanNode; parentSize: number };

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-white/20" />;
  return sortDir === "asc"
    ? <ChevronUp size={11} className="text-blue-400" />
    : <ChevronDown size={11} className="text-blue-400" />;
}

export function ContentsTable() {
  const { t } = useTranslation();
  const result = useScanStore((s) => s.result);
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [propertiesNode, setPropertiesNode] = useState<ScanNode | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const children = useMemo(() => {
    if (!result || !focusedPath) return null;
    return getDirectChildren(result.root, focusedPath);
  }, [result, focusedPath]);

  const focusedSize = useMemo(() => {
    if (!result || !focusedPath) return 0;
    if (result.root.path === focusedPath) return result.root.size;
    function find(node: ScanNode): number {
      if (node.path === focusedPath) return node.size;
      for (const c of node.children) { const r = find(c); if (r >= 0) return r; }
      return -1;
    }
    return Math.max(0, find(result.root));
  }, [result, focusedPath]);

  const virtualRows = useMemo((): VirtualRow[] => {
    if (!children) return [];
    const sorted = sortKey ? sortItems(children, sortKey, sortDir) : children;
    const groups = groupItems(groupMode, sorted);
    const rows: VirtualRow[] = [];
    for (const group of groups) {
      if (group.label) rows.push({ kind: "group-header", label: group.label });
      for (const node of group.items) rows.push({ kind: "row", node, parentSize: focusedSize });
    }
    return rows;
  }, [children, sortKey, sortDir, groupMode, focusedSize]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const handleSortClick = useCallback((col: SortKey) => {
    if (sortKey !== col) {
      setSortKey(col);
      setSortDir(col === "size" ? "desc" : "asc");
    } else {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    }
  }, [sortKey]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: ScanNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleCopyPath = useCallback(() => {
    if (contextMenu) void navigator.clipboard.writeText(contextMenu.node.path);
  }, [contextMenu]);

  if (!focusedPath || !result) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-white/30">{t("explorer.emptyContents")}</p>
      </div>
    );
  }

  if (children !== null && children.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-white/30">{t("explorer.contents.emptyFolder")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header controls */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-3 py-1.5">
        <button
          role="button"
          aria-label={t("explorer.contents.colName")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            sortKey === "name" ? "text-white/80" : "text-white/40 hover:text-white/60"
          )}
          onClick={() => handleSortClick("name")}
        >
          {t("explorer.contents.colName")}
          <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
        </button>
        <div className="flex-1" />
        <select
          className="rounded bg-white/5 px-2 py-0.5 text-xs text-white/50 outline-none"
          value={groupMode}
          onChange={(e) => setGroupMode(e.target.value as GroupMode)}
        >
          <option value="none">{t("explorer.contents.noGrouping")}</option>
          <option value="type">{t("explorer.contents.groupByType")}</option>
        </select>
        <button
          role="button"
          aria-label={t("explorer.contents.colSize")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            sortKey === "size" ? "text-white/80" : "text-white/40 hover:text-white/60"
          )}
          onClick={() => handleSortClick("size")}
        >
          {t("explorer.contents.colSize")}
          <SortIcon col="size" sortKey={sortKey} sortDir={sortDir} />
        </button>
      </div>

      {/* Virtual list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-1">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const row = virtualRows[vItem.index];
            if (!row) return null;
            return (
              <div
                key={vItem.index}
                style={{ position: "absolute", top: vItem.start, left: 0, right: 0 }}
              >
                {row.kind === "group-header" ? (
                  <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    {row.label}
                  </div>
                ) : (
                  <ContentsRow
                    node={row.node}
                    parentSize={row.parentSize}
                    onNavigate={setFocusedPath}
                    onContextMenu={handleContextMenu}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onCopyPath={handleCopyPath}
          onProperties={() => setPropertiesNode(contextMenu.node)}
        />
      )}

      {propertiesNode && (
        <PropertiesModal
          node={propertiesNode}
          onClose={() => setPropertiesNode(null)}
        />
      )}
    </div>
  );
}
