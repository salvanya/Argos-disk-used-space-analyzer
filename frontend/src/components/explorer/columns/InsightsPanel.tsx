import { useTranslation } from "react-i18next";
import { BarChart2 } from "lucide-react";

export function InsightsPanel() {
  const { t } = useTranslation();
  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          {t("explorer.insightsPanel")}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <BarChart2 size={28} className="text-white/15" />
        <p className="text-xs text-white/30">{t("explorer.emptyInsights")}</p>
      </div>
    </div>
  );
}
