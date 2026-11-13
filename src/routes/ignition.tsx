import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { TableEditor } from '../components/table-editor'
import { Readout } from '../components/gauges'
import { TrendChart } from '../components/trend-chart'
import { useTuner } from '../lib/tuner-store'
import { MAP_AXIS, RPM_AXIS, interp, nearestCell, round } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/ignition']

export const Route = createFileRoute('/ignition')({
  head: () => {
    const canonical = canonicalUrl('/ignition')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: IgnitionPage,
})

function IgnitionPage() {
  const { state, dispatch } = useTuner()
  const { tune, sim } = state
  const cell = nearestCell(sim.rpm, sim.map)
  const tableAdvance = tune.ignition[cell.row][cell.col]
  const liveAdvance = sim.running ? interp(tune.ignition, sim.rpm, sim.map) : 0
  const knockLimit = 36 - sim.map / 13 + (sim.rpm < 2600 ? 3 : 0)

  return (
    <AppShell
      title="Tabla de encendido"
      subtitle="Define el avance en grados por RPM y carga. Si el avance supera el límite de knock, la ECU virtual lo recorta automáticamente."
      actions={
        <span className="tag" style={{ color: sim.knock ? 'hsl(var(--danger))' : undefined }}>
          <span className={`led ${sim.knock ? '' : 'led-idle'}`} aria-hidden="true" />
          {sim.knock ? 'Knock activo' : 'Sin knock'}
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <TableEditor
            table={tune.ignition}
            kind="ignition"
            liveRpm={sim.rpm}
            liveMap={sim.map}
            running={sim.running}
            onChange={(row, col, value) =>
              dispatch({ type: 'setCell', table: 'ignition', row, col, value })
            }
            onScale={(factor) => dispatch({ type: 'scaleTable', table: 'ignition', factor })}
            onSmooth={() => dispatch({ type: 'smoothTable', table: 'ignition' })}
            onReset={() => dispatch({ type: 'resetTable', table: 'ignition' })}
          />
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Avance y carga
              </h2>
              <span className="kicker text-[0.55rem]">últimas muestras</span>
            </div>
            <div className="p-3">
              <TrendChart samples={sim.history} preset="ignition" height={180} />
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Celda en lectura</span>
            <p className="num mt-1 text-lg text-ink">
              {RPM_AXIS[cell.col]} rpm · {MAP_AXIS[cell.row]} kPa
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Readout
                label="Avance tabla"
                value={round(tableAdvance, 1).toFixed(1)}
                unit="°"
                tone="hot"
              />
              <Readout
                label="Avance real"
                value={sim.running ? round(liveAdvance, 1).toFixed(1) : '--'}
                unit="°"
              />
              <Readout
                label="Límite knock"
                value={sim.running ? round(knockLimit, 1).toFixed(1) : '--'}
                unit="°"
                tone="cool"
              />
              <Readout
                label="MAP"
                value={sim.map > 0 ? round(sim.map, 0).toFixed(0) : '--'}
                unit="kPa"
              />
            </div>
            <div
              className="mt-2 rounded-md border p-2.5"
              style={{
                borderColor: sim.knock ? 'hsl(var(--danger) / 0.6)' : 'hsl(var(--panel-line))',
                background: sim.knock ? 'hsl(var(--danger) / 0.1)' : 'hsl(var(--panel) / 0.6)',
              }}
            >
              <span className="kicker block text-[0.52rem]">Protección</span>
              <p className="mt-1 text-[0.7rem] leading-snug text-ink-dim">
                {sim.knock
                  ? 'Avance recortado por knock. Baja los grados en la zona de carga alta.'
                  : 'La ECU virtual aplica el avance de la tabla sin recortes.'}
              </p>
            </div>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Referencias rápidas</span>
            <ul className="mt-2 space-y-1.5 text-[0.72rem] text-ink-dim">
              <li className="flex justify-between gap-2">
                <span>Ralentí</span>
                <span className="num text-ink">8 – 14°</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Crucero</span>
                <span className="num text-ink">22 – 32°</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Boost</span>
                <span className="num text-ink">10 – 20°</span>
              </li>
            </ul>
            <p className="mt-2 text-[0.68rem] leading-snug text-ink-dim">
              Valores orientativos para un motor de 4 cilindros atmosférico. Ajusta siempre con datalog.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
