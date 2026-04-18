import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteConfirmModalProps {
  name: string;
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
}

export function DeleteConfirmModal({ name, onClose, onConfirm }: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  const [permanent, setPermanent] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1f]/95 p-6 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-1 text-sm font-semibold text-white/90">
          {t("explorer.contents.deleteConfirm.title")}
        </h2>
        <p className="mb-2 truncate rounded bg-white/5 px-2 py-1 font-mono text-xs text-white/70">
          {name}
        </p>

        <p className="mb-4 text-xs text-white/50">
          {permanent
            ? t("explorer.contents.deleteConfirm.permanentDesc")
            : t("explorer.contents.deleteConfirm.recycleBinDesc")}
        </p>

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={permanent}
            onChange={(e) => setPermanent(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-red-500"
          />
          {t("explorer.contents.deleteConfirm.permanentLabel")}
        </label>

        {permanent && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {t("explorer.contents.deleteConfirm.cannotBeUndone")}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg px-4 py-1.5 text-xs text-white/50 hover:bg-white/8 hover:text-white/80"
            onClick={onClose}
          >
            {t("explorer.contents.deleteConfirm.cancel")}
          </button>
          <button
            className="rounded-lg bg-red-500/80 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500"
            onClick={() => onConfirm(permanent)}
          >
            {t("explorer.contents.deleteConfirm.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
