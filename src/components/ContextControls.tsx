import { FolderTree, GitCommitHorizontal, LocateFixed } from 'lucide-react'
import type { LifecyclePhase, WorkspaceSnapshot } from '../core'
import { phaseOrder } from '../lib/simulation'
import { getDirectories } from '../lib/workspace'

interface ContextControlsProps {
  workspace: WorkspaceSnapshot
  cwd: string
  targetPath: string
  phase: LifecyclePhase
  onCwdChange: (cwd: string) => void
  onTargetChange: (targetPath: string) => void
  onPhaseChange: (phase: LifecyclePhase) => void
}
const phaseLabels: Record<LifecyclePhase, string> = {
  startup: 'Startup',
  discovery: 'Discovery',
  edit: 'Edit',
}

export function ContextControls({
  workspace,
  cwd,
  targetPath,
  phase,
  onCwdChange,
  onTargetChange,
  onPhaseChange,
}: ContextControlsProps) {
  const directories = getDirectories(workspace)

  return (
    <section className="context-bar" aria-label="Simulation context">
      <div className="context-identity">
        <span className="workspace-mark" aria-hidden="true">
          <FolderTree size={17} />
        </span>
        <div>
          <span className="control-label">Workspace</span>
          <strong>{workspace.name}</strong>
        </div>
        <span className="file-count">{workspace.files.length} files</span>
      </div>

      <label className="select-control">
        <span className="control-label">
          <LocateFixed size={13} /> Working directory
        </span>
        <select value={cwd} onChange={(event) => onCwdChange(event.target.value)}>
          {directories.map((directory) => (
            <option key={directory} value={directory}>
              {directory === '.' ? './ (repository root)' : `./${directory}`}
            </option>
          ))}
        </select>
      </label>

      <label className="select-control target-control">
        <span className="control-label">
          <GitCommitHorizontal size={13} /> Target file
        </span>
        <select value={targetPath} onChange={(event) => onTargetChange(event.target.value)}>
          {workspace.files.map((file) => (
            <option key={file.path} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
      </label>

      <div className="phase-control">
        <span className="control-label">Lifecycle</span>
        <div className="phase-segments" role="group" aria-label="Lifecycle phase">
          <span
            className="phase-progress"
            style={{ width: `${(phaseOrder.indexOf(phase) / 2) * 100}%` }}
            aria-hidden="true"
          />
          {phaseOrder.map((item, index) => (
            <button
              key={item}
              type="button"
              className={item === phase ? 'is-active' : ''}
              aria-pressed={item === phase}
              onClick={() => onPhaseChange(item)}
            >
              <span className="phase-dot">{index + 1}</span>
              {phaseLabels[item]}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
