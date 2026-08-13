export type ProviderId = 'codex' | 'claude' | 'cursor' | 'copilot'

export type LifecyclePhase = 'startup' | 'discovery' | 'edit'

export type ResolutionAction =
  | 'loaded'
  | 'deferred'
  | 'ignored'
  | 'omitted'
  | 'shadowed'
  | 'truncated'

export type Confidence = 'exact' | 'conditional' | 'best-effort'

export interface RepoFile {
  path: string
  content: string
}

export interface WorkspaceSnapshot {
  name: string
  files: RepoFile[]
}

export interface SimulationInput {
  provider: ProviderId
  workspace: WorkspaceSnapshot
  cwd: string
  targetPath: string
  phase: LifecyclePhase
}

export interface ResolutionEvent {
  id: string
  provider: ProviderId
  sourcePath: string
  sourceLines?: [number, number]
  action: ResolutionAction
  phase: LifecyclePhase
  ruleKind: string
  bytes: number
  estimatedTokens: number
  reason: string
  confidence: Confidence
  docRef: string
  order: number
  excerpt: string
}

export interface SimulationMetrics {
  loadedFiles: number
  loadedBytes: number
  estimatedTokens: number
  actionCounts: Record<ResolutionAction, number>
  confidenceCounts: Record<Confidence, number>
}

export interface SimulationResult {
  provider: ProviderId
  events: ResolutionEvent[]
  metrics: SimulationMetrics
}

export interface SimulationSummary {
  providerCount: number
  instructionSources: number
  loadedEvents: number
  loadedBytes: number
  estimatedTokens: number
  portability: number
  distinctContexts: number
  actionCounts: Record<ResolutionAction, number>
}

export interface ProviderDefinition {
  id: ProviderId
  label: string
  accent: string
  shortLabel: string
  description: string
  docRef?: string
  recognizedFiles?: string[]
  caveat?: string
}
