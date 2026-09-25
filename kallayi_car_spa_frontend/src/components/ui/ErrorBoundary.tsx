'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` - ${this.props.name}` : ''}] Uncaught render error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full my-6 p-6 sm:p-8 bg-[#0c0d12] border border-red-500/20 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white tracking-wide">
              {this.props.name ? `${this.props.name} encountered an issue` : 'Something went wrong displaying this view'}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              An unexpected render error occurred. Your session is still active and you can continue using the dashboard.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error?.message && (
              <p className="text-[11px] font-mono text-red-400/80 bg-red-500/5 p-2 rounded-xl mt-2 text-left overflow-x-auto border border-red-500/10">
                {this.state.error.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-[#01FFFF] hover:bg-[#00e6e6] text-black font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.25)] hover:shadow-[0_0_25px_rgba(1,255,255,0.4)] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
