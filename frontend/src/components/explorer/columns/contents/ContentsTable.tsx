import { useState, useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, ChevronsUpDown, FolderOpen, Inbox, Loader2 } from "lucide-react";
import { EmptyState } from "../../../ui/EmptyState";
import { ErrorPanel } from "../../../ui/ErrorPanel";
import { useScanStore } from "../../../../stores/scanStore";
import { useExplorerStore } from "../../../../stores/explorerStore";
import { useFocusedLevel } from "../hooks/useFocusedLevel";
import {
  sortItems,
  groupItems,
  type SortKey,
  type SortDir,
  type GroupMode,
} from "./contentsUtils";
import { ContentsRow } from "./ContentsRow";
import { ContextMenu } from "./ContextMenu";
import { PropertiesModal } from "./PropertiesModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { GroupBySelect } from "../../../ui/GroupBySelect";
import { openInExplorer, deleteItem } from "../../../../lib/api";
import type { LevelScanNode } from "../../../../lib/types";
import { cn } from "../../../../lib/utils";

type ContextMenuState = { x: number; y: number; node: LevelScanNode };
type VirtualRow =
  | { kind: "group-header"; label: string }
  | { kind: "row"; node: LevelScanNode; parentSize: number | null };

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-fg-muted" />;
  return sortDir === "asc"
    ? <ChevronUp size={11} className="text-blue-400" />
    : <ChevronDown size={11} className="text-blue-400" />;
}

export function ContentsTable() {
  const { t } = useTranslation();
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);
  const removeNode = useScanStore((s) => s.removeNode);
  const { focusedPath, level, isInflight } = useFocusedLevel();

  const [sortKey, setSortKey] = useState<SortKey | null>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [propertiesNode, setPropertiesNode] = useState<LevelScanNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LevelScanNode | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualRows = useMemo((): VirtualRow[] => {
    if (!level) return [];
    const denominator = level.directBytesKnown;
    const sorted = sortKey ? sortItems(level.children, sortKey, sortDir) : level.children;
    const groups = groupItems(groupMode, sorted);
    const rows: VirtualRow[] = [];
    for (const group of groups) {
      if (group.label) rows.push({ kind: "group-header", label: group.label });
      for (const node of group.items) {
        rows.push({ kind: "row", node, parentSize: denominator });
      }
    }
    return rows;
  }, [level, sortKey, sortDir, groupMode]);

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

  const handleContextMenu = useCallback((e: React.MouseEvent, node: LevelScanNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleCopyPath = useCallback(() => {
    if (contextMenu) void navigator.clipboard.writeText(contextMenu.node.path);
  }, [contextMenu]);

  const handleOpenInExplorer = useCallback(() => {
    if (!contextMenu) return;
    void openInExplorer(contextMenu.node.path);
  }, [contextMenu]);

  const handleDeleteConfirm = useCallback(
    async (permanent: boolean) => {
      if (!deleteTarget) return;
      try {
        await deleteItem(deleteTarget.path, permanent);
        removeNode(deleteTarget.path);
      } catch {
        // error is surfaced to user via future toast system; for now silently ignore
      } finally {
        setDeleteTarget(null);
      }
    },
    [deleteTarget, removeNode],
  );

  if (!focusedPath) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FolderOpen} headline={t("explorer.emptyContents")} />
      </div>
    );
  }

  if (!level) {
    if (isInflight) {
      return (
        <div
          data-testid="contents-loading"
          className="flex h-full items-center justify-center text-fg-muted"
        >
          <Loader2 size={18} className="animate-spin" aria-hidden />
          <span className="ml-2 text-xs">{t("tree.scanningFolder")}</span>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FolderOpen} headline={t("explorer.emptyContents")} />
      </div>
    );
  }

  if (level.accessible === false) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorPanel
          title={t("errors.boundaryTitle")}
          message={t("errors.permissionDenied")}
        />
      </div>
    );
  }

  if (level.children.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={Inbox} headline={t("explorer.contents.emptyFolder")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header controls */}
      <div className="flex shrink-0 items-center gap-2 border-b border-canvas-border px-3 py-1.5">
        <GroupBySelect
          value={groupMode}
          onChange={(v) => setGroupMode(v as GroupMode)}
          options={[
            { value: "none", label: t("explorer.contents.noGrouping") },
            { value: "type", label: t("explorer.contents.groupByType") },
          ]}
        />
        <button
          role="button"
          aria-label={t("explorer.contents.colName")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            sortKey === "name" ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
          )}
          onClick={() => handleSortClick("name")}
        >
          {t("explorer.contents.colName")}
          <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
        </button>
        <div className="flex-1" />
        <button
          role="button"
          aria-label={t("explorer.contents.colSize")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            sortKey === "size" ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
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
                  <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
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
          onOpenInExplorer={handleOpenInExplorer}
          onDelete={() => setDeleteTarget(contextMenu.node)}
        />
      )}

      {propertiesNode && (
        <PropertiesModal
          node={propertiesNode}
          onClose={() => setPropertiesNode(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(permanent) => void handleDeleteConfirm(permanent)}
        />
      )}
    </div>
  );
}
