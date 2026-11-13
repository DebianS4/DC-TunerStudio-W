import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { ECU_PLATFORMS, ECU_PROFILES, MAP_AXIS, RPM_AXIS, ecuProfile, round } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/setup']

export const Route = createFileRoute('/setup')({
  head: () => {
    const canonical = canonicalUrl('/setup')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: SetupPage,
})

function SetupPage() {
  const { state, dispatch } = useTuner()
  const engine = state.tune.engine
  const ecu = state.tune.ecu
  const profile = ecuProfile(ecu)
  const dutyEstimate = round(
    Math.min(96, (220 * engine.revLimit * 95) / (engine.injectorCc * engine.cylinders * 383)),
    1,
  )

  return (
    <AppShell
      title="Configuración del motor"
      subtitle="Estos parámetros alimentan el modelo de la ECU virtual: cilindrada, inyectores, límite de RPM y objetivos de mezcla."
      actions={
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => dispatch({ type: 'resetTune' })}
          data-testid="reset-tune"
        >
          Restablecer tune
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="panel" aria-label="Plataforma ECU">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Plataforma ECU
              </h2>
              <span className="tag">tablas {profile.tableSize}</span>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              {ECU_PLATFORMS.map((id) => {
                const item = ECU_PROFILES[id]
                const active = ecu.platform === id
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`ecu-${id}`}
                    aria-pressed={active}
                    onClick={() =>
                      dispatch({
                        type: 'patchEcu',
                        patch: { platform: id, firmware: item.firmware[0], baud: item.baud },
                      })
                    }
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-hot bg-hot/10'
                        : 'border-panel-line bg-panel/50 hover:border-hot/40'
                    }`}
                  >
                    <span className="display block text-sm uppercase tracking-[0.1em] text-ink">
                      {item.name}
                    </span>
                    <span className="num mt-1 block text-[0.62rem] leading-snug text-ink-dim">
                      {item.protocol}
                    </span>
                    <span className="mt-2 block text-[0.65rem] text-ink-dim">
                      {item.tableSize} · {item.analyzeName}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="grid gap-3 border-t border-panel-line/70 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="kicker block text-[0.52rem]">Firmware</span>
                <select
                  className="field mt-1"
                  value={ecu.firmware}
                  onChange={(event) =>
                    dispatch({ type: 'patchEcu', patch: { firmware: event.target.value } })
                  }
                  aria-label="Firmware de la ECU"
                  data-testid="ecu-firmware"
                >
                  {profile.firmware.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="kicker block text-[0.52rem]">Puerto de conexión</span>
                <input
                  className="field mt-1"
                  value={ecu.port}
                  onChange={(event) =>
                    dispatch({ type: 'patchEcu', patch: { port: event.target.value } })
                  }
                  aria-label="Puerto de conexión de la ECU"
                  data-testid="ecu-port"
                />
                <span className="mt-0.5 block text-[0.65rem] text-ink-dim">
                  {ecu.baud} baudios · {profile.protocol}
                </span>
              </label>
            </div>
            <div className="border-t border-panel-line/70 p-4">
              <span className="kicker block text-[0.52rem]">Soporte de la plataforma</span>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {profile.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-1.5 text-[0.72rem] leading-snug text-ink-dim"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-hot" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.7rem] leading-snug text-ink-dim">{profile.note}</p>
              <p className="mt-1 text-[0.68rem] leading-snug text-ink-dim">
                La simulación trabaja con una rejilla común de 16 × 16 celdas para las tres
                plataformas.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Motor
              </h2>
              <span className="tag">configuración base</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <NumberInput
                label="Cilindros"
                value={engine.cylinders}
                step={1}
                hint="2 – 12"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { cylinders: value } })}
              />
              <NumberInput
                label="Cilindrada (L)"
                value={engine.displacement}
                step={0.1}
                hint="desplazamiento total"
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { displacement: value } })
                }
              />
              <NumberInput
                label="Inyectores (cc/min)"
                value={engine.injectorCc}
                step={10}
                hint="caudal por inyector"
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { injectorCc: value } })
                }
              />
              <NumberInput
                label="Ralentí objetivo (rpm)"
                value={engine.idleRpm}
                step={50}
                hint="500 – 1600"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { idleRpm: value } })}
              />
              <NumberInput
                label="Corte de RPM"
                value={engine.revLimit}
                step={100}
                hint="3500 – 9500"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { revLimit: value } })}
              />
              <NumberInput
                label="Agresividad VE Analyze (%)"
                value={Math.round(engine.analyzeStrength * 100)}
                step={5}
                hint="10 – 100"
                onChange={(value) =>
                  dispatch({ type: 'patchEngine', patch: { analyzeStrength: value / 100 } })
                }
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Objetivos de AFR
              </h2>
              <span className="tag">mezcla</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <NumberInput
                label="Ralentí"
                value={engine.afrIdle}
                step={0.1}
                hint="≤ 50 kPa"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { afrIdle: value } })}
              />
              <NumberInput
                label="Crucero"
                value={engine.afrCruise}
                step={0.1}
                hint="50 – 100 kPa"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { afrCruise: value } })}
              />
              <NumberInput
                label="Carga / boost"
                value={engine.afrBoost}
                step={0.1}
                hint="> 145 kPa"
                onChange={(value) => dispatch({ type: 'patchEngine', patch: { afrBoost: value } })}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Ejes de las tablas
              </h2>
              <span className="kicker text-[0.55rem]">
                {RPM_AXIS.length} × {MAP_AXIS.length}
              </span>
            </div>
            <div className="space-y-2 p-4">
              <div>
                <span className="kicker text-[0.52rem]">RPM</span>
                <p className="num mt-1 text-[0.7rem] leading-relaxed text-ink-dim">
                  {RPM_AXIS.join(' · ')}
                </p>
              </div>
              <div>
                <span className="kicker text-[0.52rem]">MAP (kPa)</span>
                <p className="num mt-1 text-[0.7rem] leading-relaxed text-ink-dim">
                  {MAP_AXIS.join(' · ')}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Estimaciones</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout
                label="Duty máx estimado"
                value={dutyEstimate.toFixed(1)}
                unit="%"
                tone={dutyEstimate > 85 ? 'warn' : 'good'}
              />
              <Readout
                label="Rango útil"
                value={`${engine.idleRpm}–${engine.revLimit}`}
                hint="rpm"
              />
            </div>
            <p className="mt-2 text-[0.7rem] leading-snug text-ink-dim">
              Con inyectores de {engine.injectorCc} cc y {engine.cylinders} cilindros, el duty
              estimado a plena carga es {dutyEstimate.toFixed(1)}%. Por encima del 85% conviene subir
              el caudal de inyector.
            </p>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Tune activo</span>
            <p className="display mt-1 text-base text-ink">{state.tune.name}</p>
            <p className="num mt-1 text-[0.68rem] text-ink-dim">
              {state.tune.engine.cylinders} cil · {state.tune.engine.displacement} L ·{' '}
              {state.tune.engine.injectorCc} cc
            </p>
            <p className="mt-1 text-[0.68rem] text-ink-dim">
              {profile.name} · {ecu.firmware}
            </p>
            <button
              type="button"
              className="btn mt-3 w-full"
              onClick={() => dispatch({ type: 'saveTune' })}
            >
              Guardar como versión
            </button>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Nota</span>
            <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
              DC-Tuner Studio es un entorno de simulación: no se conecta a una ECU física. Usa los
              valores como referencia de práctica y nunca sustituye una calibración real en banco.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function NumberInput({
  label,
  value,
  step,
  hint,
  onChange,
}: {
  label: string
  value: number
  step: number
  hint?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="kicker block text-[0.52rem]">{label}</span>
      <input
        className="field mt-1"
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      {hint ? <span className="mt-0.5 block text-[0.65rem] text-ink-dim">{hint}</span> : null}
    </label>
  )
}
