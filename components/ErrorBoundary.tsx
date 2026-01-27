/**
 * Error Boundary Component for ACE Governance Platform
 *
 * Catches React errors and displays fallback UI while:
 * - Reporting errors to server with correlation ID
 * - Displaying correlation ID for support reference
 * - Never exposing sensitive data in error messages
 *
 * CRITICAL: All errors are reported to server for audit trail
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

// Server endpoint for error reporting
const ERROR_REPORT_ENDPOINT = '/api/errors/report';

// Get correlation ID from session storage or generate one
function getCorrelationId(): string {
  let correlationId = sessionStorage.getItem('ace_correlation_id');
  if (!correlationId) {
    correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem('ace_correlation_id', correlationId);
  }
  return correlationId;
}

// Sanitize error message to remove potential PII
function sanitizeErrorMessage(message: string): string {
  // Remove potential SSN patterns
  let sanitized = message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
  // Remove potential email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  // Remove potential phone numbers
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
  // Remove file paths that might contain usernames
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[USER_REDACTED]');
  sanitized = sanitized.replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\[USER_REDACTED]');
  return sanitized;
}

// Report error to server (fire and forget with retry)
async function reportErrorToServer(
  correlationId: string,
  error: Error,
  componentName: string,
  componentStack?: string
): Promise<void> {
  const sanitizedMessage = sanitizeErrorMessage(error.message || 'Unknown error');
  const sanitizedStack = error.stack ? sanitizeErrorMessage(error.stack) : undefined;
  const sanitizedComponentStack = componentStack ? sanitizeErrorMessage(componentStack) : undefined;

  const payload = {
    correlationId,
    timestamp: new Date().toISOString(),
    errorType: 'REACT_COMPONENT_ERROR',
    component: componentName,
    message: sanitizedMessage,
    // Only send fingerprint of stack, not full stack in production
    stackFingerprint: sanitizedStack ?
      `${sanitizedStack.split('\n').slice(0, 3).join('|').slice(0, 200)}` : undefined,
    componentStackFingerprint: sanitizedComponentStack ?
      `${sanitizedComponentStack.split('\n').slice(0, 5).join('|').slice(0, 300)}` : undefined,
    userAgent: navigator.userAgent,
    url: window.location.pathname, // Only path, not full URL with params
  };

  try {
    const response = await fetch(ERROR_REPORT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[ErrorBoundary] Failed to report error to server:', response.status);
    }
  } catch (fetchError) {
    // Silently fail - we don't want error reporting to cause more errors
    console.error('[ErrorBoundary] Error reporting failed:', fetchError);
  }
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  correlationId: string;
  copied: boolean;
  reportSent: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      correlationId: getCorrelationId(),
      copied: false,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const correlationId = getCorrelationId();

    this.setState({
      errorInfo,
      correlationId,
    });

    // CRITICAL: Report error to server with correlation ID
    reportErrorToServer(
      correlationId,
      error,
      this.props.componentName || 'Unknown',
      errorInfo.componentStack || undefined
    ).then(() => {
      this.setState({ reportSent: true });
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      reportSent: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyCorrelationId = async () => {
    try {
      await navigator.clipboard.writeText(this.state.correlationId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.state.correlationId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Sanitize error message for display
      const displayMessage = this.state.error?.message
        ? sanitizeErrorMessage(this.state.error.message)
        : 'An unexpected error occurred';

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-white rounded-3xl border border-rose-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-4">
              <div className="p-3 bg-rose-600 text-white rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-900">
                  Something went wrong
                </h3>
                <p className="text-sm text-rose-600">
                  {this.props.componentName
                    ? `Error in ${this.props.componentName}`
                    : 'A component encountered an error'}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                This component encountered an error and couldn't render properly.
                The error has been automatically reported to our team.
              </p>

              {/* Correlation ID - Copyable */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                      Reference ID (for support)
                    </p>
                    <code className="text-sm font-mono text-blue-900">
                      {this.state.correlationId}
                    </code>
                  </div>
                  <button
                    onClick={this.copyCorrelationId}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Copy reference ID"
                  >
                    {this.state.copied ? (
                      <Check size={18} className="text-emerald-600" />
                    ) : (
                      <Copy size={18} className="text-blue-600" />
                    )}
                  </button>
                </div>
                {this.state.reportSent && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Error reported to server
                  </p>
                )}
              </div>

              {/* Sanitized error message (brief) */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-sm font-mono text-rose-600">
                  <Bug size={16} />
                  <span className="truncate">{displayMessage.slice(0, 100)}{displayMessage.length > 100 ? '...' : ''}</span>
                </div>
              </div>

              {/* Details toggle - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {this.state.showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {this.state.showDetails ? 'Hide technical details' : 'Show technical details (dev only)'}
                  </button>

                  {/* Sanitized stack trace - dev only */}
                  {this.state.showDetails && (
                    <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-48">
                      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                        {this.state.error?.stack
                          ? sanitizeErrorMessage(this.state.error.stack)
                          : 'No stack trace available'}
                      </pre>
                      {this.state.errorInfo?.componentStack && (
                        <>
                          <hr className="border-slate-700 my-3" />
                          <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">
                            {sanitizeErrorMessage(this.state.errorInfo.componentStack)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <RefreshCcw size={16} />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>

            {/* Footer with report status */}
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                ACE Governance Platform
              </p>
              <p className="text-xs text-slate-500">
                {this.state.reportSent ? 'Error logged' : 'Reporting error...'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary componentName={componentName || WrappedComponent.displayName || WrappedComponent.name}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook for error reporting (use inside components)
 * Reports errors to server with correlation ID
 */
export function useErrorHandler() {
  const reportError = (error: Error, context?: Record<string, unknown>) => {
    const correlationId = getCorrelationId();

    // Report to server
    reportErrorToServer(
      correlationId,
      error,
      context?.component as string || 'Unknown',
      undefined
    );
  };

  return { reportError, getCorrelationId };
}

export default ErrorBoundary;
