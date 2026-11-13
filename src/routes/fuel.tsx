import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { TableEditor } from '../components/table-editor'
import { TrendChart } from '../components/trend-chart'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { MAP_AXIS, RPM_AXIS, nearestCell, round, targetAfrFor } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/fuel']

export const Route = createFileRoute('/fuel')({
  head: () => {
    const canonical = canonicalUrl('/fuel')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: FuelPage,
})

function FuelPage() {
  const { state, dispatch } = useTuner()
  const { tune, sim } = state
  const cell = nearestCell(sim.rpm, sim.map)
  const targetAfr = targetAfrFor(tune.engine, sim.map)
  const correction =
    sim.afr > 0 ? round(((targetAfr / sim.afr) - 1) * 100, 1) : 0

  return (
    <AppShell
      title="Tabla de combustible (VE)"
      subtitle="Edita la eficiencia volumétrica por RPM y presión de admisión. La celda resaltada es la que la ECU virtual está leyendo ahora mismo."
      actions={
        <button
          type="button"
          className={`btn ${state.analyze.active ? 'btn-hot' : ''}`}
          onClick={() => dispatch({ type: 'toggleAnalyze' })}
          aria-pressed={state.analyze.active}
        >
          VE Analyze {state.analyze.active ? 'ON' : 'OFF'}
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <TableEditor
            table={tune.ve}
            kind="ve"
            liveRpm={sim.rpm}
            liveMap={sim.map}
            running={sim.running}
            onChange={(row, col, value) =>
              dispatch({ type: 'setCell', table: 've', row, col, value })
            }
            onScale={(factor) => dispatch({ type: 'scaleTable', table: 've', factor })}
            onSmooth={() => dispatch({ type: 'smoothTable', table: 've' })}
            onReset={() => dispatch({ type: 'resetTable', table: 've' })}
          />
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Mezcla en vivo
              </h2>
              <span className="kicker text-[0.55rem]">AFR real vs objetivo</span>
            </div>
            <div className="p-3">
              <TrendChart samples={sim.history} preset="fuel" height={180} />
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
                label="VE tabla"
                value={round(tune.ve[cell.row][cell.col], 1).toFixed(1)}
                unit="%"
                tone="hot"
              />
              <Readout
                label="VE leído"
                value={sim.ve > 0 ? round(sim.ve, 1).toFixed(1) : '--'}
                unit="%"
              />
              <Readout
                label="AFR real"
                value={sim.afr > 0 ? sim.afr.toFixed(2) : '--'}
                tone={Math.abs(correction) > 3 ? 'warn' : 'good'}
              />
              <Readout label="AFR objetivo" value={targetAfr.toFixed(2)} />
            </div>
            <div className="mt-2 rounded-md border border-panel-line/80 bg-panel/60 p-2.5">
              <span className="kicker block text-[0.52rem]">Corrección sugerida</span>
              <span
                className="num mt-1 block text-base"
                style={{ color: `hsl(var(--${Math.abs(correction) > 3 ? 'warn' : 'good'}))` }}
              >
                {sim.afr > 0 ? `${correction > 0 ? '+' : ''}${correction.toFixed(1)}%` : '--'}
              </span>
              <p className="mt-1 text-[0.68rem] leading-snug text-ink-dim">
                {sim.afr <= 0
                  ? 'Sin lectura de mezcla. Arranca el motor para calcular la corrección.'
                  : Math.abs(correction) < 0.5
                    ? 'Mezcla clavada en el objetivo. No hace falta corregir.'
                    : correction > 0
                      ? 'Mezcla pobre: sube el VE de esta celda.'
                      : 'Mezcla rica: baja el VE de esta celda.'}
              </p>
            </div>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">AFR objetivo por zona</span>
            <ul className="mt-2 space-y-1.5 text-[0.72rem] text-ink-dim">
              <li className="flex justify-between gap-2">
                <span>Ralentí (≤ 50 kPa)</span>
                <span className="num text-ink">{tune.engine.afrIdle.toFixed(1)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Crucero (50–100 kPa)</span>
                <span className="num text-ink">{tune.engine.afrCruise.toFixed(1)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Carga / boost (&gt; 145 kPa)</span>
                <span className="num text-ink">{tune.engine.afrBoost.toFixed(1)}</span>
              </li>
            </ul>
            <p className="mt-2 text-[0.68rem] leading-snug text-ink-dim">
              Ajusta estos valores en la sección Motor.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
