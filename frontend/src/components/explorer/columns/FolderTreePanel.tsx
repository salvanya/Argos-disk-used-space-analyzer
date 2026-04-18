import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useTreeState } from "./tree/useTreeState";
import { TreeRow } from "./tree/TreeRow";

export function FolderTreePanel() {
  const { t } = useTranslation();
  const result = useScanStore((s) => s.result);
  const showHidden = useExplorerStore((s) => s.showHidden);
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);

  const { flatList, toggle } = useTreeState(result?.root ?? null, showHidden);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="border-b border-canvas-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          {t("explorer.foldersPanel")}
        </span>
      </div>

      {!result ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <FolderOpen size={28} className="text-fg-muted" />
          <p className="text-xs text-fg-muted">{t("explorer.emptyFolders")}</p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const item = flatList[vItem.index];
              return (
                <div
                  key={item.node.path}
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
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
