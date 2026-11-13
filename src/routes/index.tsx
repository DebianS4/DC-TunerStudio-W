import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { ArcGauge, BarMeter, Readout } from '../components/gauges'
import { TrendChart } from '../components/trend-chart'
import { useTuner } from '../lib/tuner-store'
import { ecuProfile, nearestCell, round, RPM_AXIS, MAP_AXIS } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/']

export const Route = createFileRoute('/')({
  head: () => {
    const canonical = canonicalUrl('/')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: Dashboard,
})

const GAUGE_KEYS = ['afr', 'map', 'advance', 'duty', 'temp', 'tps'] as const
type GaugeKey = (typeof GAUGE_KEYS)[number]

const GAUGE_LABELS: Record<GaugeKey, string> = {
  afr: 'AFR real',
  map: 'MAP',
  advance: 'Avance',
  duty: 'Duty inyector',
  temp: 'Temperatura',
  tps: 'TPS',
}

const GAUGES_STORAGE_KEY = 'dc-tuner-studio/gauges-v1'

function Dashboard() {
  const { state, dispatch } = useTuner()
  const { sim, tune, analyze } = state
  const [gauges, setGauges] = useState<GaugeKey[]>([...GAUGE_KEYS])
  const [editingGauges, setEditingGauges] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GAUGES_STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as GaugeKey[]
      const valid = stored.filter((key) => GAUGE_KEYS.includes(key))
      if (valid.length > 0) setGauges(valid)
    } catch {
      // Ignore malformed stored layout and keep the default cluster.
    }
  }, [])

  const toggleGauge = (key: GaugeKey) => {
    setGauges((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
      if (next.length === 0) return prev
      try {
        window.localStorage.setItem(GAUGES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable: keep the change for this session only.
      }
      return next
    })
  }
  const profile = ecuProfile(tune.ecu)
  const cell = nearestCell(sim.rpm, sim.map)
  const battery = sim.running ? 13.8 + Math.sin(sim.t * 0.8) * 0.12 : 12.4
  const afrDelta = sim.afr > 0 ? round(sim.afr - sim.targetAfr, 2) : 0

  return (
    <AppShell
      title="Dashboard en vivo"
      subtitle="Panel de instrumentos, telemetría y control de la ECU virtual. Arranca el motor y observa cómo responde el tune en tiempo real."
      actions={
        <>
          <button
            type="button"
            className={`btn ${analyze.active ? 'btn-hot' : ''}`}
            onClick={() => dispatch({ type: 'toggleAnalyze' })}
            aria-pressed={analyze.active}
            data-testid="analyze-toggle"
          >
            VE Analyze {analyze.active ? 'ON' : 'OFF'}
          </button>
          <Link to="/fuel" className="btn">
            Editar tabla VE
          </Link>
        </>
      }
    >
      <section
        className="mb-4 overflow-hidden rounded-lg border border-panel-line/80 bg-panel"
        aria-label="Portada DC-Tuner Studio"
      >
        <div className="grid items-stretch gap-0 md:grid-cols-[1fr_minmax(0,46%)]">
          <div className="flex flex-wrap items-center gap-4 p-4 sm:p-6">
            <img
              src="https://assets.macaly-user-data.dev/cdn-cgi/image/format=webp,width=2000,height=2000,fit=scale-down,quality=90,anim=true/ajihnzbhiwkea747gwaah6fk/qt4ycxmmr1hjq2m8023edrby/MF34D1mqwk-P1ss4U3K6h.png"
              alt="Insignia circular DC Tuner Studio con aguja de cuentarrevoluciones y deportivos"
              className="h-20 w-20 rounded-full border border-cool/50 object-cover shadow-[0_0_28px_hsl(var(--cool)/0.4)] sm:h-24 sm:w-24"
              width={96}
              height={96}
            />
            <div className="min-w-0">
              <p className="kicker text-[0.58rem] text-cool">Speeduino · MegaSquirt MS2 · MS3</p>
              <h2 className="display mt-1 text-2xl font-semibold uppercase leading-none tracking-[0.06em] text-ink sm:text-4xl">
                DC-TUNER <span className="text-hot">STUDIO</span>
              </h2>
              <p className="mt-1.5 max-w-xl text-[0.8rem] leading-snug text-ink-dim">
                Suite de tuning de ECU: tablas 16 × 16, auto tune, datalogs y telemetría real por USB.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Link to="/connection" className="btn btn-hot">
                  Conectar ECU
                </Link>
                <a
                  className="btn"
                  href="/downloads/DC-Tuner-Studio-Windows.zip"
                  download="DC-Tuner-Studio-Windows.zip"
                  data-testid="hero-download-windows"
                >
                  Descargar para Windows
                </a>
                <a
                  className="btn"
                  href="/downloads/DC-Tuner-Studio-source.zip"
                  download="DC-Tuner-Studio-source.zip"
                  data-testid="hero-download-source"
                >
                  Código fuente
                </a>
              </div>
            </div>
          </div>
          <div className="relative hidden min-h-[180px] md:block">
            <img
              src="https://assets.macaly-user-data.dev/cdn-cgi/image/format=webp,width=2000,height=2000,fit=scale-down,quality=90,anim=true/ajihnzbhiwkea747gwaah6fk/qt4ycxmmr1hjq2m8023edrby/pMTpN_ANK2VbBe00bpvVp.png"
              alt="Garaje DC-Tuner Studio con el logotipo cromado, deportivos y moto"
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, hsl(var(--panel)) 0%, hsl(var(--panel) / 0.35) 22%, hsl(var(--panel) / 0) 60%)',
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="panel" aria-label="Instrumentos principales">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Cluster
              </h2>
              <div className="flex items-center gap-2">
                <span className={`led ${sim.running ? '' : 'led-idle'}`} aria-hidden="true" />
                <span className="kicker text-[0.58rem]">
                  {sim.running ? (sim.auto ? 'ciclo automático' : 'acelerador manual') : 'motor apagado'}
                </span>
                <button
                  type="button"
                  className="btn px-2 py-1 text-[0.6rem]"
                  aria-pressed={editingGauges}
                  onClick={() => setEditingGauges((value) => !value)}
                  data-testid="configure-gauges"
                >
                  {editingGauges ? 'Listo' : 'Configurar'}
                </button>
              </div>
            </div>
            {editingGauges ? (
              <div className="flex flex-wrap gap-1.5 border-b border-panel-line/70 px-4 py-2">
                {GAUGE_KEYS.map((key) => {
                  const active = gauges.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleGauge(key)}
                      data-testid={`gauge-${key}`}
                      className={`rounded-full border px-2.5 py-1 text-[0.65rem] ${
                        active
                          ? 'border-hot/60 bg-hot/15 text-ink'
                          : 'border-panel-line/60 text-ink-dim'
                      }`}
                    >
                      {GAUGE_LABELS[key]}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <div className="grid gap-3 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex justify-center">
                <ArcGauge
                  label="RPM"
                  value={sim.rpm}
                  min={0}
                  max={tune.engine.revLimit}
                  decimals={0}
                  size="lg"
                  accent="hot"
                  warnAt={tune.engine.revLimit * 0.82}
                  dangerAt={tune.engine.revLimit * 0.95}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="gauge-cluster">
                {gauges.includes('afr') ? (
                  <ArcGauge
                    label="AFR real"
                    value={sim.afr}
                    min={10}
                    max={18}
                    decimals={1}
                    accent="good"
                    warnAt={15.6}
                    dangerAt={16.4}
                  />
                ) : null}
                {gauges.includes('map') ? (
                  <ArcGauge
                    label="MAP"
                    value={sim.map}
                    min={0}
                    max={250}
                    unit="kPa"
                    decimals={0}
                    accent="cool"
                  />
                ) : null}
                {gauges.includes('advance') ? (
                  <ArcGauge
                    label="Avance"
                    value={sim.advance}
                    min={0}
                    max={45}
                    unit="°"
                    decimals={1}
                    accent="warn"
                  />
                ) : null}
                {gauges.includes('duty') ? (
                  <ArcGauge
                    label="Duty inyector"
                    value={sim.duty}
                    min={0}
                    max={100}
                    unit="%"
                    decimals={0}
                    accent="cool"
                    warnAt={80}
                    dangerAt={92}
                  />
                ) : null}
                {gauges.includes('temp') || gauges.includes('tps') ? (
                  <div className="col-span-2 flex flex-col justify-center gap-3 rounded-md border border-panel-line/70 bg-panel/50 px-3 py-2 sm:col-span-1">
                    {gauges.includes('temp') ? (
                      <BarMeter
                        label="Temperatura"
                        value={sim.coolant}
                        min={0}
                        max={120}
                        unit="°C"
                        decimals={1}
                        accent="cool"
                        warnAt={100}
                        dangerAt={108}
                      />
                    ) : null}
                    {gauges.includes('tps') ? (
                      <BarMeter label="TPS" value={sim.tps} unit="%" decimals={1} accent="hot" />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Readout
              label="Celda activa"
              value={`${RPM_AXIS[cell.col]} rpm`}
              hint={`${MAP_AXIS[cell.row]} kPa · fila ${cell.row + 1}, col ${cell.col + 1}`}
            />
            <Readout
              label="VE en celda"
              value={round(tune.ve[cell.row][cell.col], 1).toFixed(1)}
              unit="%"
              hint={`Lectura interpolada ${round(sim.ve, 1).toFixed(1)}%`}
              tone="hot"
            />
            <Readout
              label="AFR objetivo"
              value={sim.targetAfr > 0 ? sim.targetAfr.toFixed(2) : '--'}
              hint={
                sim.afr > 0
                  ? `${afrDelta > 0 ? 'pobre' : afrDelta < 0 ? 'rico' : 'clavado'} ${afrDelta > 0 ? '+' : ''}${afrDelta.toFixed(2)}`
                  : 'sin lectura'
              }
              tone={Math.abs(afrDelta) > 0.4 ? 'warn' : 'good'}
            />
            <Readout
              label="Batería"
              value={battery.toFixed(1)}
              unit="V"
              hint={sim.knock ? 'Knock detectado' : 'Sin knock'}
              tone={sim.knock ? 'danger' : 'default'}
            />
          </div>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Telemetría en vivo
              </h2>
              <span className="kicker text-[0.55rem]">{sim.history.length} muestras</span>
            </div>
            <div className="p-3">
              <TrendChart samples={sim.history} preset="live" height={190} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel" aria-label="Controles del motor">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Control
              </h2>
            </div>
            <div className="space-y-3 p-3">
              <button
                type="button"
                className={`btn w-full ${sim.running ? '' : 'btn-hot'}`}
                onClick={() => dispatch({ type: 'toggleRunning' })}
                data-testid="engine-toggle-panel"
              >
                {sim.running ? 'Detener motor' : 'Arrancar motor'}
              </button>
              <button
                type="button"
                className="btn w-full"
                onClick={() => dispatch({ type: 'toggleAuto' })}
                aria-pressed={sim.auto}
              >
                {sim.auto ? 'Ciclo automático ON' : 'Ciclo automático OFF'}
              </button>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="throttle" className="kicker text-[0.55rem]">
                    Acelerador manual
                  </label>
                  <span className="num text-xs text-ink">
                    {Math.round(sim.manualThrottle * 100)}%
                  </span>
                </div>
                <input
                  id="throttle"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(sim.manualThrottle * 100)}
                  onChange={(event) =>
                    dispatch({ type: 'setThrottle', value: Number(event.target.value) / 100 })
                  }
                  className="mt-2 w-full accent-[hsl(var(--hot))]"
                  aria-label="Acelerador manual"
                  data-testid="throttle-slider"
                />
              </div>

              <div className="rounded-md border border-panel-line/80 bg-panel/60 p-2.5">
                <span className="kicker block text-[0.55rem]">VE Analyze Live</span>
                <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
                  {analyze.active
                    ? `Corrigiendo la tabla VE automáticamente. ${analyze.corrections} celdas ajustadas.`
                    : 'Corrige la tabla VE hacia el AFR objetivo mientras el motor funciona.'}
                </p>
                <button
                  type="button"
                  className={`btn mt-2 w-full ${analyze.active ? 'btn-hot' : ''}`}
                  onClick={() => dispatch({ type: 'toggleAnalyze' })}
                  aria-pressed={analyze.active}
                >
                  {analyze.active ? 'Detener análisis' : 'Iniciar análisis'}
                </button>
              </div>
            </div>
          </section>

          <section className="panel" aria-label="Registro de eventos">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Eventos
              </h2>
              <span className="tag">{sim.events.length}</span>
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto p-3">
              {sim.events.map((item) => (
                <li key={item.id} className="flex gap-2 text-[0.72rem] leading-snug">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        item.tone === 'warn'
                          ? 'hsl(var(--warn))'
                          : item.tone === 'ok'
                            ? 'hsl(var(--good))'
                            : 'hsl(var(--ink-dim))',
                    }}
                  />
                  <span className="text-ink-dim">
                    <span className="num mr-1.5 text-[0.62rem] text-ink-dim/70">
                      {new Date(item.at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-3" aria-label="Resumen del tune">
            <span className="kicker text-[0.55rem]">Tune activo</span>
            <p className="display mt-1 text-lg text-ink">{tune.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-[0.7rem] text-ink-dim">
              <div>
                <dt className="kicker text-[0.5rem]">ECU</dt>
                <dd className="num text-ink">{profile.short}</dd>
              </div>
              <div>
                <dt className="kicker text-[0.5rem]">Firmware</dt>
                <dd className="num truncate text-ink">{tune.ecu.firmware}</dd>
              </div>
              <div>
                <dt className="kicker text-[0.5rem]">Cilindros</dt>
                <dd className="num text-ink">{tune.engine.cylinders}</dd>
              </div>
              <div>
                <dt className="kicker text-[0.5rem]">Cilindrada</dt>
                <dd className="num text-ink">{tune.engine.displacement} L</dd>
              </div>
              <div>
                <dt className="kicker text-[0.5rem]">Inyectores</dt>
                <dd className="num text-ink">{tune.engine.injectorCc} cc</dd>
              </div>
              <div>
                <dt className="kicker text-[0.5rem]">Corte</dt>
                <dd className="num text-ink">{tune.engine.revLimit} rpm</dd>
              </div>
            </dl>
            <Link to="/tunes" className="btn mt-3 w-full">
              Gestionar tunes
            </Link>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
