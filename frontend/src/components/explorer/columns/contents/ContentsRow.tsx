import { File, Folder, Link } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { formatSize, computePct } from "../tree/treeUtils";
import type { ScanNode } from "../../../../lib/types";

interface ContentsRowProps {
  node: ScanNode;
  parentSize: number;
  onNavigate: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: ScanNode) => void;
}

export function ContentsRow({ node, parentSize, onNavigate, onContextMenu }: ContentsRowProps) {
  const isFolder = node.node_type === "folder";
  const pct = node.accessible ? computePct(node.size, parentSize) : "—";
  const pctNum = node.accessible && parentSize > 0 ? (node.size / parentSize) * 100 : 0;

  return (
    <div
      data-testid={`contents-row-${node.path}`}
      className={cn(
        "group flex cursor-default items-center gap-3 rounded-lg px-3 py-1.5 text-sm",
        "hover:bg-white/5",
        isFolder && "cursor-pointer"
      )}
      onClick={() => { if (isFolder && node.accessible && !node.is_link) onNavigate(node.path); }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
    >
      <div className="shrink-0 text-white/40">
        {node.is_link ? (
          <Link size={14} className="text-cyan-400/70" />
        ) : isFolder ? (
          <Folder size={14} className="text-blue-400/70" />
        ) : (
          <File size={14} className="text-white/30" />
        )}
      </div>

      <div className="min-w-0 flex-1 truncate text-white/80">
        {node.name}
        {node.is_link && (
          <span data-link-badge className="ml-1.5 text-[10px] text-cyan-400/60">🔗</span>
        )}
      </div>

      <div className="w-28 shrink-0">
        {node.accessible ? (
          <div className="flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-blue-400/50"
                style={{ width: `${Math.min(100, pctNum)}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs text-white/40">{pct}</span>
          </div>
        ) : (
          <span className="text-xs text-white/25">—</span>
        )}
      </div>

      <div className="w-20 shrink-0 text-right text-xs text-white/50 tabular-nums">
        {node.accessible ? formatSize(node.size) : "—"}
      </div>
    </div>
  );
}
