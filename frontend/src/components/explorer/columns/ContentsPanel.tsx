import { useTranslation } from "react-i18next";
import { ContentsTable } from "./contents/ContentsTable";

export function ContentsPanel() {
  const { t } = useTranslation();
  return (
    <div className="glass flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          {t("explorer.contentsPanel")}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ContentsTable />
      </div>
    </div>
  );
}
