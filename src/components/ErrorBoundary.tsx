import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (window.location.pathname.startsWith('/service') || window.location.pathname.startsWith('/category')) {
      window.location.href = '/dashboard';
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 border border-slate-800 rounded-3xl my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-slate-100 mb-1.5">
            {this.props.fallbackTitle || "Display Notice"}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mb-5 font-medium leading-relaxed">
            A temporary view glitch occurred. Your search data, wallet balance, and records remain completely safe.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Dashboard</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
