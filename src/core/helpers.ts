import picomatch from 'picomatch'
import type {
  Confidence,
  LifecyclePhase,
  RepoFile,
  ResolutionAction,
  ResolutionEvent,
  SimulationMetrics,
  WorkspaceSnapshot,
} from './types'

export const phaseOrder: LifecyclePhase[] = ['startup', 'discovery', 'edit']

const actionSeed = (): Record<ResolutionAction, number> => ({
  loaded: 0,
  deferred: 0,
  ignored: 0,
  omitted: 0,
  shadowed: 0,
  truncated: 0,
})

const confidenceSeed = (): Record<Confidence, number> => ({
  exact: 0,
  conditional: 0,
  'best-effort': 0,
})

export function normalizePath(path: string) {
  if (typeof path !== 'string') throw new TypeError('Path must be a string.')
  if (path.includes('\0')) throw new Error('Paths cannot contain null bytes.')

  const normalizedSeparators = path.replaceAll('\\', '/')
  if (normalizedSeparators.startsWith('/') || /^[A-Za-z]:/.test(normalizedSeparators)) {
    throw new Error(`Absolute paths are not supported: ${path}`)
  }

  const parts: string[] = []
  for (const part of normalizedSeparators.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!parts.length) throw new Error(`Path escapes the workspace root: ${path}`)
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join('/') || '.'
}

export function directoryOf(path: string) {
  const normalized = normalizePath(path)
  if (normalized === '.') return '.'
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '.' : normalized.slice(0, index)
}

export function ancestors(path: string) {
  const normalized = normalizePath(path)
  if (normalized === '.') return ['.']
  const parts = normalized.split('/')
  const result = ['.']
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    result.push(current)
  }
  return result
}

export function isAncestorOrSame(ancestor: string, path: string) {
  const left = normalizePath(ancestor)
  const right = normalizePath(path)
  return left === '.' || right === left || right.startsWith(`${left}/`)
}

export function relativeTo(base: string, path: string) {
  const root = normalizePath(base)
  const target = normalizePath(path)
  if (root === '.') return target
  if (target === root) return '.'
  return target.startsWith(`${root}/`) ? target.slice(root.length + 1) : target
}

export function findFile(workspace: WorkspaceSnapshot, path: string) {
  const normalized = normalizePath(path)
  return workspace.files.find((file) => normalizePath(file.path) === normalized)
}

export function byteLength(content: string) {
  return new TextEncoder().encode(content).length
}

export function truncateUtf8(content: string, maxBytes: number) {
  if (!Number.isFinite(maxBytes) || maxBytes < 0) {
    throw new RangeError('The UTF-8 byte limit must be a non-negative finite number.')
  }

  const encoded = new TextEncoder().encode(content)
  if (encoded.length <= maxBytes) return content

  let end = Math.floor(maxBytes)
  while (end > 0 && (encoded[end] & 0b1100_0000) === 0b1000_0000) end -= 1
  return new TextDecoder('utf-8', { fatal: true }).decode(encoded.slice(0, end))
}

export function estimateTokens(content: string) {
  if (!content) return 0
  return Math.max(1, Math.ceil(byteLength(content) / 4))
}

export function excerpt(content: string, maxLength = 320) {
  return content.trim().split('\n').slice(0, 6).join('\n').slice(0, maxLength)
}

export function contentLines(content: string, startLine = 1): [number, number] | undefined {
  const count = content ? content.split(/\r?\n/).length : 0
  return count ? [startLine, startLine + count - 1] : undefined
}

export interface FrontmatterResult {
  attributes: Record<string, string | boolean | string[]>
  body: string
  bodyStartLine: number
}

function unquote(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) return trimmed.slice(1, -1)
  return trimmed
}

export function parseFrontmatter(content: string): FrontmatterResult {
  const normalized = content.replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) {
    return { attributes: {}, body: content, bodyStartLine: 1 }
  }
  const close = normalized.indexOf('\n---', 4)
  if (close === -1) return { attributes: {}, body: content, bodyStartLine: 1 }

  const raw = normalized.slice(4, close)
  const attributes: FrontmatterResult['attributes'] = {}
  let arrayKey: string | null = null
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const item = line.match(/^-\s+(.+)$/)
    if (item && arrayKey) {
      const existing = attributes[arrayKey]
      attributes[arrayKey] = [...(Array.isArray(existing) ? existing : []), unquote(item[1])]
      continue
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/)
    if (!pair) continue
    const [, key, rawValue] = pair
    arrayKey = null
    if (!rawValue) {
      attributes[key] = []
      arrayKey = key
    } else if (/^(true|false)$/i.test(rawValue)) {
      attributes[key] = rawValue.toLowerCase() === 'true'
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      attributes[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((value) => unquote(value))
        .filter(Boolean)
    } else {
      attributes[key] = unquote(rawValue)
    }
  }

  const bodyOffset = close + 4
  const body = normalized.slice(bodyOffset).replace(/^\n/, '')
  const bodyStartLine = normalized.slice(0, bodyOffset).split('\n').length + 1
  return { attributes, body, bodyStartLine }
}

export function patternsFrom(value: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => patternsFrom(item))
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((item) => unquote(item))
    .map((item) => item.trim())
    .filter(Boolean)
}

export function matchesAny(path: string, patterns: string[], base = '.') {
  if (!patterns.length) return false
  const normalizedPath = normalizePath(path)
  const candidates = new Set([normalizedPath, relativeTo(base, normalizedPath)])
  return patterns.some((pattern) => {
    try {
      const matcher = picomatch(pattern, { dot: true })
      return [...candidates].some((candidate) => matcher(candidate))
    } catch {
      return false
    }
  })
}

export function fileEventParts(file: RepoFile, renderedContent = file.content) {
  return {
    bytes: byteLength(renderedContent),
    estimatedTokens: estimateTokens(renderedContent),
    excerpt: excerpt(renderedContent),
    sourceLines: contentLines(file.content),
  }
}

export function calculateMetrics(events: ResolutionEvent[]): SimulationMetrics {
  const loaded = events.filter((event) => event.action === 'loaded' || event.action === 'truncated')
  return {
    loadedFiles: loaded.length,
    loadedBytes: loaded.reduce((total, event) => total + event.bytes, 0),
    estimatedTokens: loaded.reduce((total, event) => total + event.estimatedTokens, 0),
    actionCounts: events.reduce((counts, event) => {
      counts[event.action] += 1
      return counts
    }, actionSeed()),
    confidenceCounts: events.reduce((counts, event) => {
      counts[event.confidence] += 1
      return counts
    }, confidenceSeed()),
  }
}

export function shortPath(path: string) {
  const parts = normalizePath(path).split('/')
  if (parts.length <= 2) return path
  return `.../${parts.slice(-2).join('/')}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
