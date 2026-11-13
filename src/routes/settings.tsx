import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { ecuProfile, type EcuSettings } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/settings']

export const Route = createFileRoute('/settings')({
  head: () => {
    const canonical = canonicalUrl('/settings')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { state, dispatch } = useTuner()
  const settings = state.tune.settings
  const profile = ecuProfile(state.tune.ecu)
  const set = (patch: Partial<EcuSettings>) => dispatch({ type: 'patchSettings', patch })

  return (
    <AppShell
      title="Ajustes de la ECU"
      subtitle="Parámetros de encendido, inyección, ralentí, enriquecimiento y sensores que la ECU virtual aplica en cada ciclo."
      actions={<span className="tag">{profile.name}</span>}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Encendido e inyección
              </h2>
              <span className="kicker text-[0.55rem]">hardware</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <NumberField
                label="Dwell (ms)"
                value={settings.dwellMs}
                step={0.1}
                hint="menos de 2.5 ms penaliza el avance"
                onChange={(value) => set({ dwellMs: value })}
              />
              <SelectField
                label="Modo de chispa"
                value={settings.sparkMode}
                options={[
                  ['wasted', 'Wasted spark'],
                  ['sequential', 'Secuencial'],
                ]}
                onChange={(value) => set({ sparkMode: value as typeof settings.sparkMode })}
              />
              <SelectField
                label="Disposición de inyectores"
                value={settings.injectionLayout}
                options={[
                  ['batch', 'Batch'],
                  ['semi-seq', 'Semi-secuencial'],
                  ['seq', 'Secuencial'],
                ]}
                onChange={(value) =>
                  set({ injectionLayout: value as typeof settings.injectionLayout })
                }
              />
              <NumberField
                label="Ventilador a (°C)"
                value={settings.fanOnC}
                step={1}
                hint="activa el ventilador y enfría"
                onChange={(value) => set({ fanOnC: value })}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Ralentí y enriquecimiento
              </h2>
              <span className="kicker text-[0.55rem]">drivability</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <SelectField
                label="Control de ralentí"
                value={settings.idleMode}
                options={[
                  ['closed', 'Lazo cerrado'],
                  ['open', 'Lazo abierto'],
                ]}
                onChange={(value) => set({ idleMode: value as typeof settings.idleMode })}
              />
              <NumberField
                label="PWM ralentí (%)"
                value={settings.idlePwm}
                step={1}
                hint="válvula de ralentí"
                onChange={(value) => set({ idlePwm: value })}
              />
              <SelectField
                label="Enriquecimiento por aceleración"
                value={settings.accelMode}
                options={[
                  ['TPS', 'Por TPS'],
                  ['MAP', 'Por MAP'],
                ]}
                onChange={(value) => set({ accelMode: value as typeof settings.accelMode })}
              />
              <NumberField
                label="Duración accel (ms)"
                value={settings.accelMs}
                step={0.1}
                hint="pulso extra de combustible"
                onChange={(value) => set({ accelMs: value })}
              />
              <NumberField
                label="Umbral accel (TPS/s)"
                value={settings.accelThreshold}
                step={1}
                hint="sensibilidad del disparo"
                onChange={(value) => set({ accelThreshold: value })}
              />
              <ToggleField
                label="Warmup enrichment"
                value={settings.wueEnabled}
                hint="enriquece con motor frío"
                onChange={(value) => set({ wueEnabled: value })}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                EGO y sensores
              </h2>
              <span className="kicker text-[0.55rem]">corrección</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <ToggleField
                label="Corrección EGO"
                value={settings.egoEnabled}
                hint="ajusta hacia el AFR objetivo"
                onChange={(value) => set({ egoEnabled: value })}
              />
              <NumberField
                label="Autoridad EGO (%)"
                value={settings.egoAuthority}
                step={1}
                hint="máximo de corrección"
                onChange={(value) => set({ egoAuthority: value })}
              />
              <SelectField
                label="Sensor CLT"
                value={settings.cltSensor}
                options={[
                  ['GM', 'GM (estándar)'],
                  ['VW', 'VW'],
                  ['Miata', 'Mazda Miata'],
                ]}
                onChange={(value) => set({ cltSensor: value as typeof settings.cltSensor })}
              />
              <SelectField
                label="Sensor IAT"
                value={settings.iatSensor}
                options={[
                  ['GM', 'GM (estándar)'],
                  ['VW', 'VW'],
                  ['Miata', 'Mazda Miata'],
                ]}
                onChange={(value) => set({ iatSensor: value as typeof settings.iatSensor })}
              />
              <SelectField
                label="Sensor MAP"
                value={settings.mapSensor}
                options={[
                  ['MPX4250', 'MPX4250 (2.5 bar)'],
                  ['MPX5700', 'MPX5700 (7 bar)'],
                  ['4 bar', '4 bar'],
                ]}
                onChange={(value) => set({ mapSensor: value as typeof settings.mapSensor })}
              />
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="TPS cerrado"
                  value={settings.tpsCalClosed}
                  step={1}
                  onChange={(value) => set({ tpsCalClosed: value })}
                />
                <NumberField
                  label="TPS abierto"
                  value={settings.tpsCalOpen}
                  step={1}
                  onChange={(value) => set({ tpsCalOpen: value })}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Efecto en la simulación</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout label="Dwell aplicado" value={state.sim.dwell.toFixed(1)} unit="ms" tone="cool" />
              <Readout
                label="Enriquecimiento"
                value={state.sim.accelTicks > 0 ? 'activo' : 'en reposo'}
                tone={state.sim.accelTicks > 0 ? 'hot' : 'default'}
              />
              <Readout
                label="Ventilador"
                value={state.sim.fanOn ? 'ON' : 'OFF'}
                tone={state.sim.fanOn ? 'warn' : 'default'}
              />
              <Readout label="IAT" value={state.sim.iat.toFixed(1)} unit="°C" />
            </div>
            <p className="mt-2 text-[0.7rem] leading-snug text-ink-dim">
              El dwell bajo reduce el margen de knock, el enriquecimiento por aceleración mete
              combustible extra y el EGO recorta la mezcla hacia la tabla de AFR objetivo.
            </p>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Perfil activo</span>
            <p className="display mt-1 text-base text-ink">{profile.name}</p>
            <p className="num mt-1 text-[0.68rem] text-ink-dim">
              {state.tune.ecu.firmware} · {state.tune.ecu.baud} baudios
            </p>
            <p className="mt-2 text-[0.7rem] leading-snug text-ink-dim">
              Ajusta el protocolo y el INI en Conexión ECU.
            </p>
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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="kicker block text-[0.52rem]">{label}</span>
      <select
        className="field mt-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToggleField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: boolean
  hint?: string
  onChange: (value: boolean) => void
}) {
  return (
    <div>
      <span className="kicker block text-[0.52rem]">{label}</span>
      <button
        type="button"
        className={`btn mt-1 w-full ${value ? 'btn-hot' : ''}`}
        aria-pressed={value}
        onClick={() => onChange(!value)}
      >
        {value ? 'Activado' : 'Desactivado'}
      </button>
      {hint ? <span className="mt-0.5 block text-[0.65rem] text-ink-dim">{hint}</span> : null}
    </div>
  )
}
