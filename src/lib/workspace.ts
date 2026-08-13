import JSZip from 'jszip'
import type { RepoFile, WorkspaceSnapshot } from '../core'

const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'vendor',
])

const textExtensions = new Set([
  '',
  '.c',
  '.cc',
  '.conf',
  '.cpp',
  '.css',
  '.csv',
  '.go',
  '.graphql',
  '.h',
  '.hpp',
  '.html',
  '.ini',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.kt',
  '.md',
  '.mdc',
  '.mjs',
  '.php',
  '.properties',
  '.py',
  '.rb',
  '.rs',
  '.scss',
  '.sh',
  '.sql',
  '.svelte',
  '.swift',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.vue',
  '.xml',
  '.yaml',
  '.yml',
  '.zsh',
])

export const workspaceImportLimits = Object.freeze({
  maxArchiveBytes: 50 * 1024 * 1024,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 32 * 1024 * 1024,
  maxAcceptedFiles: 1_500,
  maxScannedEntries: 10_000,
  maxCompressionRatio: 200,
  maxPathCharacters: 1_024,
})

export interface WorkspaceImportResult {
  workspace: WorkspaceSnapshot
  warnings: string[]
  complete: boolean
}

type DirectoryHandleWithEntries = FileSystemDirectoryHandle & {
  values: () => AsyncIterableIterator<FileSystemHandle>
}

type PickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

type ZipEntryWithSizes = JSZip.JSZipObject & {
  _data?: {
    compressedSize?: unknown
    uncompressedSize?: unknown
  }
}

type WarningCount =
  | 'duplicatePaths'
  | 'excessiveCompression'
  | 'ignoredPaths'
  | 'invalidPaths'
  | 'invalidSizes'
  | 'oversizedFiles'
  | 'sizeMismatches'
  | 'totalLimitFiles'
  | 'unknownZipSizes'
  | 'unreadableEntries'
  | 'unsupportedFiles'

interface WarningTracker {
  counts: Partial<Record<WarningCount, number>>
  acceptedFileLimit: boolean
  scanLimit: boolean
}

function createWarningTracker(): WarningTracker {
  return { counts: {}, acceptedFileLimit: false, scanLimit: false }
}

function incrementWarning(tracker: WarningTracker, warning: WarningCount) {
  tracker.counts[warning] = (tracker.counts[warning] ?? 0) + 1
}

function countedWarning(count: number | undefined, singular: string, plural = `${singular}s`) {
  if (!count) return null
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}.`
}

function collectWarnings(tracker: WarningTracker) {
  const { counts } = tracker
  return [
    tracker.scanLimit
      ? `Entry scanning stopped at the ${workspaceImportLimits.maxScannedEntries.toLocaleString()}-item safety limit.`
      : null,
    tracker.acceptedFileLimit
      ? `File loading stopped at the ${workspaceImportLimits.maxAcceptedFiles.toLocaleString()}-file safety limit.`
      : null,
    countedWarning(counts.invalidPaths, 'unsafe, empty, or overlong path was skipped', 'unsafe, empty, or overlong paths were skipped'),
    countedWarning(counts.duplicatePaths, 'duplicate workspace path was skipped', 'duplicate workspace paths were skipped'),
    countedWarning(counts.ignoredPaths, 'ignored directory or entry was not scanned', 'ignored directories or entries were not scanned'),
    countedWarning(counts.unsupportedFiles, 'unsupported file type was skipped', 'unsupported file types were skipped'),
    countedWarning(counts.oversizedFiles, 'file over the 1 MiB limit was skipped', 'files over the 1 MiB limit were skipped'),
    countedWarning(counts.unknownZipSizes, 'ZIP entry with unknown size was skipped', 'ZIP entries with unknown sizes were skipped'),
    countedWarning(counts.invalidSizes, 'entry with invalid size metadata was skipped', 'entries with invalid size metadata were skipped'),
    countedWarning(counts.excessiveCompression, 'ZIP entry with a suspicious compression ratio was skipped', 'ZIP entries with suspicious compression ratios were skipped'),
    countedWarning(counts.sizeMismatches, 'ZIP entry whose extracted size did not match its metadata was skipped', 'ZIP entries whose extracted sizes did not match their metadata were skipped'),
    countedWarning(counts.totalLimitFiles, 'file was skipped after the 32 MiB total content limit was reached', 'files were skipped after the 32 MiB total content limit was reached'),
    countedWarning(counts.unreadableEntries, 'file or directory could not be read', 'files or directories could not be read'),
  ].filter((warning): warning is string => warning !== null)
}

function importResult(name: string, files: RepoFile[], tracker: WarningTracker): WorkspaceImportResult {
  const warnings = collectWarnings(tracker)
  return {
    workspace: { name, files },
    warnings,
    complete: warnings.length === 0,
  }
}

function extensionOf(path: string) {
  const name = path.split('/').pop() ?? path
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot).toLowerCase()
}

function hasIgnoredDirectory(path: string) {
  return path
    .split('/')
    .some((part) => ignoredDirectories.has(part.toLowerCase()))
}

function isUnsafePath(path: string) {
  if (
    !path ||
    path.length > workspaceImportLimits.maxPathCharacters ||
    [...path].some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    })
  ) return true
  const normalized = path.replaceAll('\\', '/')
  if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized)) return true
  return normalized.split('/').some((part) => part === '..')
}

function normalizePath(path: string) {
  return path
    .replaceAll('\\', '/')
    .split('/')
    .filter((part) => part && part !== '.')
    .join('/')
}

function pathWarning(path: string): WarningCount | null {
  if (isUnsafePath(path)) return 'invalidPaths'
  if (hasIgnoredDirectory(path)) return 'ignoredPaths'
  if (!textExtensions.has(extensionOf(path))) return 'unsupportedFiles'
  return null
}

function commonZipRoot(paths: string[]) {
  const firstParts = paths[0]?.split('/') ?? []
  if (firstParts.length < 2) return null
  const candidate = firstParts[0]
  return paths.every((path) => {
    const parts = path.split('/')
    return parts.length > 1 && parts[0] === candidate
  })
    ? candidate
    : null
}

function reliableSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function zipSizes(entry: JSZip.JSZipObject) {
  const data = (entry as ZipEntryWithSizes)._data
  if (!data || data.uncompressedSize === undefined || data.compressedSize === undefined) return null
  if (!reliableSize(data.uncompressedSize) || !reliableSize(data.compressedSize)) return undefined
  return {
    compressed: data.compressedSize,
    uncompressed: data.uncompressedSize,
  }
}

export function supportsDirectoryPicker() {
  return typeof (window as PickerWindow).showDirectoryPicker === 'function'
}

export async function pickDirectoryWorkspace(): Promise<WorkspaceImportResult> {
  const picker = (window as PickerWindow).showDirectoryPicker
  if (!picker) throw new Error('Directory access is not available in this browser.')

  const root = await picker()
  const files: RepoFile[] = []
  const seenPaths = new Set<string>()
  const warnings = createWarningTracker()
  let scannedEntries = 0
  let totalBytes = 0
  let stopScanning = false

  async function visit(directory: FileSystemDirectoryHandle, prefix = ''): Promise<void> {
    try {
      for await (const entry of (directory as DirectoryHandleWithEntries).values()) {
        if (stopScanning) return
        if (scannedEntries >= workspaceImportLimits.maxScannedEntries) {
          warnings.scanLimit = true
          stopScanning = true
          return
        }
        scannedEntries += 1

        const path = normalizePath(prefix ? `${prefix}/${entry.name}` : entry.name)
        if (isUnsafePath(path)) {
          incrementWarning(warnings, 'invalidPaths')
          continue
        }

        if (entry.kind === 'directory') {
          if (hasIgnoredDirectory(path)) {
            incrementWarning(warnings, 'ignoredPaths')
          } else {
            await visit(entry as FileSystemDirectoryHandle, path)
          }
          continue
        }

        const warning = pathWarning(path)
        if (warning) {
          incrementWarning(warnings, warning)
          continue
        }
        if (seenPaths.has(path)) {
          incrementWarning(warnings, 'duplicatePaths')
          continue
        }
        if (files.length >= workspaceImportLimits.maxAcceptedFiles) {
          warnings.acceptedFileLimit = true
          stopScanning = true
          return
        }

        let file: File
        try {
          file = await (entry as FileSystemFileHandle).getFile()
        } catch {
          incrementWarning(warnings, 'unreadableEntries')
          continue
        }

        if (!reliableSize(file.size)) {
          incrementWarning(warnings, 'invalidSizes')
          continue
        }
        if (file.size > workspaceImportLimits.maxFileBytes) {
          incrementWarning(warnings, 'oversizedFiles')
          continue
        }
        if (totalBytes + file.size > workspaceImportLimits.maxTotalBytes) {
          incrementWarning(warnings, 'totalLimitFiles')
          continue
        }

        try {
          const content = await file.text()
          files.push({ path, content })
          seenPaths.add(path)
          totalBytes += file.size
        } catch {
          incrementWarning(warnings, 'unreadableEntries')
        }
      }
    } catch {
      incrementWarning(warnings, 'unreadableEntries')
    }
  }

  await visit(root)
  return importResult(root.name, files, warnings)
}

export async function workspaceFromZip(file: File): Promise<WorkspaceImportResult> {
  if (!reliableSize(file.size)) throw new Error('The ZIP archive has invalid size metadata.')
  if (file.size > workspaceImportLimits.maxArchiveBytes) {
    throw new Error('The ZIP archive is larger than the 50 MiB safety limit.')
  }

  const zip = await JSZip.loadAsync(file)
  const archiveEntries = Object.values(zip.files)
  const warnings = createWarningTracker()
  const candidates: Array<{ entry: JSZip.JSZipObject; path: string }> = []

  for (let index = 0; index < archiveEntries.length; index += 1) {
    if (index >= workspaceImportLimits.maxScannedEntries) {
      warnings.scanLimit = true
      break
    }

    const entry = archiveEntries[index]
    if (entry.dir) continue
    const originalPath = entry.unsafeOriginalName ?? entry.name
    if (isUnsafePath(originalPath)) {
      incrementWarning(warnings, 'invalidPaths')
      continue
    }
    const path = normalizePath(entry.name)
    if (isUnsafePath(path)) {
      incrementWarning(warnings, 'invalidPaths')
      continue
    }
    const warning = pathWarning(path)
    if (warning) {
      incrementWarning(warnings, warning)
      continue
    }
    candidates.push({ entry, path })
  }

  const sharedRoot = commonZipRoot(candidates.map(({ path }) => path))
  const files: RepoFile[] = []
  const seenPaths = new Set<string>()
  const decoder = new TextDecoder()
  let totalBytes = 0

  for (const candidate of candidates) {
    let path = candidate.path
    if (sharedRoot) path = path.slice(sharedRoot.length + 1)

    const warning = pathWarning(path)
    if (warning) {
      incrementWarning(warnings, warning)
      continue
    }
    if (seenPaths.has(path)) {
      incrementWarning(warnings, 'duplicatePaths')
      continue
    }
    if (files.length >= workspaceImportLimits.maxAcceptedFiles) {
      warnings.acceptedFileLimit = true
      break
    }

    const sizes = zipSizes(candidate.entry)
    if (sizes === null) {
      incrementWarning(warnings, 'unknownZipSizes')
      continue
    }
    if (sizes === undefined) {
      incrementWarning(warnings, 'invalidSizes')
      continue
    }
    if (sizes.uncompressed > workspaceImportLimits.maxFileBytes) {
      incrementWarning(warnings, 'oversizedFiles')
      continue
    }

    const compressionRatio = sizes.compressed === 0
      ? sizes.uncompressed === 0 ? 1 : Number.POSITIVE_INFINITY
      : sizes.uncompressed / sizes.compressed
    if (compressionRatio > workspaceImportLimits.maxCompressionRatio) {
      incrementWarning(warnings, 'excessiveCompression')
      continue
    }
    if (totalBytes + sizes.uncompressed > workspaceImportLimits.maxTotalBytes) {
      incrementWarning(warnings, 'totalLimitFiles')
      continue
    }

    try {
      const bytes = await candidate.entry.async('uint8array')
      if (bytes.byteLength !== sizes.uncompressed) {
        incrementWarning(warnings, 'sizeMismatches')
        continue
      }
      if (bytes.byteLength > workspaceImportLimits.maxFileBytes) {
        incrementWarning(warnings, 'oversizedFiles')
        continue
      }
      if (totalBytes + bytes.byteLength > workspaceImportLimits.maxTotalBytes) {
        incrementWarning(warnings, 'totalLimitFiles')
        continue
      }

      files.push({ path, content: decoder.decode(bytes) })
      seenPaths.add(path)
      totalBytes += bytes.byteLength
    } catch {
      incrementWarning(warnings, 'unreadableEntries')
    }
  }

  const archiveName = file.name.replace(/\.zip$/i, '')
  return importResult(sharedRoot || archiveName || 'imported-workspace', files, warnings)
}

export function getDirectories(workspace: WorkspaceSnapshot) {
  const directories = new Set<string>(['.'])
  for (const file of workspace.files) {
    const parts = file.path.split('/')
    parts.pop()
    let current = ''
    for (const part of parts) {
      current = current ? `${current}/${part}` : part
      directories.add(current)
    }
  }
  return [...directories].sort((a, b) => {
    if (a === '.') return -1
    if (b === '.') return 1
    return a.localeCompare(b)
  })
}

export function pickDefaultTarget(workspace: WorkspaceSnapshot) {
  const sourceFiles = workspace.files.filter((file) =>
    /\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php|swift|kt|vue|svelte)$/i.test(file.path),
  )
  const preferred = sourceFiles.find((file) => /(?:^|\/)src\//.test(file.path))
  return preferred?.path ?? sourceFiles[0]?.path ?? workspace.files[0]?.path ?? ''
}

export function directoryOf(path: string) {
  const index = path.lastIndexOf('/')
  return index === -1 ? '.' : path.slice(0, index)
}
