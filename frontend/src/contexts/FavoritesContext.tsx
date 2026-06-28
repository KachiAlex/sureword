import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type FavoriteType = 'music' | 'sermon'

type FavoritesKey = 'music' | 'sermons'

interface FavoritesState {
  music: Set<string>
  sermons: Set<string>
}

function keyFor(type: FavoriteType): FavoritesKey {
  return type === 'sermon' ? 'sermons' : 'music'
}

interface FavoritesContextType {
  isFavorite: (id: string, type: FavoriteType) => boolean
  toggleFavorite: (id: string, type: FavoriteType) => void
  getFavorites: (type: FavoriteType) => string[]
  count: number
}

const STORAGE_KEY = 'zionite:favorites'

function loadFromStorage(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { music: new Set(), sermons: new Set() }
    const parsed = JSON.parse(raw)
    return {
      music: new Set<string>(parsed.music || []),
      sermons: new Set<string>(parsed.sermons || [])
    }
  } catch {
    return { music: new Set(), sermons: new Set() }
  }
}

function saveToStorage(state: FavoritesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      music: Array.from(state.music),
      sermons: Array.from(state.sermons)
    }))
  } catch { /* storage full or unavailable */ }
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoritesState>(loadFromStorage)

  const isFavorite = useCallback((id: string, type: FavoriteType) => {
    return favorites[keyFor(type)].has(id)
  }, [favorites])

  const toggleFavorite = useCallback((id: string, type: FavoriteType) => {
    setFavorites(prev => {
      const next = {
        music: new Set(prev.music),
        sermons: new Set(prev.sermons)
      }
      const key = keyFor(type)
      if (next[key].has(id)) {
        next[key].delete(id)
      } else {
        next[key].add(id)
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const getFavorites = useCallback((type: FavoriteType) => {
    return Array.from(favorites[keyFor(type)]) as string[]
  }, [favorites])

  const count = favorites.music.size + favorites.sermons.size

  return (
    <FavoritesContext.Provider value={{ isFavorite, toggleFavorite, getFavorites, count }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}

