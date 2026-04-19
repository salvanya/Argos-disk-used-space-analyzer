import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { FolderPicker } from "../components/home/FolderPicker";
import { RecentScans } from "../components/home/RecentScans";
import { ScanProgress } from "../components/home/ScanProgress";
import { invalidateLevel, listScans, scanLevel } from "../lib/api";
import type { LevelScanResult, ScanResult, ScanSummary } from "../lib/types";
import { useScanStore } from "../stores/scanStore";
import { useSettingsStore } from "../stores/settingsStore";

function levelToLegacyResult(level: LevelScanResult): ScanResult {
  return {
    root: {
      name: level.folderPath.split(/[\\/]/).pop() ?? level.folderPath,
      path: level.folderPath,
      node_type: "folder",
      size: level.directBytesKnown,
      accessible: level.accessible,
      is_link: level.isLink,
      link_target: null,
      children: level.children.map((c) => ({
        name: c.name,
        path: c.path,
        node_type: c.nodeType,
        size: c.size ?? 0,
        accessible: c.accessible,
        is_link: c.isLink,
        link_target: c.linkTarget,
        children: [],
      })),
    },
    scanned_at: level.scannedAt,
    duration_seconds: level.durationSeconds,
    total_files: level.directFiles,
    total_folders: level.directFolders,
    total_size: level.directBytesKnown,
    error_count: level.errorCount,
  };
}

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, selectedPath, startScan, completeScan, failScan } = useScanStore();
  const [recentScans, setRecentScans] = useState<ScanSummary[]>([]);

  useEffect(() => {
    listScans()
      .then(setRecentScans)
      .catch(() => {});
  }, []);

  async function triggerScan(path: string, forceRescan: boolean): Promise<void> {
    startScan();
    const { include_hidden, include_system, exclude } = useSettingsStore.getState();
    try {
      if (forceRescan) {
        await invalidateLevel(path, path, true);
      }
      const level = await scanLevel(
        path,
        path,
        { include_hidden, include_system, exclude },
        forceRescan,
      );
      useScanStore.setState((s) => ({
        root: path,
        selectedPath: path,
        levels: { ...s.levels, [path]: level },
      }));
      completeScan(levelToLegacyResult(level));
      navigate("/explorer");
    } catch (err) {
      failScan(err instanceof Error ? err.message : String(err));
    }
  }

  function handleScan() {
    if (!selectedPath) return;
    void triggerScan(selectedPath, false);
  }

  function handleOpenRecent(scan: ScanSummary) {
    void triggerScan(scan.root_path, false);
  }

  const canScan = !!selectedPath && status !== "scanning";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          {/* Hero card */}
          <div className="glass p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-fg-primary">
              {t("home.title")}
            </h1>
            <p className="mt-1 text-sm text-fg-secondary">{t("home.subtitle")}</p>

            <div className="mt-6 flex flex-col gap-4">
              <FolderPicker />

              <button
                onClick={handleScan}
                disabled={!canScan}
                className="rounded-sm bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-blue/80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {status === "scanning" ? t("home.scanning") : t("home.scan")}
              </button>

              <ScanProgress />
            </div>
          </div>

          {/* Recent scans */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-fg-muted">
              {t("home.recentScans")}
            </p>
            <RecentScans scans={recentScans} onOpen={handleOpenRecent} />
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
