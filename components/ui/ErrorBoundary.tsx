"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Final safety net for UI crashes.
 * Displays the real error message and provides a recovery button.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Structured logging for external telemetry (e.g., Datadog/Sentry)
    const errorContext = {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      isSSR: typeof window === "undefined",
    };

    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary: DEV_CONTEXT]", errorContext);
    } else {
      // In production, this would be a beacon/fetch to an observability endpoint
      console.error("[ErrorBoundary: PROD_CRITICAL]", JSON.stringify(errorContext));
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 p-6 text-center animate-in fade-in">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-danger/20 bg-danger/10 text-danger shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </div>
          
          <h3 className="mb-2 text-base font-semibold tracking-normal text-foreground">Widget failed to load</h3>
          
          <div className="mb-4 w-full max-w-sm rounded-lg border border-danger/20 bg-surface p-3 shadow-sm text-left overflow-auto max-h-48">
            <p className="break-words font-mono text-xs font-semibold text-danger mb-2">
              {this.state.error?.name}: {this.state.error?.message || "Unknown rendering failure"}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error?.stack && (
              <pre className="text-[10px] leading-relaxed text-danger/80 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
          </div>

          <Button onClick={this.handleRetry} size="sm" variant="outline">
            <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
