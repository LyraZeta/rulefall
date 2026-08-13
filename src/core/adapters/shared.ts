import type {
  Confidence,
  LifecyclePhase,
  ProviderId,
  RepoFile,
  ResolutionAction,
  ResolutionEvent,
  SimulationInput,
} from '../types'
import { fileEventParts, normalizePath, phaseOrder } from '../helpers'
import { getProvider } from '../providers'

export interface DraftEvent {
  file: RepoFile
  action: ResolutionAction
  phase: LifecyclePhase
  ruleKind: string
  reason: string
  confidence: Confidence
  renderedContent?: string
  sourceLines?: [number, number]
}

export type ProviderAdapter = (input: SimulationInput) => DraftEvent[]

export function phaseReached(selected: LifecyclePhase, event: LifecyclePhase) {
  return phaseOrder.indexOf(selected) >= phaseOrder.indexOf(event)
}

export function deferredUntil(
  input: SimulationInput,
  phase: LifecyclePhase,
  loadedReason: string,
  waitingReason: string,
): Pick<DraftEvent, 'action' | 'reason'> {
  return phaseReached(input.phase, phase)
    ? { action: 'loaded', reason: loadedReason }
    : { action: 'deferred', reason: waitingReason }
}

export function isInstructionFile(path: string) {
  const normalized = normalizePath(path)
  return (
    /(?:^|\/)AGENTS(?:\.override)?\.md$/.test(normalized) ||
    /(?:^|\/)(?:\.claude\/)?CLAUDE\.md$/.test(normalized) ||
    /(?:^|\/)\.cursor\/rules\/[^/]+\.mdc$/.test(normalized) ||
    normalized === '.cursorrules' ||
    normalized === '.github/copilot-instructions.md' ||
    /^\.github\/instructions\/.+\.instructions\.md$/.test(normalized)
  )
}

function dialect(path: string) {
  if (/AGENTS/.test(path)) return 'Codex AGENTS instructions'
  if (/CLAUDE/.test(path)) return 'Claude project memory'
  if (/\.mdc$/.test(path) || normalizePath(path) === '.cursorrules') return 'Cursor project rule'
  return 'Copilot custom instructions'
}

function genericPhase(path: string): LifecyclePhase {
  if (/\.mdc$|\.instructions\.md$/.test(path)) return 'edit'
  if (!normalizePath(path).includes('/')) return 'startup'
  return 'discovery'
}

export function ignoredDialectEvents(
  input: SimulationInput,
  provider: ProviderId,
  handledPaths: Set<string>,
): DraftEvent[] {
  return input.workspace.files
    .filter((file) => isInstructionFile(file.path))
    .filter((file) => !handledPaths.has(normalizePath(file.path)))
    .map((file) => ({
      file,
      action: 'ignored',
      phase: genericPhase(file.path),
      ruleKind: dialect(file.path),
      reason: `${getProvider(provider).shortLabel} does not consume the ${dialect(file.path)} file format.`,
      confidence: 'exact',
    }))
}

const phaseRank: Record<LifecyclePhase, number> = { startup: 0, discovery: 1, edit: 2 }

export function finalizeEvents(provider: ProviderId, drafts: DraftEvent[]): ResolutionEvent[] {
  return drafts
    .sort((left, right) => phaseRank[left.phase] - phaseRank[right.phase])
    .map((draft, index) => {
      const sourcePath = normalizePath(draft.file.path)
      const content = draft.renderedContent ?? draft.file.content
      const parts = fileEventParts(draft.file, content)
      return {
        id: `${provider}:${sourcePath}:${draft.phase}:${draft.action}`,
        provider,
        sourcePath,
        action: draft.action,
        phase: draft.phase,
        ruleKind: draft.ruleKind,
        reason: draft.reason,
        confidence: draft.confidence,
        docRef: getProvider(provider).docRef ?? '',
        order: index + 1,
        ...parts,
        sourceLines: Object.hasOwn(draft, 'sourceLines') ? draft.sourceLines : parts.sourceLines,
      }
    })
}
