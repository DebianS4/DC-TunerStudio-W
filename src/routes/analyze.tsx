import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { ArcGauge, Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { correctionsCsv, ecuProfile, interp, nearestCell, round } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/analyze']

export const Route = createFileRoute('/analyze')({
  head: () => {
    const canonical = canonicalUrl('/analyze')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: AnalyzePage,
})

function AnalyzePage() {
  const { state, dispatch } = useTuner()
  const { sim, tune, analyze } = state
  const profile = ecuProfile(tune.ecu)
  const cell = nearestCell(sim.rpm, sim.map)
  const target = sim.running
    ? interp(tune.afrTarget, sim.rpm, sim.map)
    : interp(tune.afrTarget, tune.engine.idleRpm, 32)
  const error = sim.afr > 0 ? round(sim.afr - target, 2) : 0
  const strength = Math.round(tune.engine.analyzeStrength * 100)

  return (
    <AppShell
      title={profile.analyzeName}
      subtitle={`Ajuste automático de la tabla de combustible sobre ${profile.name} mientras el motor funciona. La ECU virtual corrige cada celda hacia el AFR objetivo.`}
      actions={
        <button
          type="button"
          className={`btn ${analyze.active ? 'btn-hot' : ''}`}
          onClick={() => dispatch({ type: 'toggleAnalyze' })}
          aria-pressed={analyze.active}
          data-testid="analyze-toggle"
        >
          {analyze.active ? 'Detener análisis' : 'Iniciar análisis'}
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Estado del análisis
              </h2>
              <span
                className="tag"
                style={{
                  color: analyze.active ? 'hsl(var(--good))' : undefined,
                  borderColor: analyze.active ? 'hsl(var(--good) / 0.5)' : undefined,
                }}
              >
                <span className={`led ${analyze.active ? '' : 'led-idle'}`} aria-hidden="true" />
                {analyze.active ? 'Analizando' : 'En pausa'}
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex justify-center">
                <ArcGauge
                  label="AFR real"
                  value={sim.afr}
                  min={10}
                  max={18}
                  decimals={2}
                  size="lg"
                  accent="good"
                  warnAt={15.4}
                  dangerAt={16.2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Readout label="AFR objetivo" value={target.toFixed(2)} />
                <Readout
                  label="Error de mezcla"
                  value={sim.afr > 0 ? `${error > 0 ? '+' : ''}${error.toFixed(2)}` : '--'}
                  tone={Math.abs(error) > 0.4 ? 'warn' : 'good'}
                />
                <Readout
                  label="Celdas corregidas"
                  value={String(analyze.corrections)}
                  tone="hot"
                  hint="acumulado de la sesión"
                />
                <Readout
                  label="Celda activa"
                  value={`${cell.row + 1}-${cell.col + 1}`}
                  hint={`VE ${round(tune.ve[cell.row][cell.col], 1).toFixed(1)}%`}
                />
              </div>
            </div>
            <div className="border-t border-panel-line/70 p-4">
              <label htmlFor="strength" className="flex items-baseline justify-between">
                <span className="kicker text-[0.55rem]">Agresividad de corrección</span>
                <span className="num text-xs text-ink">{strength}%</span>
              </label>
              <input
                id="strength"
                type="range"
                min="10"
                max="100"
                step="5"
                value={strength}
                onChange={(event) =>
                  dispatch({
                    type: 'patchEngine',
                    patch: { analyzeStrength: Number(event.target.value) / 100 },
                  })
                }
                className="mt-2 w-full accent-[hsl(var(--hot))]"
                aria-label="Agresividad de corrección de VE Analyze"
              />
              <p className="mt-1 text-[0.7rem] text-ink-dim">
                Baja la agresividad si la tabla oscila; súbela para converger más rápido.
              </p>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Correcciones recientes
              </h2>
              <span className="tag">{analyze.log.length}</span>
            </div>
            {analyze.log.length === 0 ? (
              <p className="p-4 text-sm text-ink-dim">
                Sin correcciones todavía. Arranca el motor y activa el análisis para ver los ajustes
                celda por celda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[0.75rem]">
                  <thead>
                    <tr className="border-b border-panel-line/70 text-ink-dim">
                      <th className="kicker px-3 py-2 font-semibold">Celda</th>
                      <th className="kicker px-3 py-2 font-semibold">Antes</th>
                      <th className="kicker px-3 py-2 font-semibold">Después</th>
                      <th className="kicker px-3 py-2 font-semibold">AFR</th>
                      <th className="kicker px-3 py-2 font-semibold">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyze.log.map((entry) => (
                      <tr key={entry.id} className="border-b border-panel-line/40 last:border-0">
                        <td className="num px-3 py-2 text-ink">{entry.cell}</td>
                        <td className="num px-3 py-2 text-ink-dim">{entry.before.toFixed(1)}</td>
                        <td className="num px-3 py-2 text-hot">{entry.after.toFixed(1)}</td>
                        <td className="num px-3 py-2 text-ink-dim">{entry.afr.toFixed(2)}</td>
                        <td className="num px-3 py-2 text-ink-dim">{entry.targetAfr.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Objetivos de mezcla</span>
            <div className="mt-2 space-y-2">
              <NumberField
                label="Ralentí"
                value={tune.engine.afrIdle}
                step={0.1}
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { afrIdle: value } })
                }
              />
              <NumberField
                label="Crucero"
                value={tune.engine.afrCruise}
                step={0.1}
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { afrCruise: value } })
                }
              />
              <NumberField
                label="Carga / boost"
                value={tune.engine.afrBoost}
                step={0.1}
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { afrBoost: value } })
                }
              />
            </div>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Seguridad</span>
            <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
              Crea un punto de restauración antes de una sesión larga de análisis. Podrás comparar y
              volver atrás desde Tunes.
            </p>
            <button
              type="button"
              className="btn mt-2 w-full"
              onClick={() => dispatch({ type: 'saveRestore' })}
              data-testid="restore-create"
            >
              Crear restore point
            </button>
            <button
              type="button"
              className="btn mt-2 w-full"
              disabled={analyze.log.length === 0}
              onClick={() => {
                const blob = new Blob([correctionsCsv(analyze.log)], {
                  type: 'text/csv;charset=utf-8',
                })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'dc-tuner-correcciones.csv'
                link.click()
                URL.revokeObjectURL(url)
                dispatch({
                  type: 'event',
                  text: `Correcciones exportadas · ${analyze.log.length} celdas`,
                  tone: 'ok',
                })
              }}
              data-testid="export-corrections"
            >
              Exportar correcciones CSV
            </button>
            <button
              type="button"
              className="btn btn-danger mt-2 w-full"
              onClick={() => dispatch({ type: 'resetTable', table: 've' })}
            >
              Restablecer tabla VE
            </button>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Cómo funciona</span>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[0.72rem] leading-snug text-ink-dim">
              <li>Arranca el motor y deja que recorra el ciclo de conducción.</li>
              <li>Activa VE Analyze Live.</li>
              <li>La ECU compara AFR real contra objetivo y corrige la celda.</li>
              <li>Guarda el tune cuando la mezcla se estabilice.</li>
            </ol>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[0.72rem] text-ink-dim">{label}</span>
      <input
        className="field w-24 text-right"
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`AFR objetivo ${label}`}
      />
    </label>
  )
}
