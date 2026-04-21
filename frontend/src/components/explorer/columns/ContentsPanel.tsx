import { useTranslation } from "react-i18next";
import { ContentsTable } from "./contents/ContentsTable";
import { Breadcrumbs } from "./contents/Breadcrumbs";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";

export function ContentsPanel() {
  const { t } = useTranslation();
  const rootPath = useScanStore((s) => s.result?.root.path ?? null);
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const setFocusedPath = useExplorerStore((s) => s.setFocusedPath);

  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center border-b border-canvas-border px-3 py-2">
        {rootPath && focusedPath ? (
          <Breadcrumbs
            rootPath={rootPath}
            currentPath={focusedPath}
            onNavigate={setFocusedPath}
          />
        ) : (
          <span className="px-1 text-xs font-semibold uppercase tracking-widest text-fg-muted">
            {t("explorer.contentsPanel")}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ContentsTable />
      </div>
    </div>
  );
}
