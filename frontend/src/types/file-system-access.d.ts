// Minimal type declarations for File System Access API
// (showDirectoryPicker, FileSystemDirectoryHandle, etc.)

interface FileSystemDirectoryHandle {
  readonly name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream {
  write(data: Blob | BufferSource | string): Promise<void>
  close(): Promise<void>
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
}

