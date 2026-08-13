import {
  calculatePortability as calculateCorePortability,
  formatBytes,
  phaseOrder,
  providerDefinitions,
  shortPath,
  simulateAll,
  type LifecyclePhase,
  type ResolutionAction,
  type SimulationResult,
  type WorkspaceSnapshot,
} from '../core'

export type UiSimulationResult = SimulationResult

export {
  formatBytes,
  phaseOrder,
  providerDefinitions,
  shortPath,
}

export function simulateWorkspace(
  workspace: WorkspaceSnapshot,
  cwd: string,
  targetPath: string,
  phase: LifecyclePhase,
): UiSimulationResult[] {
  return simulateAll({ workspace, cwd, targetPath, phase })
}

export function calculatePortability(results: UiSimulationResult[]) {
  return calculateCorePortability(results)
}

export function reachesContext(action: ResolutionAction) {
  return action === 'loaded' || action === 'truncated'
}
