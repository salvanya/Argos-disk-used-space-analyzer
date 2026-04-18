import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RequireScan } from "../components/explorer/RequireScan";
import { TopMenuBar } from "../components/explorer/TopMenuBar";
import { SettingsDrawer } from "../components/explorer/settings/SettingsDrawer";
import { FolderTreePanel } from "../components/explorer/columns/FolderTreePanel";
import { ContentsPanel } from "../components/explorer/columns/ContentsPanel";
import { InsightsPanel } from "../components/explorer/columns/InsightsPanel";
import { useExplorerStore } from "../stores/explorerStore";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const Graph3DView = lazy(() =>
  import("../components/explorer/graph3d/Graph3DView").then((m) => ({ default: m.Graph3DView })),
);

function ColumnsLayout() {
  const reduce = usePrefersReducedMotion();
  const stagger = reduce ? 0 : 0.06;
  const duration = reduce ? 0 : 0.3;
  return (
    <motion.div
      className="flex min-h-0 flex-1 gap-2 p-2"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {[
        <FolderTreePanel key="tree" />,
        <ContentsPanel key="contents" />,
        <InsightsPanel key="insights" />,
      ].map((node, i) => (
        <motion.div
          key={node.key}
          variants={{
            hidden: { opacity: 0, y: reduce ? 0 : 8 },
            visible: { opacity: 1, y: 0, transition: { duration } },
          }}
          className={
            i === 0
              ? "w-60 flex-shrink-0"
              : i === 1
                ? "min-w-0 flex-1"
                : "w-80 flex-shrink-0"
          }
        >
          {node}
        </motion.div>
      ))}
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
