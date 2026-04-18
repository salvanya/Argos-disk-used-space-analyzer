import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Sun,
  Moon,
  Languages,
  EyeOff,
  Eye,
  Link,
  Columns2,
  Box,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useExplorerStore } from "../../stores/explorerStore";
import { useScanStore } from "../../stores/scanStore";
import { connectScanWs } from "../../lib/api";

function MenuButton({
  label,
  onClick,
  disabled = false,
  active = false,
  toggle = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  toggle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={toggle ? active : undefined}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-accent-blue/20 text-accent-blue"
          : "text-fg-secondary hover:bg-canvas-hover hover:text-fg-primary",
      ].join(" ")}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function TopMenuBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { theme, locale, setTheme, setLocale } = useAppStore();
  const { viewMode, showHidden, followSymlinks, setViewMode, toggleHidden, toggleSymlinks } =
    useExplorerStore();
  const { status, selectedPath, startScan, updateProgress, completeScan, failScan } =
    useScanStore();

  const isScanning = status === "scanning";

  function handleBack() {
    navigate("/");
  }

  function handleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function handleLocale() {
    const next = locale === "en" ? "es" : "en";
    setLocale(next);
    void i18n.changeLanguage(next);
  }

  function handleRescan() {
    if (!selectedPath || isScanning) return;
    startScan();
    const ws = connectScanWs(
      useAppStore.getState().token,
      selectedPath,
      true,
      (msg) => {
        if (msg.type === "progress") updateProgress(msg.node_count);
        else if (msg.type === "complete") { completeScan(msg.result); ws.close(); }
        else if (msg.type === "error") failScan(msg.message);
      },
      () => {},
    );
  }

  return (
    <nav
      aria-label={t("explorer.a11y.topMenu")}
      className="flex items-center gap-1 border-b border-canvas-border px-4 py-2"
    >
      {/* Left group */}
      <MenuButton label={t("explorer.back")} onClick={handleBack}>
        <ArrowLeft size={14} />
      </MenuButton>

      <div className="mx-2 h-4 w-px bg-canvas-border" />

      {/* Scan controls */}
      <MenuButton
        label={t("explorer.rescan")}
        onClick={handleRescan}
        disabled={isScanning}
      >
        <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
      </MenuButton>

      <div className="flex-1" />

      {/* Toggles */}
      <MenuButton
        label={t("explorer.toggleHidden")}
        onClick={toggleHidden}
        active={showHidden}
        toggle
      >
        {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
      </MenuButton>

      <MenuButton
        label={t("explorer.toggleSymlinks")}
        onClick={toggleSymlinks}
        active={followSymlinks}
        toggle
      >
        <Link size={14} />
      </MenuButton>

      <div className="mx-2 h-4 w-px bg-canvas-border" />

      {/* View mode */}
      <MenuButton
        label={t("explorer.viewColumns")}
        onClick={() => setViewMode("columns")}
        active={viewMode === "columns"}
      >
        <Columns2 size={14} />
      </MenuButton>

      <MenuButton
        label={t("explorer.view3d")}
        onClick={() => setViewMode("3d")}
        active={viewMode === "3d"}
      >
        <Box size={14} />
      </MenuButton>

      <div className="mx-2 h-4 w-px bg-canvas-border" />

      {/* Locale + theme */}
      <MenuButton label={t("explorer.toggleLanguage")} onClick={handleLocale}>
        <Languages size={14} />
        <span className="text-xs font-semibold uppercase">{locale}</span>
      </MenuButton>

      <MenuButton label={t("explorer.toggleTheme")} onClick={handleTheme}>
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </MenuButton>
    </nav>
  );
}
