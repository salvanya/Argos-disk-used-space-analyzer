import { ChevronRight, Folder, Link, Lock } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { formatSize, computePct } from "./treeUtils";
import type { FlatTreeNode } from "./treeUtils";

interface TreeRowProps {
  item: FlatTreeNode;
  isFocused: boolean;
  onToggle: (path: string) => void;
  onFocus: (path: string) => void;
}

export function TreeRow({ item, isFocused, onToggle, onFocus }: TreeRowProps) {
  const { node, depth, parentSize, hasChildren, isExpanded } = item;
  const isLink = node.is_link;
  const isLocked = !node.accessible;
  const canExpand = hasChildren;

  return (
    <div
      data-path={node.path}
      data-testid={`tree-row-${node.path}`}
      className={cn(
        "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
        isFocused
          ? "bg-canvas-selected text-fg-primary"
          : "text-fg-secondary hover:bg-canvas-hover hover:text-fg-primary",
        isLocked && "opacity-40"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onFocus(node.path)}
    >
      {canExpand ? (
        <button
          data-chevron
          aria-label={isExpanded ? "collapse" : "expand"}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-fg-muted transition-transform hover:text-fg-secondary"
          style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.path);
          }}
        >
          <ChevronRight size={12} />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {isLink ? (
        <Link data-icon="link" size={14} className="shrink-0 text-cyan-400/70" />
      ) : isLocked ? (
        <Lock data-icon="lock" size={14} className="shrink-0 text-fg-muted" />
      ) : (
        <Folder size={14} className="shrink-0 text-blue-400/70" />
      )}

      <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>

      <span className="shrink-0 font-mono text-xs text-fg-muted">
        {formatSize(node.size)}
      </span>
      <span
        className={cn(
          "w-10 shrink-0 text-right font-mono text-xs",
          isFocused ? "text-fg-secondary" : "text-fg-muted"
        )}
      >
        {computePct(node.size, parentSize)}
      </span>
    </div>
  );
}
