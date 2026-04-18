import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openFolderPicker } from "../../lib/api";
import { useScanStore } from "../../stores/scanStore";

export function FolderPicker() {
  const { t } = useTranslation();
  const { selectedPath, setSelectedPath } = useScanStore();

  async function handleChoose() {
    const resp = await openFolderPicker();
    if (resp.path) setSelectedPath(resp.path);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleChoose}
        className="flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-accent-blue/50 hover:bg-white/8 hover:text-white"
      >
        <FolderOpen size={16} className="text-accent-blue" />
        {t("home.chooseFolder")}
      </button>

      {selectedPath ? (
        <p className="truncate font-mono text-xs text-white/50" title={selectedPath}>
          {selectedPath}
        </p>
      ) : (
        <p className="text-xs text-white/25">{t("home.noFolderSelected")}</p>
      )}
    </div>
  );
}
