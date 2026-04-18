import { useTranslation } from "react-i18next";
import type { ScanNode } from "../../../../lib/types";
import { formatSize } from "../tree/treeUtils";

interface PropertiesModalProps {
  node: ScanNode;
  onClose: () => void;
}

export function PropertiesModal({ node, onClose }: PropertiesModalProps) {
  const { t } = useTranslation();

  const rows: [string, string][] = [
    [t("explorer.contents.propPath"), node.path],
    [t("explorer.contents.propSize"), node.accessible ? formatSize(node.size) : "—"],
    [t("explorer.contents.propType"), node.node_type],
    [t("explorer.contents.propAccessible"), node.accessible ? "Yes" : "No"],
    [t("explorer.contents.propIsLink"), node.is_link ? "Yes" : "No"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-sm font-semibold text-white/80">
          {t("explorer.contents.propertiesTitle")}
        </h2>
        <table className="w-full text-xs">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-white/5">
                <td className="py-1.5 pr-4 text-white/40">{label}</td>
                <td className="py-1.5 font-mono text-white/80 break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-4 rounded-lg bg-white/10 px-4 py-1.5 text-xs text-white/70 hover:bg-white/15"
          onClick={onClose}
        >
          {t("explorer.contents.close")}
        </button>
      </div>
    </div>
  );
}
