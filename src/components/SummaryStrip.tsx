import { Activity, Files, Gauge, Sigma } from 'lucide-react'
import {
  calculatePortability,
  formatBytes,
  providerDefinitions,
  reachesContext,
  type UiSimulationResult,
} from '../lib/simulation'

interface SummaryStripProps {
  results: UiSimulationResult[]
}

export function SummaryStrip({ results }: SummaryStripProps) {
  const portability = calculatePortability(results)
  const loadedEvents = results.flatMap((result) =>
    result.events.filter((event) => reachesContext(event.action)),
  )
  const tokens = loadedEvents.reduce((total, event) => total + event.estimatedTokens, 0)
  const bytes = loadedEvents.reduce((total, event) => total + event.bytes, 0)
  const maxTokens = Math.max(...results.map((result) => result.metrics.estimatedTokens), 1)

  return (
    <section className="summary-strip" aria-label="Simulation summary">
      <div className="portability-score">
        <span className="summary-icon"><Gauge size={17} /></span>
        <div>
          <span className="summary-label">Portability</span>
          <strong>{portability}<small>/100</small></strong>
        </div>
        <div className="score-track" aria-hidden="true">
          <span style={{ width: `${portability}%` }} />
        </div>
      </div>

      <div className="summary-metric">
        <Files size={16} />
        <div><strong>{loadedEvents.length}</strong><span>loaded events</span></div>
      </div>
      <div className="summary-metric">
        <Sigma size={16} />
        <div><strong>{tokens.toLocaleString()}</strong><span>est. tokens</span></div>
      </div>
      <div className="summary-metric summary-bytes">
        <Activity size={16} />
        <div><strong>{formatBytes(bytes)}</strong><span>context bytes</span></div>
      </div>

      <div className="agent-compare" aria-label="Agent token comparison">
        <span className="summary-label">Agent compare</span>
        <div className="compare-bars">
          {results.map((result) => {
            const provider = providerDefinitions.find((item) => item.id === result.provider)
            return (
              <div className="compare-bar" key={result.provider}>
                <span>{provider?.shortLabel ?? result.provider}</span>
                <div><i style={{
                  width: `${Math.max((result.metrics.estimatedTokens / maxTokens) * 100, 3)}%`,
                  backgroundColor: provider?.accent,
                }} /></div>
                <b>{result.metrics.estimatedTokens}</b>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
