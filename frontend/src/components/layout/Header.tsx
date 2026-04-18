import { ShieldCheck, ShieldOff, Sun, Moon, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";

export function Header() {
  const { t, i18n } = useTranslation();
  const { isAdmin, theme, locale, setTheme, setLocale } = useAppStore();

  function handleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function handleLocale() {
    const next = locale === "en" ? "es" : "en";
    setLocale(next);
    void i18n.changeLanguage(next);
  }

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-fg-primary">
          {t("app.name")}
        </span>
        <span className="text-xs text-fg-muted">{t("app.tagline")}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Admin indicator */}
        <div className="flex items-center gap-1.5">
          {isAdmin ? (
            <ShieldCheck size={16} className="text-accent-blue" aria-label={t("admin.elevated")} />
          ) : (
            <ShieldOff size={16} className="text-fg-muted" aria-label={t("admin.standard")} />
          )}
          <span className="text-xs text-fg-muted">
            {isAdmin ? t("admin.elevated") : t("admin.standard")}
          </span>
        </div>

        <div className="h-4 w-px bg-canvas-border" />

        {/* Language toggle */}
        <button
          aria-label={t("explorer.toggleLanguage")}
          onClick={handleLocale}
          className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-fg-secondary transition hover:bg-canvas-hover hover:text-fg-primary"
        >
          <Languages size={14} />
          <span className="font-semibold uppercase">{locale}</span>
        </button>

        {/* Theme toggle */}
        <button
          aria-label={t("explorer.toggleTheme")}
          onClick={handleTheme}
          className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-fg-secondary transition hover:bg-canvas-hover hover:text-fg-primary"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
