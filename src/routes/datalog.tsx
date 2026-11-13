import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { TrendChart } from '../components/trend-chart'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { ecuProfile, round, toCsv, toMsl } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/datalog']

export const Route = createFileRoute('/datalog')({
  head: () => {
    const canonical = canonicalUrl('/datalog')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: DatalogPage,
})

function DatalogPage() {
  const { state, dispatch } = useTuner()
  const { sim, recording, logs } = state
  const profile = ecuProfile(state.tune.ecu)
  const logLabel = profile.logFormat.startsWith('MSL') ? 'MSL' : 'CSV'
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = logs.find((log) => log.id === selectedId) ?? logs[0] ?? null
  const samples = selected?.samples ?? []
  const avgAfr =
    samples.length > 0
      ? round(samples.reduce((sum, item) => sum + item.afr, 0) / samples.length, 2)
      : 0
  const maxRpm = samples.reduce((max, item) => Math.max(max, item.rpm), 0)
  const knockCount = samples.filter((item) => item.knock).length

  const download = (log = selected) => {
    if (!log) return
    const blob = new Blob([toCsv(log.samples)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${log.name.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadMsl = (log = selected) => {
    if (!log) return
    const blob = new Blob([toMsl(log.samples, state.tune.name)], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${log.name.replace(/\s+/g, '-').toLowerCase()}.msl`
    link.click()
    URL.revokeObjectURL(url)
    dispatch({ type: 'event', text: `Datalog exportado en MSL · ${log.samples.length} muestras`, tone: 'ok' })
  }

  return (
    <AppShell
      title="Datalogger"
      subtitle="Graba sesiones de telemetría, revisa las trazas y exporta los datos a CSV para analizarlos fuera de la app."
      actions={
        <button
          type="button"
          className={`btn ${recording ? 'btn-hot' : ''}`}
          onClick={() =>
            dispatch({ type: recording ? 'stopRecording' : 'startRecording' })
          }
          data-testid="record-toggle"
          aria-pressed={Boolean(recording)}
        >
          <span className={`led ${recording ? '' : 'led-idle'}`} aria-hidden="true" />
          {recording ? `Detener grabación (${recording.samples.length})` : 'Grabar datalog'}
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                {selected ? selected.name : 'Telemetría en vivo'}
              </h2>
              <span className="kicker text-[0.55rem]">
                {selected
                  ? `${selected.samples.length} muestras · ${(selected.durationMs / 1000).toFixed(1)} s`
                  : 'motor en vivo'}
              </span>
            </div>
            <div className="p-3">
              <TrendChart samples={selected ? samples : sim.history} preset="live" height={220} />
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Logs guardados
              </h2>
              <span className="tag">{logs.length}</span>
            </div>
            {logs.length === 0 ? (
              <p className="p-4 text-sm text-ink-dim">
                Todavía no hay logs. Pulsa Grabar datalog, deja correr el motor y detén la grabación
                para guardar la sesión.
              </p>
            ) : (
              <ul className="divide-y divide-panel-line/50">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setSelectedId(log.id)}
                      aria-pressed={selected?.id === log.id}
                    >
                      <span className="display block text-sm text-ink">{log.name}</span>
                      <span className="num block text-[0.65rem] text-ink-dim">
                        {new Date(log.startedAt).toLocaleTimeString('es-ES')} ·{' '}
                        {log.samples.length} muestras · {(log.durationMs / 1000).toFixed(1)} s
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSelectedId(log.id)
                          download(log)
                        }}
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSelectedId(log.id)
                          downloadMsl(log)
                        }}
                        aria-label={`Exportar ${log.name} en MSL`}
                      >
                        MSL
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => dispatch({ type: 'deleteLog', id: log.id })}
                        aria-label={`Eliminar ${log.name}`}
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Resumen del log</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout label="Muestras" value={String(samples.length)} />
              <Readout
                label="Duración"
                value={selected ? (selected.durationMs / 1000).toFixed(1) : '0.0'}
                unit="s"
              />
              <Readout
                label="AFR medio"
                value={avgAfr > 0 ? avgAfr.toFixed(2) : '--'}
                tone="good"
              />
              <Readout label="RPM máx" value={maxRpm > 0 ? String(maxRpm) : '--'} tone="hot" />
              <Readout
                label="Eventos knock"
                value={String(knockCount)}
                tone={knockCount > 0 ? 'danger' : 'default'}
              />
              <Readout
                label="Grabando"
                value={recording ? `${recording.samples.length}` : 'no'}
                hint={recording ? 'muestras en buffer' : undefined}
              />
            </div>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Canales registrados</span>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-[0.7rem] text-ink-dim">
              {['RPM', 'MAP', 'TPS', 'AFR', 'AFR obj.', 'Avance', 'Duty', 'VE', 'Temp.', 'Knock'].map(
                (channel) => (
                  <li key={channel} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-hot" aria-hidden="true" />
                    {channel}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-2 text-[0.65rem] leading-snug text-ink-dim">
              Formato {profile.logFormat} · {profile.short}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => download()}
                disabled={!selected}
              >
                CSV
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => downloadMsl()}
                disabled={!selected}
                data-testid="export-msl"
              >
                MSL
              </button>
            </div>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Buenas prácticas</span>
            <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
              Graba al menos un ciclo completo con aceleraciones progresivas y sostén la carga unos
              segundos por zona para que VE Analyze tenga datos suficientes.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
