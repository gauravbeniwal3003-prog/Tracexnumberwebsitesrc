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
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">
            {this.props.fallbackTitle || "Something went wrong displaying this view"}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 font-medium leading-relaxed">
            An unexpected display glitch occurred while formatting the response. Don't worry, your data and balance are secure.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Search</span>
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>Go to Dashboard</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
