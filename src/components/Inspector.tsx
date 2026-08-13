import type { CSSProperties } from 'react'
import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  Braces,
  CheckCircle2,
  CircleGauge,
  FileText,
  GitCompareArrows,
  Hash,
  RotateCcw,
} from 'lucide-react'
import type { ResolutionEvent } from '../core'
import {
  formatBytes,
  providerDefinitions,
  reachesContext,
  type UiSimulationResult,
} from '../lib/simulation'

interface InspectorProps {
  event: ResolutionEvent | null
  results: UiSimulationResult[]
  onShowCompare: () => void
}

function CompareView({ results }: { results: UiSimulationResult[] }) {
  const sourcePaths = [...new Set(results.flatMap((result) => result.events.map((event) => event.sourcePath)))]
  const divergences = sourcePaths
    .map((path) => ({
      path,
      loadedBy: results.filter((result) =>
        result.events.some((event) => event.sourcePath === path && reachesContext(event.action)),
      ).map((result) => result.provider),
    }))
    .filter((item) => item.loadedBy.length > 0)
    .sort((a, b) => a.loadedBy.length - b.loadedBy.length)

  return (
    <>
      <div className="inspector-heading">
        <span className="eyebrow">Why</span>
        <h2>Agent comparison</h2>
      </div>
      <div className="compare-intro">
        <GitCompareArrows size={18} />
        <span>Same repository context</span>
      </div>
      <div className="provider-table">
        {results.map((result) => {
          const provider = providerDefinitions.find((item) => item.id === result.provider)
          return (
            <div className="provider-row" key={result.provider}>
              <i style={{ backgroundColor: provider?.accent }} />
              <div><strong>{provider?.shortLabel}</strong><span>{result.metrics.loadedFiles} sources loaded</span></div>
              <b>{result.metrics.estimatedTokens}<small> tokens</small></b>
            </div>
          )
        })}
      </div>
      <div className="inspector-section">
        <h3><BarChart3 size={14} /> Source portability</h3>
        <div className="divergence-list">
          {divergences.slice(0, 6).map((item) => (
            <div key={item.path}>
              <span title={item.path}>{item.path}</span>
              <b>{item.loadedBy.length}/4</b>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Inspector({ event, results, onShowCompare }: InspectorProps) {
  if (!event) return <aside className="panel inspector-panel"><CompareView results={results} /></aside>

  const provider = providerDefinitions.find((item) => item.id === event.provider)
  const reachedContext = reachesContext(event.action)
  const style = { '--provider-accent': provider?.accent } as CSSProperties
  return (
    <aside className="panel inspector-panel" style={style}>
      <div className="inspector-heading with-action">
        <div><span className="eyebrow">Why</span><h2>{reachedContext ? 'Rule reached context' : 'Rule stayed out'}</h2></div>
        <button type="button" className="icon-button" onClick={onShowCompare} title="Agent comparison" aria-label="Show agent comparison">
          <GitCompareArrows size={17} />
        </button>
      </div>

      <div className={`event-verdict action-${event.action}`}>
        {reachedContext ? <CheckCircle2 size={19} /> : <CircleGauge size={19} />}
        <div><strong>{event.action}</strong><span>{provider?.label}</span></div>
      </div>

      <p className="reason-copy">{event.reason}</p>

      <dl className="event-facts">
        <div><dt><FileText size={13} /> Source</dt><dd title={event.sourcePath}>{event.sourcePath}</dd></div>
        <div><dt><Braces size={13} /> Kind</dt><dd>{event.ruleKind}</dd></div>
        <div><dt><Hash size={13} /> Order</dt><dd>{event.order}</dd></div>
        <div><dt><ArrowDownToLine size={13} /> Context</dt><dd>{event.estimatedTokens} tokens · {formatBytes(event.bytes)}</dd></div>
        <div><dt><CircleGauge size={13} /> Confidence</dt><dd>{event.confidence}</dd></div>
      </dl>

      <div className="inspector-section">
        <h3><BookOpen size={14} /> Matched content</h3>
        <pre>{event.excerpt || 'No content preview'}</pre>
      </div>

      <div className="doc-reference">
        <RotateCcw size={13} />
        <span>{event.phase} · <a href={event.docRef} target="_blank" rel="noreferrer">Official resolution reference</a></span>
      </div>
    </aside>
  )
}
