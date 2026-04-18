import { ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";

export function Header() {
  const { t } = useTranslation();
  const isAdmin = useAppStore((s) => s.isAdmin);

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-white/90">
          {t("app.name")}
        </span>
        <span className="text-xs text-white/30">{t("app.tagline")}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {isAdmin ? (
          <ShieldCheck
            size={16}
            className="text-accent-blue"
            aria-label={t("admin.elevated")}
          />
        ) : (
          <ShieldOff
            size={16}
            className="text-white/25"
            aria-label={t("admin.standard")}
          />
        )}
        <span className="text-xs text-white/30">
          {isAdmin ? t("admin.elevated") : t("admin.standard")}
        </span>
      </div>
    </header>
  );
}
