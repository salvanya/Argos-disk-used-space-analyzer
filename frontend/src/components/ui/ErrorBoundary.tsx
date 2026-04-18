import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { ErrorPanel } from "./ErrorPanel";

interface ErrorBoundaryOwnProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundaryImpl extends Component<
  ErrorBoundaryOwnProps & WithTranslation,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback, t } = this.props;
    if (!error) return children;
    if (fallback) return fallback(error, this.reset);
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <ErrorPanel
          title={t("errors.boundaryTitle")}
          message={t("errors.boundaryMessage")}
          onRetry={this.reset}
          retryLabel={t("errors.retry")}
        />
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryImpl);
