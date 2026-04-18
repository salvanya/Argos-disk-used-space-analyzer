import { RequireScan } from "../components/explorer/RequireScan";
import { TopMenuBar } from "../components/explorer/TopMenuBar";
import { FolderTreePanel } from "../components/explorer/columns/FolderTreePanel";
import { ContentsPanel } from "../components/explorer/columns/ContentsPanel";
import { InsightsPanel } from "../components/explorer/columns/InsightsPanel";

function ExplorerLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopMenuBar />

      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* Left: Folder tree — fixed 240px */}
        <div className="w-60 flex-shrink-0">
          <FolderTreePanel />
        </div>

        {/* Middle: Contents — fills remaining space */}
        <div className="min-w-0 flex-1">
          <ContentsPanel />
        </div>

        {/* Right: Insights — fixed 320px */}
        <div className="w-80 flex-shrink-0">
          <InsightsPanel />
        </div>
      </div>
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
