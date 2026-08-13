import { create } from 'zustand'
import type { LifecyclePhase, WorkspaceSnapshot } from '../core'
import { demoWorkspace } from '../data/demoWorkspace'

interface RulefallState {
  workspace: WorkspaceSnapshot
  importWarnings: string[]
  importComplete: boolean
  cwd: string
  targetPath: string
  phase: LifecyclePhase
  selectedEventId: string | null
  setWorkspace: (
    workspace: WorkspaceSnapshot,
    targetPath: string,
    cwd: string,
    warnings?: string[],
    complete?: boolean,
  ) => void
  setCwd: (cwd: string) => void
  setTargetPath: (targetPath: string) => void
  setPhase: (phase: LifecyclePhase) => void
  setSelectedEventId: (id: string | null) => void
  resetDemo: () => void
}

const demoTarget = 'apps/web/src/payments/refund.ts'
const demoCwd = 'apps/web/src'

export const useRulefallStore = create<RulefallState>((set) => ({
  workspace: demoWorkspace,
  importWarnings: [],
  importComplete: true,
  cwd: demoCwd,
  targetPath: demoTarget,
  phase: 'edit',
  selectedEventId: null,
  setWorkspace: (workspace, targetPath, cwd, importWarnings = [], importComplete = true) =>
    set({
      workspace,
      importWarnings: [...importWarnings],
      importComplete: importComplete && importWarnings.length === 0,
      targetPath,
      cwd,
      selectedEventId: null,
    }),
  setCwd: (cwd) => set({ cwd, selectedEventId: null }),
  setTargetPath: (targetPath) => set({ targetPath, selectedEventId: null }),
  setPhase: (phase) => set({ phase, selectedEventId: null }),
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
  resetDemo: () =>
    set({
      workspace: demoWorkspace,
      importWarnings: [],
      importComplete: true,
      cwd: demoCwd,
      targetPath: demoTarget,
      phase: 'edit',
      selectedEventId: null,
    }),
}))
