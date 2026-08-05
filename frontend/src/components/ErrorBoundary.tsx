import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[var(--radius-m)] border border-sand bg-paper p-6 text-center text-navy shadow-sm"
        >
          <AlertTriangle size={32} className="text-gold-ink" aria-hidden="true" />
          <h2 className="font-[var(--font-display)] text-lg font-bold">
            {this.props.fallbackTitle ?? 'Something went wrong displaying this section'}
          </h2>
          <p className="max-w-md text-xs text-navy/60">
            {this.state.error?.message ?? 'An unexpected rendering error occurred. Please try reloading the view.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="mt-2 flex items-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-3.5 py-1.5 text-xs font-semibold text-cream hover:bg-navy/90"
          >
            <RefreshCw size={13} /> Reload View
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
