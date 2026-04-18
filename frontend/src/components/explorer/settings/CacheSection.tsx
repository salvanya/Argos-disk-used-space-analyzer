import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ScanSummary } from "../../../lib/types";
import { deleteAllScans, deleteScan, listScans } from "../../../lib/api";
import { ConfirmDialog } from "../../ui/ConfirmDialog";

export function CacheSection() {
  const { t } = useTranslation();
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function refresh() {
    try {
      setScans(await listScans());
    } catch {
      setScans([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onDeleteOne(rootPath: string) {
    await deleteScan(rootPath);
    await refresh();
  }

  async function onClearAll() {
    await deleteAllScans();
    setConfirmOpen(false);
    await refresh();
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t("settings.sections.cache")}
        </h3>
        {scans.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-sm border border-canvas-border px-2 py-1 text-xs text-fg-secondary transition hover:border-red-400/50 hover:text-red-400"
          >
            {t("settings.cache.clearAll")}
          </button>
        )}
      </div>

      {scans.length === 0 ? (
        <p className="py-2 text-xs italic text-fg-muted">{t("settings.cache.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {scans.map((s) => (
            <li
              key={s.root_path}
              className="flex items-center justify-between gap-2 rounded-sm border border-canvas-border bg-canvas-hover/50 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-fg-primary">{s.root_path}</p>
                <p className="text-[10px] text-fg-muted">
                  {new Date(s.scanned_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void onDeleteOne(s.root_path);
                }}
                aria-label={`${t("settings.cache.delete")}: ${s.root_path}`}
                className="text-fg-muted transition hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t("settings.cache.clearAllConfirm.title")}
        body={t("settings.cache.clearAllConfirm.body")}
        confirmLabel={t("settings.cache.clearAllConfirm.cta")}
        cancelLabel={t("admin.relaunchConfirm.cancel")}
        destructive
        onConfirm={() => {
          void onClearAll();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
