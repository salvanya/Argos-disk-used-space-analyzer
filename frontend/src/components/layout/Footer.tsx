import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="shrink-0 border-t border-canvas-border bg-canvas-surface/50 px-6 py-2 text-center text-[11px] text-fg-muted backdrop-blur-xl">
      <span>Argos · {t("footer.createdBy")} Leandro Salvañá · MIT License</span>
    </footer>
  );
}
