import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { Readout } from '../components/gauges'
import { useTuner } from '../lib/tuner-store'
import { ECU_PLATFORMS, ECU_PROFILES, ecuProfile } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/connection']

export const Route = createFileRoute('/connection')({
  head: () => {
    const canonical = canonicalUrl('/connection')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: ConnectionPage,
})

function ConnectionPage() {
  const { state, dispatch, serialAvailable, connectEcu, disconnectEcu, loadIni, toggleLive } =
    useTuner()
  const ecu = state.tune.ecu
  const profile = ecuProfile(ecu)
  const connection = state.connection
  const fileRef = useRef<HTMLInputElement>(null)
  const definition = connection.ini

  const statusLabel =
    connection.status === 'connected'
      ? 'Conectada'
      : connection.status === 'connecting'
        ? 'Conectando'
        : connection.status === 'error'
          ? 'Error'
          : 'Desconectada'

  return (
    <AppShell
      title="Conexión ECU"
      subtitle="Enlace real por USB/serie con Web Serial: selecciona el puerto, el protocolo de tu plataforma y la definición INI con los offsets de la trama."
      actions={
        <>
          <span className="tag" data-testid="connection-status">
            <span className={`led ${connection.status === 'connected' ? '' : 'led-idle'}`} />
            {statusLabel}
          </span>
          {connection.status === 'connected' ? (
            <button type="button" className="btn btn-danger" onClick={() => disconnectEcu()}>
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-hot"
              onClick={() => connectEcu()}
              data-testid="connect-ecu"
            >
              Conectar ECU
            </button>
          )}
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Enlace
              </h2>
              <span className="kicker text-[0.55rem]">
                {connection.device || 'sin puerto'} · {ecu.baud} baudios 8N1
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="kicker block text-[0.52rem]">Protocolo</span>
                <select
                  className="field mt-1"
                  value={ecu.platform}
                  onChange={(event) =>
                    dispatch({
                      type: 'patchEcu',
                      patch: {
                        platform: event.target.value as typeof ecu.platform,
                        firmware: ECU_PROFILES[event.target.value as typeof ecu.platform].firmware[0],
                        baud: ECU_PROFILES[event.target.value as typeof ecu.platform].baud,
                      },
                    })
                  }
                  aria-label="Protocolo de la ECU"
                  data-testid="connection-protocol"
                >
                  {ECU_PLATFORMS.map((id) => (
                    <option key={id} value={id}>
                      {ECU_PROFILES[id].name}
                    </option>
                  ))}
                </select>
                <span className="mt-0.5 block text-[0.65rem] text-ink-dim">{profile.protocol}</span>
              </label>
              <label className="block">
                <span className="kicker block text-[0.52rem]">Puerto</span>
                <input
                  className="field mt-1"
                  value={ecu.port}
                  onChange={(event) =>
                    dispatch({ type: 'patchEcu', patch: { port: event.target.value } })
                  }
                  aria-label="Puerto serie"
                />
                <span className="mt-0.5 block text-[0.65rem] text-ink-dim">
                  Web Serial pide permiso al pulsar Conectar
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-panel-line/70 p-4">
              <button
                type="button"
                className="btn"
                onClick={() => toggleLive()}
                disabled={connection.status !== 'connected'}
                aria-pressed={connection.live}
              >
                Telemetría real {connection.live ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => fileRef.current?.click()}
                data-testid="load-ini"
              >
                Cargar INI
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".ini,text/plain"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  loadIni(await file.text(), file.name)
                  event.target.value = ''
                }}
              />
              <span className="num text-[0.68rem] text-ink-dim">
                {connection.frames} tramas · {definition ? `${definition.channels.length} canales` : 'definición integrada'}
              </span>
            </div>
            {!serialAvailable ? (
              <p className="border-t border-panel-line/70 px-4 py-3 text-[0.72rem] leading-snug text-warn">
                Este navegador no expone Web Serial. Abre la app en Chrome o Edge de escritorio
                (HTTPS) para conectar por USB. Mientras tanto puedes seguir usando el modo
                simulación.
              </p>
            ) : null}
            {connection.error ? (
              <p className="border-t border-panel-line/70 px-4 py-3 text-[0.72rem] text-danger">
                {connection.error}
              </p>
            ) : null}
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Canales de la definición
              </h2>
              <span className="tag">{definition?.signature || 'Speeduino integrada'}</span>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[520px] text-left text-[0.72rem]">
                <thead className="sticky top-0 bg-panel">
                  <tr className="border-b border-panel-line/70 text-ink-dim">
                    <th className="kicker px-3 py-2 font-semibold">Canal</th>
                    <th className="kicker px-3 py-2 font-semibold">Tipo</th>
                    <th className="kicker px-3 py-2 font-semibold">Offset</th>
                    <th className="kicker px-3 py-2 font-semibold">Escala</th>
                    <th className="kicker px-3 py-2 font-semibold">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {(definition?.channels ?? []).slice(0, 60).map((channel) => (
                    <tr key={`${channel.name}-${channel.offset}`} className="border-b border-panel-line/40">
                      <td className="num px-3 py-1.5 text-ink">{channel.name}</td>
                      <td className="num px-3 py-1.5 text-ink-dim">{channel.type}</td>
                      <td className="num px-3 py-1.5 text-ink-dim">{channel.offset}</td>
                      <td className="num px-3 py-1.5 text-ink-dim">{channel.scale}</td>
                      <td className="px-3 py-1.5 text-ink-dim">{channel.unit}</td>
                    </tr>
                  ))}
                  {!definition ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-ink-dim">
                        Sin INI cargado: se usa la definición integrada de Speeduino (139 bytes).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Última trama</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout
                label="RPM"
                value={connection.telemetry ? Math.round(connection.telemetry.rpm).toString() : '--'}
                tone="hot"
              />
              <Readout
                label="MAP"
                value={connection.telemetry ? connection.telemetry.map.toFixed(0) : '--'}
                unit="kPa"
              />
              <Readout
                label="AFR"
                value={connection.telemetry ? connection.telemetry.afr.toFixed(1) : '--'}
                tone="good"
              />
              <Readout
                label="Batería"
                value={connection.telemetry ? connection.telemetry.battery.toFixed(1) : '--'}
                unit="V"
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Consola
              </h2>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto p-3">
              {connection.log.length === 0 ? (
                <li className="text-[0.7rem] text-ink-dim">
                  Sin actividad. Conecta la ECU para ver el registro del enlace.
                </li>
              ) : (
                connection.log.map((line, index) => (
                  <li key={`${line}-${index}`} className="num text-[0.65rem] leading-snug text-ink-dim">
                    {line}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="panel p-3">
            <span className="kicker text-[0.55rem]">Compatibilidad</span>
            <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">
              Speeduino responde a la trama de 139 bytes de la definición integrada. Para MegaSquirt
              MS2/MS3 carga el INI de tu firmware: los offsets y el tamaño de bloque se leen de
              [OutputChannels] y de ochBlockSize.
            </p>
            <p className="mt-2 text-[0.68rem] leading-snug text-ink-dim">
              La escritura de mapas a la ECU no está habilitada: esta versión solo lee telemetría.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
