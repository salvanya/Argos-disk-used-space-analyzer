import { useState, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../../stores/settingsStore";

export function ExclusionsSection() {
  const { t } = useTranslation();
  const { exclude, addExclusion, removeExclusion } = useSettingsStore();
  const [draft, setDraft] = useState("");

  function commit() {
    addExclusion(draft);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {t("settings.sections.exclusions")}
      </h3>
      <p className="text-xs text-fg-muted">{t("settings.exclusions.hint")}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={t("settings.exclusions.placeholder")}
          className="flex-1 rounded-sm border border-canvas-border bg-canvas-base px-3 py-1.5 text-xs text-fg-primary placeholder:text-fg-muted focus:border-accent-blue/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={commit}
          aria-label={t("settings.exclusions.add")}
          className="flex items-center gap-1 rounded-sm border border-canvas-border px-3 py-1.5 text-xs font-medium text-fg-secondary transition hover:border-accent-blue/50 hover:text-accent-blue"
        >
          <Plus size={14} />
          {t("settings.exclusions.add")}
        </button>
      </div>

      {exclude.length === 0 ? (
        <p className="py-2 text-xs italic text-fg-muted">
          {t("settings.exclusions.empty")}
        </p>
      ) : (
        <ul className="space-y-1">
          {exclude.map((glob) => (
            <li
              key={glob}
              className="flex items-center justify-between gap-2 rounded-sm border border-canvas-border bg-canvas-hover/50 px-2 py-1"
            >
              <code className="truncate font-mono text-xs text-fg-primary">{glob}</code>
              <button
                type="button"
                onClick={() => removeExclusion(glob)}
                aria-label={`${t("settings.exclusions.remove")}: ${glob}`}
                className="text-fg-muted transition hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
