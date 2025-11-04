import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for WorkflowTimeline Component
 *
 * Catches rendering errors in the timeline and displays a user-friendly
 * error message instead of crashing the entire page.
 *
 * Error boundaries only catch:
 * - Render errors
 * - Lifecycle method errors
 * - Constructor errors in child components
 *
 * They do NOT catch:
 * - Event handler errors (use try/catch)
 * - Async errors (use error state)
 * - Errors in the error boundary itself
 */
export class TimelineErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Timeline rendering error:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Failed to render timeline
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message || "An unknown error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs text-primary hover:underline mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
