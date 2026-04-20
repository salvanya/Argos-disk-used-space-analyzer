import { useTranslation } from "react-i18next";
import type { LevelScanNode } from "../../../../lib/types";
import { formatSize } from "../tree/treeUtils";

interface PropertiesModalProps {
  node: LevelScanNode;
  onClose: () => void;
}

export function PropertiesModal({ node, onClose }: PropertiesModalProps) {
  const { t } = useTranslation();

  const rows: [string, string][] = [
    [t("explorer.contents.propPath"), node.path],
    [
      t("explorer.contents.propSize"),
      node.accessible ? formatSize(node.size) : "—",
    ],
    [t("explorer.contents.propType"), node.nodeType],
    [t("explorer.contents.propAccessible"), node.accessible ? "Yes" : "No"],
    [t("explorer.contents.propIsLink"), node.isLink ? "Yes" : "No"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-sm font-semibold text-fg-primary">
          {t("explorer.contents.propertiesTitle")}
        </h2>
        <table className="w-full text-xs">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-canvas-border">
                <td className="py-1.5 pr-4 text-fg-muted">{label}</td>
                <td className="py-1.5 font-mono text-fg-primary break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-4 rounded-lg bg-canvas-hover px-4 py-1.5 text-xs text-fg-secondary hover:bg-canvas-selected"
          onClick={onClose}
        >
          {t("explorer.contents.close")}
        </button>
      </div>
    </div>
  );
}
