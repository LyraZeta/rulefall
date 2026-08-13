import { useState, type CSSProperties } from 'react'
import {
  Check,
  CircleSlash2,
  Clock3,
  Layers3,
  Scissors,
} from 'lucide-react'
import type { LifecyclePhase, ResolutionAction, ResolutionEvent } from '../core'
import {
  phaseOrder,
  providerDefinitions,
  shortPath,
  type UiSimulationResult,
} from '../lib/simulation'

interface WaterfallProps {
  results: UiSimulationResult[]
  phase: LifecyclePhase
  selectedEventId: string | null
  onSelectEvent: (event: ResolutionEvent) => void
}

const phaseLabels: Record<LifecyclePhase, string> = {
  startup: 'Startup',
  discovery: 'Discovery',
  edit: 'Edit context',
}

function ActionIcon({ action }: { action: ResolutionAction }) {
  if (action === 'loaded') return <Check size={12} strokeWidth={2.5} />
  if (action === 'deferred') return <Clock3 size={12} />
  if (action === 'shadowed') return <Layers3 size={12} />
  if (action === 'truncated') return <Scissors size={12} />
  return <CircleSlash2 size={12} />
}

function EventButton({
  event,
  selected,
  onSelect,
}: {
  event: ResolutionEvent
  selected: boolean
  onSelect: () => void
}) {
  const basename = event.sourcePath.split('/').pop() ?? event.sourcePath
  return (
    <button
      type="button"
      className={`event-chip action-${event.action} ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      title={`${event.sourcePath} · ${event.reason}`}
    >
      <span className="event-status"><ActionIcon action={event.action} /></span>
      <span className="event-copy">
        <strong>{basename}</strong>
        <small>{shortPath(event.sourcePath)}</small>
      </span>
      <span className="event-meta">
        <em>{event.action}</em>
        <b>{event.estimatedTokens}t</b>
      </span>
    </button>
  )
}

export function Waterfall({ results, phase, selectedEventId, onSelectEvent }: WaterfallProps) {
  const phaseLimit = phaseOrder.indexOf(phase)
  const [showIgnored, setShowIgnored] = useState(false)

  return (
    <section className="panel waterfall-panel">
      <div className="panel-heading waterfall-heading">
        <div><span className="eyebrow">Resolution trace</span><h2>Agent waterfall</h2></div>
        <div className="action-legend" aria-label="Event status legend">
          <span><i className="legend-loaded" /> loaded</span>
          <span><i className="legend-deferred" /> deferred</span>
          <button type="button" onClick={() => setShowIgnored((visible) => !visible)} aria-pressed={showIgnored}>
            <i className="legend-ignored" /> {showIgnored ? 'hide ignored' : 'show ignored'}
          </button>
        </div>
      </div>

      <div className="waterfall-scroll">
        <div className="waterfall-grid">
          <div className="lane-axis-label">Agent</div>
          {phaseOrder.map((item, index) => (
            <div className={`phase-axis ${index > phaseLimit ? 'is-future' : ''}`} key={item}>
              <span>{index + 1}</span>
              <strong>{phaseLabels[item]}</strong>
            </div>
          ))}

          {results.map((result) => {
            const provider = providerDefinitions.find((item) => item.id === result.provider)
            const style = { '--provider-accent': provider?.accent } as CSSProperties
            return (
              <div className="lane-row" style={style} key={result.provider}>
                <div className="lane-label">
                  <i />
                  <strong>{provider?.shortLabel ?? result.provider}</strong>
                  <span>{result.metrics.estimatedTokens} tokens</span>
                </div>
                {phaseOrder.map((item, index) => {
                  const events = result.events.filter((event) => event.phase === item)
                  const visibleEvents = showIgnored
                    ? events
                    : events.filter((event) => event.action !== 'ignored')
                  const ignoredCount = events.length - visibleEvents.length
                  return (
                    <div
                      className={`phase-cell ${index > phaseLimit ? 'is-future' : ''}`}
                      key={item}
                    >
                      {visibleEvents.length > 0 ? visibleEvents.map((event) => (
                        <EventButton
                          key={event.id}
                          event={event}
                          selected={selectedEventId === event.id}
                          onSelect={() => onSelectEvent(event)}
                        />
                      )) : (
                        <span className="no-event">No events</span>
                      )}
                      {ignoredCount > 0 && (
                        <button type="button" className="ignored-summary" onClick={() => setShowIgnored(true)}>
                          <CircleSlash2 size={11} /> {ignoredCount} other dialect{ignoredCount === 1 ? '' : 's'} hidden
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
