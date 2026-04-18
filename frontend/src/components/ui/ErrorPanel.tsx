import { AlertTriangle } from "lucide-react";

export interface ErrorPanelProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorPanel({ title, message, onRetry, retryLabel, className }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-center justify-center gap-3 p-6 text-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="rounded-full bg-red-500/10 p-3 text-red-400">
        <AlertTriangle size={22} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg-primary">{title}</p>
        <p className="max-w-sm text-xs text-fg-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-sm border border-canvas-border bg-canvas-hover px-4 py-1.5 text-xs font-medium text-fg-primary transition hover:border-accent-blue/50 hover:text-accent-blue"
        >
          {retryLabel ?? "Retry"}
        </button>
      )}
    </div>
  );
}
