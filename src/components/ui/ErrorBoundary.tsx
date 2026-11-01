import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
          <p className="text-sm font-semibold text-ink">Something went wrong</p>
          <p className="mt-2 max-w-md text-xs text-ink-muted">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-4 h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink"
            onClick={() => {
              try {
                localStorage.removeItem('fb-playback');
                localStorage.removeItem('fb-skip-landing');
              } catch {
                /* ignore */
              }
              window.location.href = window.location.pathname;
            }}
          >
            Reload from home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
