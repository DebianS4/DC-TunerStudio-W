import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { MAP_AXIS, RPM_AXIS, tableStats, tuneDiff } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/tunes']

export const Route = createFileRoute('/tunes')({
  head: () => {
    const canonical = canonicalUrl('/tunes')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: TunesPage,
})

function TunesPage() {
  const { state, dispatch } = useTuner()
  const { tune, savedTunes, restorePoints } = state
  const [referenceId, setReferenceId] = useState<string | null>(restorePoints[0]?.id ?? null)
  const importRef = useRef<HTMLInputElement>(null)
  const reference =
    restorePoints.find((point) => point.id === referenceId) ?? restorePoints[0] ?? null
  const diff = reference ? tuneDiff(tune, reference.tune) : null
  const veStats = tableStats(tune.ve)
  const ignitionStats = tableStats(tune.ignition)

  const exportTune = () => {
    const blob = new Blob([JSON.stringify(tune, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tune.name.replace(/\s+/g, '-').toLowerCase()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      title="Gestión de tunes"
      subtitle="Guarda versiones del mapa, crea puntos de restauración y compara los cambios celda por celda antes de aplicar nada."
      actions={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'saveRestore' })}
            data-testid="restore-create"
          >
            Nuevo restore point
          </button>
          <button
            type="button"
            className="btn btn-hot"
            onClick={() => dispatch({ type: 'saveTune' })}
            data-testid="save-tune"
          >
            Guardar tune
          </button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Tune activo
              </h2>
              <span className="tag">editado {new Date(tune.updatedAt).toLocaleTimeString('es-ES')}</span>
            </div>
            <div className="space-y-3 p-3">
              <label className="block">
                <span className="kicker block text-[0.55rem]">Nombre del tune</span>
                <input
                  className="field mt-1"
                  value={tune.name}
                  onChange={(event) => dispatch({ type: 'renameTune', name: event.target.value })}
                  aria-label="Nombre del tune activo"
                  data-testid="tune-name"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Readout label="VE media" value={veStats.avg.toFixed(1)} unit="%" tone="hot" />
                <Readout label="VE máx" value={veStats.max.toFixed(1)} unit="%" />
                <Readout label="Avance medio" value={ignitionStats.avg.toFixed(1)} unit="°" tone="cool" />
                <Readout label="Avance máx" value={ignitionStats.max.toFixed(1)} unit="°" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={exportTune}>
                  Exportar JSON
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => importRef.current?.click()}
                  data-testid="import-tune"
                >
                  Importar JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (!file) return
                    try {
                      const parsed = JSON.parse(await file.text()) as typeof tune
                      if (!parsed || !Array.isArray(parsed.ve) || !Array.isArray(parsed.ignition)) {
                        throw new Error('formato')
                      }
                      dispatch({ type: 'importTune', tune: parsed })
                    } catch {
                      dispatch({
                        type: 'event',
                        text: 'Importación cancelada: el archivo no es un tune válido',
                        tone: 'warn',
                      })
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => dispatch({ type: 'resetTune' })}
                  data-testid="reset-tune"
                >
                  Restablecer tune completo
                </button>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Tunes guardados
              </h2>
              <span className="tag">{savedTunes.length}</span>
            </div>
            {savedTunes.length === 0 ? (
              <p className="p-4 text-sm text-ink-dim">
                Aún no has guardado ningún tune. Pulsa Guardar tune para crear la primera versión.
              </p>
            ) : (
              <ul className="divide-y divide-panel-line/50">
                {savedTunes.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="display truncate text-sm text-ink">
                        {item.name}
                        {item.id === tune.id ? (
                          <span className="tag ml-2 align-middle">activo</span>
                        ) : null}
                      </p>
                      <p className="num text-[0.65rem] text-ink-dim">
                        {new Date(item.updatedAt).toLocaleString('es-ES')} ·{' '}
                        {item.engine.cylinders} cil · {item.engine.displacement} L
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => dispatch({ type: 'loadTune', id: item.id })}
                      >
                        Cargar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => dispatch({ type: 'duplicateTune', id: item.id })}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => dispatch({ type: 'deleteTune', id: item.id })}
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Informe de diferencias
              </h2>
              <span className="kicker text-[0.55rem]">
                {diff ? `${diff.total} cambios` : 'sin referencia'}
              </span>
            </div>
            {restorePoints.length === 0 ? (
              <p className="p-4 text-sm text-ink-dim">
                Crea un restore point para poder comparar el tune actual contra una versión anterior.
              </p>
            ) : (
              <div className="space-y-3 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2">
                    <span className="kicker text-[0.55rem]">Comparar contra</span>
                    <select
                      className="field w-44"
                      value={reference?.id ?? ''}
                      onChange={(event) => setReferenceId(event.target.value)}
                      aria-label="Restore point de referencia"
                    >
                      {restorePoints.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.name} · {new Date(point.at).toLocaleTimeString('es-ES')}
                        </option>
                      ))}
                    </select>
                  </label>
                  {diff ? (
                    <span className="num text-[0.7rem] text-ink-dim">
                      VE {diff.ve.length} · encendido {diff.ignition.length} · motor{' '}
                      {diff.engineChanges.length} · Δ máx {diff.maxDelta}
                    </span>
                  ) : null}
                </div>

                {diff && diff.total > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-[0.72rem]">
                      <thead>
                        <tr className="border-b border-panel-line/70 text-ink-dim">
                          <th className="kicker px-2 py-1.5 font-semibold">Tabla</th>
                          <th className="kicker px-2 py-1.5 font-semibold">Celda</th>
                          <th className="kicker px-2 py-1.5 font-semibold">Antes</th>
                          <th className="kicker px-2 py-1.5 font-semibold">Ahora</th>
                          <th className="kicker px-2 py-1.5 font-semibold">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...diff.ve.slice(0, 12), ...diff.ignition.slice(0, 12)].map((change, index) => {
                          const isVe = index < Math.min(12, diff.ve.length)
                          return (
                            <tr
                              key={`${isVe ? 've' : 'ign'}-${change.row}-${change.col}-${index}`}
                              className="border-b border-panel-line/40 last:border-0"
                            >
                              <td className="px-2 py-1.5 text-ink-dim">{isVe ? 'VE' : 'Encendido'}</td>
                              <td className="num px-2 py-1.5 text-ink">
                                {RPM_AXIS[change.col]} rpm · {MAP_AXIS[change.row]} kPa
                              </td>
                              <td className="num px-2 py-1.5 text-ink-dim">{change.from.toFixed(1)}</td>
                              <td className="num px-2 py-1.5 text-ink">{change.to.toFixed(1)}</td>
                              <td
                                className="num px-2 py-1.5"
                                style={{
                                  color:
                                    change.delta > 0
                                      ? 'hsl(var(--good))'
                                      : 'hsl(var(--danger))',
                                }}
                              >
                                {change.delta > 0 ? '+' : ''}
                                {change.delta.toFixed(1)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {diff.ve.length + diff.ignition.length > 24 ? (
                      <p className="mt-2 text-[0.68rem] text-ink-dim">
                        Mostrando 24 de {diff.ve.length + diff.ignition.length} celdas modificadas.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-ink-dim">
                    El tune actual coincide con {reference?.name}. Sin cambios pendientes.
                  </p>
                )}

                {diff && diff.engineChanges.length > 0 ? (
                  <ul className="space-y-1 text-[0.7rem] text-ink-dim">
                    {diff.engineChanges.map((change) => (
                      <li key={change.key} className="num">
                        {change.key}: {String(change.from)} → {String(change.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Restore points
              </h2>
              <span className="tag">{restorePoints.length}</span>
            </div>
            {restorePoints.length === 0 ? (
              <p className="p-3 text-[0.75rem] text-ink-dim">
                Sin puntos de restauración todavía.
              </p>
            ) : (
              <ul className="divide-y divide-panel-line/50">
                {restorePoints.map((point) => (
                  <li key={point.id} className="px-3 py-2">
                    <p className="display text-sm text-ink">{point.name}</p>
                    <p className="num text-[0.65rem] text-ink-dim">
                      {new Date(point.at).toLocaleString('es-ES')}
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => dispatch({ type: 'restorePoint', id: point.id })}
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => dispatch({ type: 'deleteRestore', id: point.id })}
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Guardado automático</span>
            <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
              El tune activo, los tunes guardados, los restore points y los datalogs se almacenan en
              este navegador. Exporta el JSON para conservar una copia.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
