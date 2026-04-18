import { Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";

export function AdminBadge() {
  const { t } = useTranslation();
  const isAdmin = useAppStore((s) => s.isAdmin);
  const label = isAdmin ? t("admin.elevated") : t("admin.standard");
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={[
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        isAdmin
          ? "bg-accent-blue/15 text-accent-blue"
          : "bg-canvas-hover text-fg-muted",
      ].join(" ")}
    >
      {isAdmin ? <Shield size={12} strokeWidth={2} /> : <User size={12} strokeWidth={2} />}
      <span className="hidden md:inline">{label}</span>
    </span>
  );
}
