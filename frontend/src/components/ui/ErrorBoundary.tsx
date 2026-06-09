import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[UI] Render error:", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-base-200 p-6 text-base-content">
        <div className="mx-auto mt-16 max-w-xl rounded-lg border border-error/30 bg-base-100 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-error">
            Application error
          </p>
          <h1 className="mt-2 text-2xl font-bold">This screen could not be rendered.</h1>
          <p className="mt-3 text-sm text-base-content/70">
            The dashboard caught the error before the whole app crashed. Try reloading after checking the server status.
          </p>
          <pre className="mt-4 max-h-44 overflow-auto rounded-md bg-error/10 p-3 text-xs text-error">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
