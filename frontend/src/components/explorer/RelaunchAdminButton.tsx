import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { relaunchAdmin } from "../../lib/api";

export function RelaunchAdminButton() {
  const { t } = useTranslation();
  const isAdmin = useAppStore((s) => s.isAdmin);
  const platform = useAppStore((s) => s.platform);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (platform !== "win32" || isAdmin) return null;

  async function onConfirm() {
    setError(null);
    try {
      await relaunchAdmin();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const key = msg.includes("uacDeclined")
        ? "errors.uacDeclined"
        : msg.includes("alreadyElevated")
          ? "errors.alreadyElevated"
          : msg.includes("platformUnsupported")
            ? "errors.platformUnsupported"
            : "errors.boundaryMessage";
      setError(t(key));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("admin.relaunch")}
        title={t("admin.relaunch")}
        className="flex items-center gap-1.5 rounded-sm border border-canvas-border px-2.5 py-1.5 text-xs font-medium text-fg-secondary transition hover:border-accent-blue/50 hover:text-accent-blue"
      >
        <ShieldAlert size={14} />
        <span className="hidden sm:inline">{t("admin.relaunch")}</span>
      </button>
      <ConfirmDialog
        open={open}
        title={t("admin.relaunchConfirm.title")}
        body={error ?? t("admin.relaunchConfirm.body")}
        confirmLabel={t("admin.relaunchConfirm.cta")}
        cancelLabel={t("admin.relaunchConfirm.cancel")}
        onConfirm={() => {
          void onConfirm();
        }}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
