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
    console.error("[CRITICAL UI ERROR]", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="m-4 flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 p-8 text-center animate-in fade-in">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border border-danger/20 bg-danger/10 text-danger shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
          
          <h2 className="mb-2 text-xl font-semibold tracking-normal text-foreground">Component Error</h2>
          
          <div className="mb-8 w-full max-w-md rounded-lg border border-danger/20 bg-surface p-4 shadow-sm">
            <p className="break-words font-mono text-sm text-danger">
              {this.state.error?.message || "Unknown rendering failure"}
            </p>
          </div>

          <p className="mb-8 max-w-xs text-sm font-medium text-muted-foreground">
            This part of the app crashed. We&apos;ve logged the error. Try resetting the component below.
          </p>

          <Button onClick={this.handleRetry} size="lg">
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset Component
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
