import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ChevronRight } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { buildSegments, parentOf } from "./breadcrumbUtils";

interface BreadcrumbsProps {
  rootPath: string;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ rootPath, currentPath, onNavigate }: BreadcrumbsProps) {
  const { t } = useTranslation();
  const segments = useMemo(
    () => buildSegments(rootPath, currentPath),
    [rootPath, currentPath],
  );
  const parent = useMemo(
    () => parentOf(currentPath, rootPath),
    [currentPath, rootPath],
  );
  const canGoUp = parent !== null;

  return (
    <nav
      aria-label={t("explorer.contents.breadcrumbsAria")}
      className="flex min-w-0 items-center gap-1"
    >
      <button
        type="button"
        aria-label={t("explorer.contents.goUp")}
        title={t("explorer.contents.goUp")}
        disabled={!canGoUp}
        onClick={() => {
          if (parent) onNavigate(parent);
        }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors",
          canGoUp
            ? "text-fg-secondary hover:bg-canvas-hover hover:text-fg-primary"
            : "cursor-not-allowed text-fg-muted opacity-40",
        )}
      >
        <ArrowUp size={14} />
      </button>
      <ol className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <li key={seg.path} className="flex shrink-0 items-center gap-0.5">
              {i > 0 && (
                <ChevronRight size={12} className="shrink-0 text-fg-muted" aria-hidden />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="rounded-md px-1.5 py-1 text-xs font-semibold text-fg-primary"
                  title={seg.path}
                >
                  {seg.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(seg.path)}
                  title={seg.path}
                  className="rounded-md px-1.5 py-1 text-xs font-medium text-fg-secondary transition-colors hover:bg-canvas-hover hover:text-fg-primary"
                >
                  {seg.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
