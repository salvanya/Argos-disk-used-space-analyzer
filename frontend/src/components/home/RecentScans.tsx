import { Clock, HardDrive, FolderSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../ui/EmptyState";
import type { ScanSummary } from "../../lib/types";

interface RecentScansProps {
  scans: ScanSummary[];
  onOpen: (summary: ScanSummary) => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentScans({ scans, onOpen }: RecentScansProps) {
  const { t } = useTranslation();

  if (scans.length === 0) {
    return (
      <EmptyState
        icon={FolderSearch}
        headline={t("home.emptyRecent.headline")}
        subtext={t("home.emptyRecent.subtext")}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {scans.slice(0, 5).map((scan) => (
        <li key={scan.root_path}>
          <button
            onClick={() => onOpen(scan)}
            className="glass group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:border-canvas-border"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className="truncate font-mono text-xs text-fg-secondary group-hover:text-fg-primary"
                title={scan.root_path}
              >
                {scan.root_path}
              </span>
              <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                <span className="flex items-center gap-1">
                  <HardDrive size={10} />
                  {formatBytes(scan.total_size)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(scan.scanned_at)}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-accent-blue/60 group-hover:text-accent-blue">
              {t("home.openRecent")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
