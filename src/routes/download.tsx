import { createFileRoute, Link } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'
import siteMetadata from '../metadata.json'
import { assetUrl } from '../lib/asset-url'

const pageMeta = siteMetadata['/download']

export const Route = createFileRoute('/download')({
  head: () => ({
    meta: [
      { title: pageMeta.title },
      { name: 'description', content: pageMeta.description },
    ],
  }),
  component: DownloadPage,
})

function DownloadPage() {
  return (
    <AppShell
      title="Descarga oficial"
      subtitle="Instala DC-Tuner Studio en Windows y lleva tu flujo de tuning al garaje, al banco o a la pista."
    >
      <div className="space-y-4">
        <section className="relative isolate overflow-hidden rounded-xl border border-panel-line/80 bg-panel shadow-[0_18px_70px_hsl(var(--background)/0.45)]">
          <img
            src={assetUrl('/dc-tuner-download-hero.png')}
            alt="Motor preparado y estación de tuning con gráficas de ECU"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--background)/0.98)_0%,hsl(var(--background)/0.88)_38%,hsl(var(--background)/0.45)_72%,hsl(var(--background)/0.2)_100%)]" />
          <div className="max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
            <p className="kicker text-[0.6rem] text-cool">Windows · Speeduino · MegaSquirt</p>
            <h2 className="display mt-2 text-3xl font-semibold uppercase leading-[0.95] tracking-[0.06em] text-ink sm:text-5xl">
              Tu ECU. <span className="text-hot">Tus datos.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-dim sm:text-base">
              Una estación de trabajo enfocada en combustible, encendido y telemetría. Abre el instalador,
              conecta tu ECU por USB y empieza con un mapa claro desde el primer minuto.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={assetUrl('/downloads/DC-Tuner-Studio-Windows.zip')}
                download="DC-Tuner-Studio-Windows.zip"
                className="btn btn-hot"
              >
                Descargar para Windows
              </a>
              <Link to="/" className="btn">Abrir el dashboard</Link>
            </div>
            <p className="mt-3 text-[0.68rem] text-ink-dim">Paquete ZIP · Chrome o Edge requerido para Web Serial</p>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="panel p-4">
            <p className="kicker text-[0.55rem] text-hot">01 · Instala</p>
            <h3 className="display mt-2 text-base uppercase tracking-[0.1em] text-ink">Descomprime y ejecuta</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">Abre el ZIP y ejecuta <span className="num text-ink">Instalar DC-Tuner Studio.bat</span> para crear tus accesos directos.</p>
          </section>
          <section className="panel p-4">
            <p className="kicker text-[0.55rem] text-cool">02 · Conecta</p>
            <h3 className="display mt-2 text-base uppercase tracking-[0.1em] text-ink">Elige tu plataforma</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">Configura Speeduino, MegaSquirt MS2 o MS3, firmware, puerto y velocidad de comunicación.</p>
          </section>
          <section className="panel p-4">
            <p className="kicker text-[0.55rem] text-good">03 · Ajusta</p>
            <h3 className="display mt-2 text-base uppercase tracking-[0.1em] text-ink">Mide antes de corregir</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">Observa AFR, MAP, RPM y avance; guarda tunes y usa VE Analyze Live con cambios trazables.</p>
          </section>
        </div>

        <section className="panel overflow-hidden">
          <div className="panel-head">
            <div>
              <p className="kicker text-[0.55rem] text-hot">Incluido en la suite</p>
              <h2 className="display mt-1 text-lg uppercase tracking-[0.1em] text-ink">Una caja de herramientas para el taller</h2>
            </div>
            <span className="tag">v1.0</span>
          </div>
          <div className="grid gap-px bg-panel-line/60 sm:grid-cols-2 lg:grid-cols-4">
            {['Tablas VE y encendido', 'Datalogger y gráficas', 'AFR objetivo y auto tune', 'Restore points y diagnóstico'].map((item) => (
              <div key={item} className="bg-panel p-4 text-sm text-ink-dim">
                <span className="mr-2 text-hot">+</span>{item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cool/30 bg-cool/5 p-4">
          <div>
            <p className="kicker text-[0.55rem] text-cool">¿Quieres revisar el código?</p>
            <p className="mt-1 text-sm text-ink-dim">El proyecto es público y contiene el código fuente, la configuración Electron y el workflow de Windows.</p>
          </div>
          <a className="btn" href="https://github.com/DebianS4/DC-TunerStudio-W" target="_blank" rel="noreferrer">Ver repositorio</a>
        </section>
      </div>
    </AppShell>
  )
}
