import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { RequireScan } from "../components/explorer/RequireScan";
import { TopMenuBar } from "../components/explorer/TopMenuBar";
import { SettingsDrawer } from "../components/explorer/settings/SettingsDrawer";
import { Footer } from "../components/layout/Footer";
import { ResizeHandle } from "../components/layout/ResizeHandle";
import { FolderTreePanel } from "../components/explorer/columns/FolderTreePanel";
import { ContentsPanel } from "../components/explorer/columns/ContentsPanel";
import { InsightsPanel } from "../components/explorer/columns/InsightsPanel";
import { useExplorerStore } from "../stores/explorerStore";
import {
  useColumnWidthsStore,
  LEFT_MIN,
  LEFT_MAX,
  RIGHT_MIN,
  RIGHT_MAX,
} from "../stores/columnWidthsStore";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const Graph3DView = lazy(() =>
  import("../components/explorer/graph3d/Graph3DView").then((m) => ({ default: m.Graph3DView })),
);

function ColumnsLayout() {
  const reduce = usePrefersReducedMotion();
  const stagger = reduce ? 0 : 0.06;
  const duration = reduce ? 0 : 0.3;
  const { t } = useTranslation();
  const left = useColumnWidthsStore((s) => s.left);
  const right = useColumnWidthsStore((s) => s.right);
  const setLeft = useColumnWidthsStore((s) => s.setLeft);
  const setRight = useColumnWidthsStore((s) => s.setRight);
  const fadeVariants = {
    hidden: { opacity: 0, y: reduce ? 0 : 8 },
    visible: { opacity: 1, y: 0, transition: { duration } },
  };
  return (
    <motion.div
      className="flex min-h-0 flex-1 p-2"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      <motion.div variants={fadeVariants} style={{ width: left }} className="shrink-0">
        <FolderTreePanel />
      </motion.div>
      <ResizeHandle
        current={left}
        onChange={setLeft}
        min={LEFT_MIN}
        max={LEFT_MAX}
        ariaLabel={t("explorer.a11y.resizeLeft")}
        fromLeft
      />
      <motion.div variants={fadeVariants} className="min-w-0 flex-1">
        <ContentsPanel />
      </motion.div>
      <ResizeHandle
        current={right}
        onChange={setRight}
        min={RIGHT_MIN}
        max={RIGHT_MAX}
        ariaLabel={t("explorer.a11y.resizeRight")}
        fromLeft={false}
      />
      <motion.div variants={fadeVariants} style={{ width: right }} className="shrink-0">
        <InsightsPanel />
      </motion.div>
    </motion.div>
  );
}

function ExplorerLayout() {
  const viewMode = useExplorerStore((s) => s.viewMode);
  const reduce = usePrefersReducedMotion();
  const duration = reduce ? 0 : 0.2;
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopMenuBar />
      <SettingsDrawer />
      <AnimatePresence mode="wait">
        {viewMode === "3d" ? (
          <motion.div
            key="view-3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            className="min-h-0 flex-1 p-2"
          >
            <Suspense fallback={<div className="h-full w-full" />}>
              <Graph3DView />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="view-columns"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            className="flex min-h-0 flex-1"
          >
            <ColumnsLayout />
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
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
