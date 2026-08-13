import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { toPng } from 'html-to-image'
import {
  Archive,
  Download,
  FolderOpen,
  GitBranch,
  LoaderCircle,
  PanelLeft,
  PanelRight,
  RefreshCcw,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { ContextControls } from './components/ContextControls'
import { FileTree } from './components/FileTree'
import { Inspector } from './components/Inspector'
import { SummaryStrip } from './components/SummaryStrip'
import { Waterfall } from './components/Waterfall'
import { simulateWorkspace } from './lib/simulation'
import {
  directoryOf,
  pickDefaultTarget,
  pickDirectoryWorkspace,
  supportsDirectoryPicker,
  workspaceFromZip,
  type WorkspaceImportResult,
} from './lib/workspace'
import { useRulefallStore } from './store/useRulefallStore'

type MobilePanel = 'files' | 'trace' | 'why'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The workspace could not be read.'
}

export default function App() {
  const {
    workspace,
    importWarnings,
    importComplete,
    cwd,
    targetPath,
    phase,
    selectedEventId,
    setWorkspace,
    setCwd,
    setTargetPath,
    setPhase,
    setSelectedEventId,
    resetDemo,
  } = useRulefallStore()
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('trace')
  const zipInputRef = useRef<HTMLInputElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const whyTabRef = useRef<HTMLButtonElement>(null)

  const results = useMemo(
    () => simulateWorkspace(workspace, cwd, targetPath, phase),
    [workspace, cwd, targetPath, phase],
  )
  const events = results.flatMap((result) => result.events)
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null

  const importWarning = importComplete
    ? null
    : `Incomplete analysis: ${importWarnings[0] ?? 'some repository content was not loaded.'}${importWarnings.length > 1 ? ` ${importWarnings.length - 1} more import warnings.` : ''}`

  function installWorkspace(result: WorkspaceImportResult) {
    if (result.workspace.files.length === 0) throw new Error('No readable text files were found.')
    const nextTarget = pickDefaultTarget(result.workspace)
    setWorkspace(
      result.workspace,
      nextTarget,
      directoryOf(nextTarget),
      result.warnings,
      result.complete,
    )
    setMobilePanel('trace')
  }

  function focusWhyOnMobile() {
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.requestAnimationFrame(() => whyTabRef.current?.focus())
    }
  }

  function handleMobileTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = [...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
    if (tabs.length === 0) return

    event.preventDefault()
    const currentIndex = tabs.indexOf(event.currentTarget)
    let nextIndex = currentIndex
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    tabs[nextIndex]?.click()
    tabs[nextIndex]?.focus()
  }

  async function openFolder() {
    if (!supportsDirectoryPicker()) {
      zipInputRef.current?.click()
      return
    }
    setNotice(null)
    setBusyLabel('Reading folder')
    try {
      installWorkspace(await pickDirectoryWorkspace())
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice(errorMessage(error))
    } finally {
      setBusyLabel(null)
    }
  }

  async function importZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setNotice(null)
    setBusyLabel('Unpacking archive')
    try {
      installWorkspace(await workspaceFromZip(file))
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusyLabel(null)
    }
  }

  async function exportReport() {
    if (!reportRef.current) return
    const confirmed = window.confirm([
      'Export this Rulefall report as a PNG?',
      '',
      `Workspace name: ${workspace.name}`,
      `Target path: ${targetPath}`,
      'The image can contain workspace paths and content excerpts from imported files.',
      '',
      'Continue only if you are comfortable saving this information in an image.',
    ].join('\n'))
    if (!confirmed) return

    setNotice(null)
    setBusyLabel('Rendering PNG')
    try {
      const url = await toPng(reportRef.current, {
        backgroundColor: '#111413',
        cacheBust: true,
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `rulefall-${workspace.name}-${phase}.png`
      link.href = url
      link.click()
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusyLabel(null)
    }
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-symbol" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="brand-name">Rulefall</span>
          <span className="version-tag">v0.1</span>
        </div>

        <div className="topbar-actions">
          <span className="privacy-status" title="Workspace files stay in this browser">
            <ShieldCheck size={15} /> <span>Local only</span>
          </span>
          <button type="button" className="icon-button reset-button" onClick={resetDemo} title="Reset demo" aria-label="Reset demo">
            <RefreshCcw size={16} />
          </button>
          <button type="button" className="button secondary-button" onClick={() => zipInputRef.current?.click()} disabled={Boolean(busyLabel)} aria-label="Import ZIP" title="Import a repository ZIP">
            <Archive size={16} /> <span>Import ZIP</span>
          </button>
          <button type="button" className="button primary-button" onClick={openFolder} disabled={Boolean(busyLabel)} aria-label="Open folder" title="Open a local repository folder">
            <FolderOpen size={16} /> <span>Open folder</span>
          </button>
          <button type="button" className="button export-button" onClick={exportReport} disabled={Boolean(busyLabel)} aria-label="Export PNG" title="Export the visible report as PNG">
            <Download size={16} /> <span>Export PNG</span>
          </button>
          <input ref={zipInputRef} className="visually-hidden" type="file" accept=".zip,application/zip" onChange={importZip} />
        </div>
      </header>

      {(notice || importWarning) && (
        <div
          className="notice-bar"
          role={notice ? 'alert' : 'status'}
          title={notice ?? importWarnings.join(' ')}
        >
          <span>{notice ?? importWarning}</span>
          {notice && <button type="button" onClick={() => setNotice(null)}>Dismiss</button>}
        </div>
      )}
      {busyLabel && <div className="busy-bar"><LoaderCircle size={14} /> {busyLabel}</div>}

      <div className="report-surface" ref={reportRef}>
        <ContextControls
          workspace={workspace}
          cwd={cwd}
          targetPath={targetPath}
          phase={phase}
          onCwdChange={setCwd}
          onTargetChange={setTargetPath}
          onPhaseChange={setPhase}
        />
        <SummaryStrip results={results} />

        <nav className="mobile-panel-tabs" aria-label="Workspace views" role="tablist">
          <button
            type="button"
            id="mobile-tab-files"
            role="tab"
            aria-controls="workspace-panel-files"
            aria-selected={mobilePanel === 'files'}
            tabIndex={mobilePanel === 'files' ? 0 : -1}
            className={mobilePanel === 'files' ? 'is-active' : ''}
            onClick={() => setMobilePanel('files')}
            onKeyDown={handleMobileTabKeyDown}
          ><PanelLeft size={15} /> Files</button>
          <button
            type="button"
            id="mobile-tab-trace"
            role="tab"
            aria-controls="workspace-panel-trace"
            aria-selected={mobilePanel === 'trace'}
            tabIndex={mobilePanel === 'trace' ? 0 : -1}
            className={mobilePanel === 'trace' ? 'is-active' : ''}
            onClick={() => setMobilePanel('trace')}
            onKeyDown={handleMobileTabKeyDown}
          ><Waypoints size={15} /> Trace</button>
          <button
            ref={whyTabRef}
            type="button"
            id="mobile-tab-why"
            role="tab"
            aria-controls="workspace-panel-why"
            aria-selected={mobilePanel === 'why'}
            tabIndex={mobilePanel === 'why' ? 0 : -1}
            className={mobilePanel === 'why' ? 'is-active' : ''}
            onClick={() => setMobilePanel('why')}
            onKeyDown={handleMobileTabKeyDown}
          ><PanelRight size={15} /> Why</button>
        </nav>

        <main className="workspace-grid">
          <div
            id="workspace-panel-files"
            className={`panel-slot file-slot ${mobilePanel === 'files' ? 'is-mobile-active' : ''}`}
            role="tabpanel"
            aria-labelledby="mobile-tab-files"
          >
            <FileTree
              workspace={workspace}
              cwd={cwd}
              targetPath={targetPath}
              onCwdChange={setCwd}
              onTargetChange={setTargetPath}
            />
          </div>
          <div
            id="workspace-panel-trace"
            className={`panel-slot trace-slot ${mobilePanel === 'trace' ? 'is-mobile-active' : ''}`}
            role="tabpanel"
            aria-labelledby="mobile-tab-trace"
          >
            <Waterfall
              results={results}
              phase={phase}
              selectedEventId={selectedEventId}
              onSelectEvent={(event) => {
                setSelectedEventId(event.id)
                setMobilePanel('why')
                focusWhyOnMobile()
              }}
            />
          </div>
          <div
            id="workspace-panel-why"
            className={`panel-slot why-slot ${mobilePanel === 'why' ? 'is-mobile-active' : ''}`}
            role="tabpanel"
            aria-labelledby="mobile-tab-why"
          >
            <Inspector
              event={selectedEvent}
              results={results}
              onShowCompare={() => setSelectedEventId(null)}
            />
          </div>
        </main>
      </div>

      <footer className="statusbar">
        <span><GitBranch size={12} /> {workspace.name}</span>
        <span>{cwd === '.' ? './' : `./${cwd}`}</span>
        <span className="status-target">{targetPath}</span>
        <span
          className={importComplete ? 'status-ready' : undefined}
          title={importComplete ? undefined : importWarnings.join(' ')}
        >
          {importComplete && <i />} {importComplete ? 'simulation ready' : 'incomplete analysis'}
        </span>
      </footer>
    </div>
  )
}
