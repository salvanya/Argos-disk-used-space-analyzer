import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../../stores/settingsStore";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-fg-primary">{label}</span>
        <span className="text-xs text-fg-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer accent-accent-blue"
      />
    </label>
  );
}

export function ScanOptionsSection() {
  const { t } = useTranslation();
  const { include_hidden, include_system, setIncludeHidden, setIncludeSystem } =
    useSettingsStore();
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {t("settings.sections.scan")}
      </h3>
      <Toggle
        label={t("settings.scan.includeHidden")}
        hint={t("settings.scan.includeHiddenHint")}
        checked={include_hidden}
        onChange={setIncludeHidden}
      />
      <Toggle
        label={t("settings.scan.includeSystem")}
        hint={t("settings.scan.includeSystemHint")}
        checked={include_system}
        onChange={setIncludeSystem}
      />
    </section>
  );
}
