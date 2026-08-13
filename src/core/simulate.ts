import { simulateClaude } from './adapters/claude'
import { simulateCodex } from './adapters/codex'
import { simulateCopilot } from './adapters/copilot'
import { simulateCursor } from './adapters/cursor'
import {
  finalizeEvents,
  ignoredDialectEvents,
  type ProviderAdapter,
} from './adapters/shared'
import { calculateMetrics, normalizePath } from './helpers'
import type {
  ProviderId,
  ResolutionAction,
  SimulationInput,
  SimulationResult,
  SimulationSummary,
} from './types'

const adapters: Record<ProviderId, ProviderAdapter> = {
  codex: simulateCodex,
  claude: simulateClaude,
  cursor: simulateCursor,
  copilot: simulateCopilot,
}

export function simulate(input: SimulationInput) {
  if (!input.cwd.trim()) throw new Error('cwd must be a non-empty workspace-relative path.')
  if (!input.targetPath.trim()) throw new Error('targetPath must be a non-empty workspace-relative path.')

  const cwd = normalizePath(input.cwd)
  const targetPath = normalizePath(input.targetPath)
  const normalizedPaths = new Set<string>()
  const files = input.workspace.files.map((file) => {
    const path = normalizePath(file.path)
    if (path === '.') throw new Error('Workspace files must have a non-empty path.')
    if (normalizedPaths.has(path)) {
      throw new Error(`Workspace contains duplicate normalized path: ${path}`)
    }
    normalizedPaths.add(path)
    return { ...file, path }
  })

  if (cwd !== '.' && !files.some((file) => file.path.startsWith(`${cwd}/`))) {
    throw new Error(`cwd does not identify a workspace directory: ${cwd}`)
  }
  if (!normalizedPaths.has(targetPath)) {
    throw new Error(`targetPath does not identify a workspace file: ${targetPath}`)
  }

  const normalizedInput: SimulationInput = {
    ...input,
    cwd,
    targetPath,
    workspace: {
      ...input.workspace,
      files,
    },
  }
  const ownEvents = adapters[input.provider](normalizedInput)
  const handled = new Set(ownEvents.map((event) => normalizePath(event.file.path)))
  const ignored = ignoredDialectEvents(normalizedInput, input.provider, handled)
  return finalizeEvents(input.provider, [...ownEvents, ...ignored])
}

export function simulateAll(input: Omit<SimulationInput, 'provider'>): SimulationResult[] {
  return (['codex', 'claude', 'cursor', 'copilot'] as const).map((provider) => {
    const events = simulate({ ...input, provider })
    return { provider, events, metrics: calculateMetrics(events) }
  })
}

function emptyActionCounts(): Record<ResolutionAction, number> {
  return { loaded: 0, deferred: 0, ignored: 0, omitted: 0, shadowed: 0, truncated: 0 }
}

export function calculateSummary(results: SimulationResult[]): SimulationSummary {
  const loaded = results.flatMap((result) =>
    result.events.filter((event) => event.action === 'loaded' || event.action === 'truncated'),
  )
  const sourcePaths = new Set(results.flatMap((result) => result.events.map((event) => event.sourcePath)))
  const signatures = new Set(results.map((result) =>
    result.events
      .filter((event) => event.action === 'loaded' || event.action === 'truncated')
      .map((event) => event.sourcePath)
      .sort()
      .join('|'),
  ))
  const actionCounts = results.flatMap((result) => result.events).reduce((counts, event) => {
    counts[event.action] += 1
    return counts
  }, emptyActionCounts())
  const possibleLoads = sourcePaths.size * Math.max(results.length, 1)
  return {
    providerCount: results.length,
    instructionSources: sourcePaths.size,
    loadedEvents: loaded.length,
    loadedBytes: loaded.reduce((total, event) => total + event.bytes, 0),
    estimatedTokens: loaded.reduce((total, event) => total + event.estimatedTokens, 0),
    portability: possibleLoads ? Math.round((loaded.length / possibleLoads) * 100) : 100,
    distinctContexts: signatures.size,
    actionCounts,
  }
}

export function calculatePortability(results: SimulationResult[]) {
  return calculateSummary(results).portability
}
