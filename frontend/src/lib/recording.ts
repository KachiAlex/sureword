const DB_NAME = 'zionite-recording'
const DB_VERSION = 1
const STORE_NAME = 'config'

export interface RecordingConfig {
  directoryHandle?: FileSystemDirectoryHandle
  enabled: boolean
  lastUsed?: string
}

export async function getRecordingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function getRecordingConfig(): Promise<RecordingConfig | null> {
  const db = await getRecordingDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get('config')
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function setRecordingConfig(config: RecordingConfig): Promise<void> {
  const db = await getRecordingDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(config, 'config')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

