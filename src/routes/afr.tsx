import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { TableEditor } from '../components/table-editor'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { MAP_AXIS, RPM_AXIS, interp, nearestCell, round } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/afr']

export const Route = createFileRoute('/afr')({
  head: () => {
    const canonical = canonicalUrl('/afr')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: AfrPage,
})

function AfrPage() {
  const { state, dispatch } = useTuner()
  const { tune, sim } = state
  const cell = nearestCell(sim.rpm, sim.map)
  const liveTarget = sim.running ? interp(tune.afrTarget, sim.rpm, sim.map) : 0
  const error = sim.afr > 0 ? round(sim.afr - liveTarget, 2) : 0

  return (
    <AppShell
      title="AFR objetivo"
      subtitle="Tabla de mezcla deseada por RPM y carga. Es la referencia que usan el auto tune y la corrección EGO para ajustar el combustible."
      actions={<span className="tag">{tune.afrTarget.length} × {tune.afrTarget[0].length}</span>}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <TableEditor
            table={tune.afrTarget}
            kind="afr"
            liveRpm={sim.rpm}
            liveMap={sim.map}
            running={sim.running}
            onChange={(row, col, value) =>
              dispatch({ type: 'setCell', table: 'afr', row, col, value })
            }
            onScale={(factor) => dispatch({ type: 'scaleTable', table: 'afr', factor })}
            onSmooth={() => dispatch({ type: 'smoothTable', table: 'afr' })}
            onReset={() => dispatch({ type: 'resetTable', table: 'afr' })}
          />
        </div>
        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Celda en lectura</span>
            <p className="num mt-1 text-lg text-ink">
              {RPM_AXIS[cell.col]} rpm · {MAP_AXIS[cell.row]} kPa
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Readout
                label="Objetivo tabla"
                value={round(tune.afrTarget[cell.row][cell.col], 1).toFixed(1)}
                tone="warn"
              />
              <Readout
                label="Objetivo leído"
                value={liveTarget > 0 ? liveTarget.toFixed(2) : '--'}
              />
              <Readout
                label="AFR real"
                value={sim.afr > 0 ? sim.afr.toFixed(2) : '--'}
                tone="good"
              />
              <Readout
                label="Desvío"
                value={sim.afr > 0 ? `${error > 0 ? '+' : ''}${error.toFixed(2)}` : '--'}
                tone={Math.abs(error) > 0.4 ? 'danger' : 'good'}
              />
            </div>
          </section>
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Valores típicos</span>
            <ul className="mt-2 space-y-1.5 text-[0.72rem] text-ink-dim">
              <li className="flex justify-between gap-2">
                <span>Ralentí</span>
                <span className="num text-ink">14.5 – 14.7</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Crucero</span>
                <span className="num text-ink">14.2 – 14.7</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Plena carga NA</span>
                <span className="num text-ink">12.8 – 13.2</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Boost</span>
                <span className="num text-ink">11.5 – 12.3</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
