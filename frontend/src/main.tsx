import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Keep all audio playing when app is backgrounded on Android
;(async () => {
  const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
  if (isNative) {
    try {
      const { App: CapApp } = await import('@capacitor/app')
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // App went to background — resume any suspended AudioContexts
          const win = window as any
          if (win.__audioContexts) {
            win.__audioContexts.forEach((ctx: AudioContext) => {
              if (ctx.state === 'suspended') ctx.resume().catch(() => {})
            })
          }
        }
      })
    } catch {}
  }
})()

// Sentry error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2, refetchOnWindowFocus: false },
    mutations: { retry: 1 },
  },
})

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=5')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          // Only reload on update (existing SW active), not on first install
          if (!newWorker || !registration.active) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New build deployed — reload to get fresh assets
              window.location.reload()
            }
          })
        })
      })
      .catch(console.error)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
