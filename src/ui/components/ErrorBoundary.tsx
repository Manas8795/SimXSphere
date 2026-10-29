import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SimXSphere ErrorBoundary caught an unhandled render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            margin: '2rem auto',
            maxWidth: '640px',
            padding: '24px 28px',
            background: 'var(--lab-surface, #1e293b)',
            border: '2px dashed var(--wood-frame, #eab308)',
            borderRadius: '12px',
            color: 'var(--text-primary, #f8fafc)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '32px' }} aria-hidden="true">
              🧪⚠️
            </span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontFamily: 'var(--font-display, cursive, sans-serif)',
                  color: 'var(--chalk-white, #ffffff)',
                }}
              >
                {this.props.fallbackTitle || 'Experiment Paused Unexpectedly'}
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: 'var(--text-secondary, #94a3b8)',
                }}
              >
                An unexpected reaction interrupted this simulation view.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div
              style={{
                margin: '14px 0',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                color: '#fca5a5',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.name}: {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="lab-btn lab-btn-primary"
              onClick={this.handleReset}
              style={{
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Reload Simulation
            </button>
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={() => {
                window.location.hash = '';
                window.location.reload();
              }}
              style={{
                padding: '8px 18px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🏠 Return to Lab
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
