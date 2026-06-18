import { useEffect, useRef, useState, useCallback } from 'react'

interface SSEOptions {
  onConnect?: () => void
  onChunk?: (data: { chunkIndex: number; chunk: string; timestamp: number }) => void
  onEnded?: () => void
  onError?: (error: Event) => void
}

export function useSSE(broadcastId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [chunkIndex, setChunkIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback((options?: SSEOptions) => {
    if (!broadcastId) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const sseUrl = `${import.meta.env.VITE_API_URL || ''}/api/stream/listen/${broadcastId}`
    const es = new EventSource(sseUrl)
    eventSourceRef.current = es

    es.addEventListener('connected', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setChunkIndex(data.chunkIndex || 0)
      setIsConnected(true)
      setError(null)
      options?.onConnect?.()
    })

    es.addEventListener('chunk', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setChunkIndex(data.chunkIndex)
      options?.onChunk?.(data)
    })

    es.addEventListener('ended', () => {
      setIsConnected(false)
      options?.onEnded?.()
      es.close()
    })

    es.onerror = (e) => {
      setError('Connection error')
      setIsConnected(false)
      options?.onError?.(e)

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(options)
      }, 3000)
    }
  }, [broadcastId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    disconnect,
    isConnected,
    chunkIndex,
    error,
  }
}

// Hook for broadcaster to send audio chunks
export function useBroadcaster() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const broadcastIdRef = useRef<string | null>(null)

  const startBroadcast = useCallback(async (title: string, description?: string, scripture?: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, scripture_reference: scripture }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start broadcast')
      }

      const data = await res.json()
      broadcastIdRef.current = data.broadcast.id
      setIsStreaming(true)
      setError(null)
      return data.broadcast
    } catch (e: any) {
      setError(e.message)
      throw e
    }
  }, [])

  const sendChunk = useCallback(async (chunk: ArrayBuffer) => {
    if (!broadcastIdRef.current || !isStreaming) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/stream/chunk/${broadcastIdRef.current}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: chunk,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send chunk')
      }
    } catch (e: any) {
      setError(e.message)
      throw e
    }
  }, [isStreaming])

  const endBroadcast = useCallback(async () => {
    if (!broadcastIdRef.current) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/stream/end/${broadcastIdRef.current}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to end broadcast')
      }

      const data = await res.json()
      broadcastIdRef.current = null
      setIsStreaming(false)
      return data
    } catch (e: any) {
      setError(e.message)
      throw e
    }
  }, [])

  return {
    startBroadcast,
    sendChunk,
    endBroadcast,
    isStreaming,
    error,
    broadcastId: broadcastIdRef.current,
  }
}
