import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScanStore } from "../../stores/scanStore";

export function ScanProgress() {
  const { t } = useTranslation();
  const { status, errorMessage } = useScanStore();

  if (status === "idle") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 text-sm"
      >
        {status === "scanning" && (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-blue" />
            <span className="text-fg-secondary">{t("home.scanning")}</span>
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircle size={15} className="text-accent-cyan" />
            <span className="text-fg-secondary">{t("home.scanComplete")}</span>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={15} className="text-red-400" />
            <span className="text-red-300/80">
              {t("home.scanError", { message: errorMessage })}
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
