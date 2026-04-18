import { lazy, Suspense } from "react";
import { RequireScan } from "../components/explorer/RequireScan";
import { TopMenuBar } from "../components/explorer/TopMenuBar";
import { FolderTreePanel } from "../components/explorer/columns/FolderTreePanel";
import { ContentsPanel } from "../components/explorer/columns/ContentsPanel";
import { InsightsPanel } from "../components/explorer/columns/InsightsPanel";
import { useExplorerStore } from "../stores/explorerStore";

const Graph3DView = lazy(() =>
  import("../components/explorer/graph3d/Graph3DView").then((m) => ({ default: m.Graph3DView })),
);

function ColumnsLayout() {
  return (
    <div className="flex min-h-0 flex-1 gap-2 p-2">
      <div className="w-60 flex-shrink-0">
        <FolderTreePanel />
      </div>
      <div className="min-w-0 flex-1">
        <ContentsPanel />
      </div>
      <div className="w-80 flex-shrink-0">
        <InsightsPanel />
      </div>
    </div>
  );
}

function ExplorerLayout() {
  const viewMode = useExplorerStore((s) => s.viewMode);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopMenuBar />
      {viewMode === "3d" ? (
        <div className="min-h-0 flex-1 p-2">
          <Suspense fallback={<div className="h-full w-full" />}>
            <Graph3DView />
          </Suspense>
        </div>
      ) : (
        <ColumnsLayout />
      )}
    </div>
  );
}

export function Explorer() {
  return (
    <RequireScan>
      <ExplorerLayout />
    </RequireScan>
  );
}
