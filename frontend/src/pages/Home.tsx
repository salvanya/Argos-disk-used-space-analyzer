import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Header } from "../components/layout/Header";
import { FolderPicker } from "../components/home/FolderPicker";
import { RecentScans } from "../components/home/RecentScans";
import { ScanProgress } from "../components/home/ScanProgress";
import { connectScanWs, listScans } from "../lib/api";
import type { ScanSummary } from "../lib/types";
import { useAppStore } from "../stores/appStore";
import { useScanStore } from "../stores/scanStore";

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAppStore((s) => s.token);
  const { status, selectedPath, startScan, updateProgress, completeScan, failScan } =
    useScanStore();
  const [recentScans, setRecentScans] = useState<ScanSummary[]>([]);

  useEffect(() => {
    listScans()
      .then(setRecentScans)
      .catch(() => {});
  }, []);

  function triggerScan(path: string, forceRescan: boolean) {
    startScan();
    const ws = connectScanWs(token, path, forceRescan, (msg) => {
      if (msg.type === "progress") {
        updateProgress(msg.node_count);
      } else if (msg.type === "complete") {
        completeScan(msg.result);
        ws.close();
        navigate("/explorer");
      } else if (msg.type === "error") {
        failScan(msg.message);
      }
    }, () => {});
  }

  function handleScan() {
    if (!selectedPath) return;
    triggerScan(selectedPath, false);
  }

  function handleOpenRecent(scan: ScanSummary) {
    triggerScan(scan.root_path, false);
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
    </div>
  );
}
