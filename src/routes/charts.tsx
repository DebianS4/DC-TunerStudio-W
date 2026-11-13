import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { ChannelPicker, ChannelStats, MultiChart, useChannels } from '../components/charts'
import { useTuner } from '../lib/tuner-store'
import { toCsv } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/charts']

export const Route = createFileRoute('/charts')({
  head: () => {
    const canonical = canonicalUrl('/charts')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: ChartsPage,
})

const WINDOWS = [
  { label: 'Últimos 15 s', value: 120 },
  { label: 'Últimos 30 s', value: 240 },
  { label: 'Todo el log', value: 0 },
]

function ChartsPage() {
  const { state } = useTuner()
  const { channels, toggle } = useChannels(['rpm', 'afr', 'targetAfr', 'map'])
  const [source, setSource] = useState<'live' | 'log'>('live')
  const [logId, setLogId] = useState<string>('')
  const [windowSize, setWindowSize] = useState(240)

  const log = state.logs.find((item) => item.id === logId) ?? state.logs[0] ?? null
  const base = source === 'log' ? (log?.samples ?? []) : state.sim.history
  const samples = windowSize > 0 && source === 'live' ? base.slice(-windowSize) : base
  const knockCount = samples.filter((sample) => sample.knock).length

  const exportCsv = () => {
    if (samples.length === 0) return
    const blob = new Blob([toCsv(samples)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'dc-tuner-graficas.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      title="Gráficas completas"
      subtitle="Analiza todos los canales de la telemetría: elige señales, ventana temporal, compara AFR real contra objetivo y revisa estadísticas."
      actions={
        <>
          <span className="tag">{samples.length} muestras</span>
          <button type="button" className="btn" onClick={exportCsv} disabled={samples.length === 0}>
            Exportar CSV
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="panel">
          <div className="panel-head flex-wrap gap-2">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Señales
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-panel-line p-0.5" role="group" aria-label="Origen de datos">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                    source === 'live' ? 'bg-hot/15 text-hot' : 'text-ink-dim'
                  }`}
                  aria-pressed={source === 'live'}
                  onClick={() => setSource('live')}
                  data-testid="source-live"
                >
                  En vivo
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                    source === 'log' ? 'bg-hot/15 text-hot' : 'text-ink-dim'
                  }`}
                  aria-pressed={source === 'log'}
                  onClick={() => setSource('log')}
                  data-testid="source-log"
                >
                  Datalog
                </button>
              </div>
              {source === 'log' ? (
                <select
                  className="field w-44"
                  value={log?.id ?? ''}
                  onChange={(event) => setLogId(event.target.value)}
                  aria-label="Log a representar"
                >
                  {state.logs.length === 0 ? <option value="">Sin logs</option> : null}
                  {state.logs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="field w-40"
                  value={windowSize}
                  onChange={(event) => setWindowSize(Number(event.target.value))}
                  aria-label="Ventana temporal"
                >
                  {WINDOWS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="space-y-3 p-3">
            <ChannelPicker selected={channels} onToggle={toggle} />
            <MultiChart samples={samples} channels={channels} height={340} />
            <p className="text-[0.68rem] text-ink-dim">
              Las líneas verticales rojas marcan eventos de knock. {knockCount} detectados en esta
              vista.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Estadísticas por canal
            </h2>
            <span className="kicker text-[0.55rem]">mín · medio · máx · actual</span>
          </div>
          <div className="p-3">
            <ChannelStats samples={samples} channels={channels} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
