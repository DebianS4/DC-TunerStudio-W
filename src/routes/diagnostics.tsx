import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { BarMeter, Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { ecuProfile, round } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/diagnostics']

export const Route = createFileRoute('/diagnostics')({
  head: () => {
    const canonical = canonicalUrl('/diagnostics')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: DiagnosticsPage,
})

function DiagnosticsPage() {
  const { state, dispatch } = useTuner()
  const { sim, connection, tune } = state
  const profile = ecuProfile(tune.ecu)
  const online = connection.status === 'connected'

  const sync = !sim.running ? 'Motor parado' : sim.rpm > 120 ? 'Sync OK' : 'Sin sincronismo'
  const fan = sim.fanOn
  const fuelPump = sim.running
  const idleValve = sim.running
    ? round(tune.settings.idlePwm * (1 - Math.min(1, sim.tps / 100)) + 6, 1)
    : 0

  return (
    <AppShell
      title="Diagnóstico"
      subtitle="Lecturas de sensores, estado de salidas y pruebas de actuadores. Todo lo que la ECU virtual está viendo en este instante."
      actions={
        <span className="tag" data-testid="diag-connection">
          <span className={`led ${online ? '' : 'led-idle'}`} />
          {online ? `ECU real · ${connection.frames} tramas` : 'Modo simulación'}
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Sensores
              </h2>
              <span className="kicker text-[0.55rem]">{profile.short} · {tune.ecu.firmware}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              <Readout label="RPM" value={Math.round(sim.rpm).toString()} tone="hot" />
              <Readout label="MAP" value={sim.map > 0 ? sim.map.toFixed(1) : '--'} unit="kPa" />
              <Readout label="TPS" value={sim.tps > 0 ? sim.tps.toFixed(1) : '--'} unit="%" />
              <Readout label="CLT" value={sim.coolant.toFixed(1)} unit="°C" tone="cool" />
              <Readout label="IAT" value={sim.iat.toFixed(1)} unit="°C" />
              <Readout label="Batería" value={sim.battery.toFixed(2)} unit="V" />
              <Readout label="AFR" value={sim.afr > 0 ? sim.afr.toFixed(2) : '--'} tone="good" />
              <Readout
                label="AFR objetivo"
                value={sim.targetAfr > 0 ? sim.targetAfr.toFixed(2) : '--'}
                tone="warn"
              />
              <Readout label="Avance" value={sim.advance.toFixed(1)} unit="°" />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Estado de salidas
              </h2>
              <span className="tag">{sync}</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <BarMeter label="Duty inyectores" value={sim.duty} unit="%" accent="cool" decimals={1} warnAt={85} dangerAt={93} />
                <BarMeter label="Válvula de ralentí" value={idleValve} unit="%" accent="cool" decimals={1} />
                <BarMeter label="Dwell" value={sim.dwell} min={0} max={8} unit="ms" accent="hot" decimals={1} />
              </div>
              <ul className="space-y-1.5 text-[0.75rem]">
                {[
                  ['Bomba de combustible', fuelPump],
                  ['Ventilador', fan],
                  ['Inyectores', sim.running && sim.duty > 0],
                  ['Bobinas', sim.running && sim.advance !== 0],
                ].map(([label, active]) => (
                  <li key={String(label)} className="flex items-center justify-between gap-2">
                    <span className="text-ink-dim">{label}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`led ${active ? '' : 'led-idle'}`} aria-hidden="true" />
                      <span className={active ? 'text-good' : 'text-ink-dim'}>
                        {active ? 'ON' : 'OFF'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Pruebas de actuadores
              </h2>
              <span className="kicker text-[0.55rem]">simuladas</span>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {[
                ['Probar inyección', 'Prueba de inyección: pulso de 2 ms en todos los inyectores'],
                ['Probar bobina', 'Prueba de bobina: chispa en cilindro 1'],
                ['Probar ventilador', 'Prueba de ventilador: salida activada 3 s'],
                ['Probar válvula IAC', 'Prueba de válvula IAC: barrido 0-100 %'],
              ].map(([label, text]) => (
                <button
                  key={label}
                  type="button"
                  className="btn"
                  onClick={() => dispatch({ type: 'event', text, tone: 'ok' })}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="border-t border-panel-line/70 px-4 py-2 text-[0.68rem] text-ink-dim">
              Las pruebas solo se registran en el evento y no escriben en la ECU real.
            </p>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Eventos
              </h2>
              <span className="tag">{sim.events.length}</span>
            </div>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto p-3">
              {sim.events.map((item) => (
                <li key={item.id} className="flex gap-2 text-[0.7rem] leading-snug">
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
                    <span className="num mr-1.5 text-[0.6rem] text-ink-dim/70">
                      {new Date(item.at).toLocaleTimeString('es-ES')}
                    </span>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Contadores</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout label="Tramas" value={String(connection.frames)} />
              <Readout label="Knock" value={sim.knock ? 'activo' : 'no'} tone={sim.knock ? 'danger' : 'default'} />
              <Readout label="Estado enlace" value={connection.status} />
              <Readout label="Motor" value={sim.running ? 'marcha' : 'parado'} />
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
