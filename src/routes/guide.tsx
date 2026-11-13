import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import { ECU_PROFILES, ECU_PLATFORMS } from '../lib/tuning'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const pageMeta = siteMetadata['/guide']

export const Route = createFileRoute('/guide')({
  head: () => {
    const canonical = canonicalUrl('/guide')
    return {
      meta: [
        { title: pageMeta.title },
        { name: 'description', content: pageMeta.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: GuidePage,
})

const STEPS = [
  {
    title: '1 · Elige tu plataforma',
    text: 'Speeduino, MegaSquirt MS2 o MS3. El firmware y los baudios se ajustan solos y las tablas pasan a 16 × 16.',
  },
  {
    title: '2 · Conecta la ECU',
    text: 'En Conexión ECU pulsa Conectar y elige el puerto USB. Web Serial solo funciona en Chrome o Edge de escritorio con HTTPS.',
  },
  {
    title: '3 · Carga la definición',
    text: 'Speeduino trae la definición integrada de 139 bytes. Para MS2/MS3 carga el INI del firmware para leer los offsets correctos.',
  },
  {
    title: '4 · Ajusta combustible y chispa',
    text: 'Edita las tablas VE y de avance, define el AFR objetivo y afina ralentí, dwell y enriquecimiento en Ajustes.',
  },
  {
    title: '5 · Auto tune / VE Analyze Live',
    text: 'Con el motor en marcha, activa el análisis: cada corrección de VE queda registrada con su AFR real y objetivo.',
  },
  {
    title: '6 · Graba y analiza',
    text: 'Graba un datalog, revísalo en Gráficas completas por canal y expórtalo en CSV o MSL.',
  },
]

function GuidePage() {
  return (
    <AppShell
      title="Guía de uso"
      subtitle="De cero a un tune afinado: flujo de trabajo completo y compatibilidad de protocolos entre Speeduino y MegaSquirt."
    >
      <div className="space-y-4">
        <section className="panel">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Flujo de trabajo
            </h2>
            <span className="kicker text-[0.55rem]">6 pasos</span>
          </div>
          <ol className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.title} className="rounded-md border border-panel-line/70 bg-background/40 p-3">
                <p className="display text-[0.8rem] text-ink">{step.title}</p>
                <p className="mt-1 text-[0.72rem] leading-snug text-ink-dim">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Matriz de protocolos
            </h2>
            <span className="tag">solo lectura</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[0.72rem]">
              <thead>
                <tr className="border-b border-panel-line/70 text-ink-dim">
                  <th className="kicker px-3 py-2 font-semibold">Plataforma</th>
                  <th className="kicker px-3 py-2 font-semibold">Firmware</th>
                  <th className="kicker px-3 py-2 font-semibold">Serie</th>
                  <th className="kicker px-3 py-2 font-semibold">Trama</th>
                  <th className="kicker px-3 py-2 font-semibold">Definición</th>
                </tr>
              </thead>
              <tbody>
                {ECU_PLATFORMS.map((id) => {
                  const profile = ECU_PROFILES[id]
                  return (
                    <tr key={id} className="border-b border-panel-line/40 last:border-0">
                      <td className="px-3 py-2 text-ink">{profile.name}</td>
                      <td className="num px-3 py-2 text-ink-dim">{profile.firmware.join(' · ')}</td>
                      <td className="num px-3 py-2 text-ink-dim">{profile.baud} 8N1</td>
                      <td className="px-3 py-2 text-ink-dim">{profile.protocol}</td>
                      <td className="px-3 py-2 text-ink-dim">
                        {id === 'speeduino' ? 'Integrada (139 bytes)' : 'INI del firmware'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-panel-line/70 px-4 py-3 text-[0.7rem] leading-snug text-ink-dim">
            No se mezclan offsets entre familias: una trama de Speeduino interpretada con el INI de
            MS3 da lecturas falsas. La app nunca escribe mapas en la ECU, solo lee telemetría.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Código fuente
            </h2>
            <span className="tag">ZIP</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="max-w-xl">
              <p className="text-[0.78rem] leading-snug text-ink">
                Descarga el proyecto completo para subirlo a tu repositorio de GitHub y compilar el
                instalador con Actions.
              </p>
              <p className="mt-1 text-[0.7rem] leading-snug text-ink-dim">
                Incluye app, carpeta electron, workflow de compilación e iconos. Sin dependencias
                instaladas ni datos de sesión.
              </p>
            </div>
            <a
              className="btn"
              href="/downloads/DC-Tuner-Studio-source.zip"
              download="DC-Tuner-Studio-source.zip"
              data-testid="download-source"
            >
              Descargar código
            </a>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Descargar DC-Tuner Studio
            </h2>
            <span className="tag">Windows</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="max-w-xl">
              <p className="text-[0.78rem] leading-snug text-ink">
                Instalador para Windows con tu logo y tu nombre: crea accesos directos en el
                escritorio y en el menú Inicio, y abre DC-Tuner Studio en una ventana propia.
              </p>
              <p className="mt-1 text-[0.7rem] leading-snug text-ink-dim">
                Incluye instalador, desinstalador, lanzador, icono y LEEME. Necesita Chrome o Edge.
                No contiene ni redistribuye TunerStudio MS.
              </p>
            </div>
            <a
              className="btn btn-hot"
              href="/downloads/DC-Tuner-Studio-Windows.zip"
              download="DC-Tuner-Studio-Windows.zip"
              data-testid="download-windows"
            >
              Descargar DC-Tuner Studio
            </a>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
              Software oficial
            </h2>
            <span className="kicker text-[0.55rem]">TunerStudio MS</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="max-w-xl text-[0.74rem] leading-snug text-ink-dim">
              DC-Tuner Studio funciona en el navegador y no aloja instaladores de terceros. Si
              necesitas TunerStudio MS en Windows (2.x o 3.x), descárgalo desde la web de EFI
              Analytics.
            </p>
            <a
              className="btn"
              href="https://www.tunerstudio.com/index.php/downloads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar TunerStudio MS
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
