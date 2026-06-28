import { Component, type ReactNode } from 'react'
import { Radio, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)

    // Auto-reload once on chunk-load failures (stale deploy � old JS chunk URL no longer exists)
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Unable to preload CSS') ||
      error.name === 'ChunkLoadError'
    if (isChunkError) {
      const reloadKey = 'chunk_error_reload'
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        return
      }
    }
    // Clear the flag once a non-chunk error is shown (so future deploys still auto-reload)
    sessionStorage.removeItem('chunk_error_reload')

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, { extra: errorInfo })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E05A1A]/10 border border-[#E05A1A]/20 flex items-center justify-center mx-auto mb-6">
              <Radio className="w-8 h-8 text-[#E05A1A]" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Something went wrong</h1>
            <p className="text-sm text-[#9a7c60] mb-6">We&apos;re sorry, an unexpected error occurred. Try refreshing the page or going back home.</p>
            {this.state.error && (
              <div className="mb-6 p-3 rounded-lg bg-[#2f1206] border border-[rgba(240,190,100,0.08)] text-left">
                <p className="text-[10px] text-[#9a7c60] font-mono break-all">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 bg-[#E05A1A] text-[#1b1208] hover:bg-[#F5A623]"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <Link to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium border transition-colors"
                style={{ borderColor: 'var(--line)', color: 'var(--parchment)' }}
              >
                <Home className="w-4 h-4" /> Home
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

