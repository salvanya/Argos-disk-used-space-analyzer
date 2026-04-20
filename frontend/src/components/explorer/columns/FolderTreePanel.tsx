import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EmptyState } from "../../ui/EmptyState";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useTreeState } from "./tree/useTreeState";
import { TreeRow } from "./tree/TreeRow";
import { TreeContextMenu } from "./tree/TreeContextMenu";

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
}

export function FolderTreePanel() {
  const { t } = useTranslation();
  const root = useScanStore((s) => s.root);
  const levels = useScanStore((s) => s.levels);
  const inflight = useScanStore((s) => s.inflight);
  const showHidden = useExplorerStore((s) => s.showHidden);
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);

  const { flatList, toggle, rescan } = useTreeState(root, levels, inflight, showHidden);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const focusedIdx = flatList.findIndex((it) => it.node.path === focusedPath);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, path });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (flatList.length === 0) return;
      const current = focusedIdx >= 0 ? focusedIdx : 0;
      const item = flatList[current];
      if (!item) return;
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = flatList[Math.min(current + 1, flatList.length - 1)];
          if (next) setFocusedPath(next.node.path);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const next = flatList[Math.max(current - 1, 0)];
          if (next) setFocusedPath(next.node.path);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (item.hasChildren && !item.isExpanded) {
            toggle(item.node.path);
          } else if (item.hasChildren && item.isExpanded) {
            const next = flatList[current + 1];
            if (next) setFocusedPath(next.node.path);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (item.hasChildren && item.isExpanded) {
            toggle(item.node.path);
          } else {
            for (let i = current - 1; i >= 0; i--) {
              const candidate = flatList[i];
              if (candidate && candidate.depth < item.depth) {
                setFocusedPath(candidate.node.path);
                break;
              }
            }
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          const first = flatList[0];
          if (first) setFocusedPath(first.node.path);
          break;
        }
        case "End": {
          e.preventDefault();
          const last = flatList[flatList.length - 1];
          if (last) setFocusedPath(last.node.path);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (item.hasChildren) toggle(item.node.path);
          break;
        }
      }
    },
    [flatList, focusedIdx, setFocusedPath, toggle],
  );

  return (
    <div
      className="glass flex h-full flex-col overflow-hidden"
      role="navigation"
      aria-label={t("explorer.a11y.tree")}
    >
      <div className="border-b border-canvas-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          {t("explorer.foldersPanel")}
        </span>
      </div>

      {!root ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={FolderOpen} headline={t("explorer.emptyFolders")} />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2"
          role="tree"
          aria-label={t("explorer.a11y.tree")}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const item = flatList[vItem.index];
              return (
                <div
                  key={item.node.path}
                  role="treeitem"
                  aria-level={item.depth + 1}
                  aria-expanded={item.hasChildren ? item.isExpanded : undefined}
                  aria-selected={focusedPath === item.node.path}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <TreeRow
                    item={item}
                    isFocused={focusedPath === item.node.path}
                    onToggle={toggle}
                    onFocus={setFocusedPath}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {menu && (
        <TreeContextMenu
          x={menu.x}
          y={menu.y}
          onRescan={() => {
            void rescan(menu.path);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
