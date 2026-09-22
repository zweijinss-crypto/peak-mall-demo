'use client';

/**
 * ErrorBoundary — React class error boundary that reports to Sentry
 * and renders a fallback UI instead of a white screen.
 *
 * Used by App Router as a client component wrapper around the page
 * tree. Sentry's `ErrorBoundary` HOC wires up the same hook.
 *
 * Mounted at the root layout level so any unhandled render error in
 * any descendant is caught.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (err: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sentry will pick this up automatically via the browser integration;
    // call explicitly so server-side render errors also surface.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack ?? '' } },
    });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div
          role="alert"
          className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 text-center"
        >
          <div className="max-w-md space-y-3">
            <div className="text-2xl font-bold text-neutral-900">
              Something went wrong
            </div>
            <p className="text-[14px] text-neutral-600 leading-relaxed">
              We&apos;ve been notified and are looking into it. Please try
              again, or reload the page.
            </p>
            <button
              type="button"
              onClick={this.reset}
              className="mt-2 px-4 py-2 text-[13px] font-medium border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
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

export default ErrorBoundary;