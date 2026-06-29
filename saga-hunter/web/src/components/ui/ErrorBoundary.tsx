"use client";

import { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md">
              <p className="text-4xl mb-4">!</p>
              <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
              <p className="text-sm text-red-600 mb-4 font-mono bg-red-100 rounded px-2 py-1">
                {this.state.error?.message || "Unknown error"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
