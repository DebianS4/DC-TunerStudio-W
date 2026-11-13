import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { InstallButton } from './install-button'
import { useTuner } from '../lib/tuner-store'
import { ecuProfile, round } from '../lib/tuning'

type IconProps = { className?: string }

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="M12 13.5 16 9.5" />
      <circle cx="12" cy="14" r="1.4" />
    </svg>
  )
}

function FuelIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 21V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" />
      <path d="M3 21h11" />
      <path d="M13 9h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
      <path d="M6.5 8h4" />
    </svg>
  )
}

function SparkIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />
    </svg>
  )
}

function LogIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M3 17l4-6 4 3 4-7 5 5" />
      <path d="M3 21h18" />
    </svg>
  )
}

function WandIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="m4 20 9-9" />
      <path d="M14 3.5 15 6l2.5 1L15 8l-1 2.5L13 8l-2.5-1L13 6l1-2.5Z" />
      <path d="M19 13l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </svg>
  )
}

function ArchiveIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M10 13h4" />
    </svg>
  )
}

function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-5 3 2 4-6" />
    </svg>
  )
}

function TargetIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

function PlugIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
      <path d="M12 17v4" />
    </svg>
  )
}

function PulseIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M2 12h4l2-6 3 12 3-8 2 2h6" />
    </svg>
  )
}

function BookIcon({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
      <path d="M8 7h7M8 11h7" />
    </svg>
  )
}

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GaugeIcon },
  { to: '/download', label: 'Descargar', icon: ArchiveIcon },
  { to: '/fuel', label: 'Fuel Table', icon: FuelIcon },
  { to: '/ignition', label: 'Ignition Table', icon: SparkIcon },
  { to: '/afr', label: 'AFR Target', icon: TargetIcon },
  { to: '/analyze', label: 'VE Analyze Live', icon: WandIcon },
  { to: '/charts', label: 'Gráficas', icon: ChartIcon },
  { to: '/datalog', label: 'Datalog', icon: LogIcon },
  { to: '/connection', label: 'Conexión', icon: PlugIcon },
  { to: '/diagnostics', label: 'Diagnóstico', icon: PulseIcon },
  { to: '/settings', label: 'Settings', icon: SlidersIcon },
  { to: '/tunes', label: 'Tune Manager', icon: ArchiveIcon },
  { to: '/setup', label: 'Engine Setup', icon: SlidersIcon },
  { to: '/guide', label: 'Guía', icon: BookIcon },
] as const

function TopBar() {
  const { state, dispatch } = useTuner()
  const { sim, tune } = state
  const running = sim.running
  const profile = ecuProfile(tune.ecu)

  return (
    <header className="sticky top-0 z-30 border-b border-panel-line/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 lg:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-hot/50 bg-hot/10">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <path
                d="M4 20V6.5A2.5 2.5 0 0 1 6.5 4h4A2.5 2.5 0 0 1 13 6.5V20"
                stroke="hsl(var(--hot))"
                strokeWidth="1.9"
              />
              <path d="M3 20h12" stroke="hsl(var(--hot))" strokeWidth="1.9" />
              <path
                d="M13 9h3.5A2.5 2.5 0 0 1 19 11.5v6a1.7 1.7 0 0 0 3.4 0V10"
                stroke="hsl(var(--cool))"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <span className="leading-none">
            <span className="display block text-[1.05rem] font-semibold tracking-[0.16em] text-ink">
              DC-TUNER <span className="text-hot">STUDIO</span>
            </span>
            <span className="kicker mt-1 block text-[0.58rem] tracking-[0.28em]">
              Engine management suite
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <span
            className={`led ${state.connection.status === 'connected' ? '' : running ? 'led-cool' : 'led-idle'}`}
            aria-hidden="true"
          />
          <span className="kicker" data-testid="ecu-state">
            {state.connection.status === 'connected'
              ? `Serie real · ${profile.short}`
              : running
                ? 'ECU enlazada'
                : 'ECU en espera'}{' '}
            · {profile.short}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="hidden rounded-md border border-panel-line bg-panel/70 px-2.5 py-1 text-right sm:block">
            <span className="kicker block text-[0.55rem]">Tune activo · {profile.short}</span>
            <span className="display block max-w-[170px] truncate text-[0.82rem] text-ink">
              {tune.name}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-panel-line bg-panel/70 px-3 py-1">
            <span className="text-right">
              <span className="kicker block text-[0.55rem]">RPM</span>
              <span className="num block text-sm text-ink">{Math.round(sim.rpm)}</span>
            </span>
            <span className="h-6 w-px bg-panel-line" aria-hidden="true" />
            <span className="text-right">
              <span className="kicker block text-[0.55rem]">AFR</span>
              <span className="num block text-sm text-ink">
                {sim.afr > 0 ? round(sim.afr, 1).toFixed(1) : '--'}
              </span>
            </span>
          </div>
          <button
            type="button"
            className={`btn ${running ? '' : 'btn-hot'}`}
            onClick={() => dispatch({ type: 'toggleRunning' })}
            data-testid="engine-toggle"
            aria-pressed={running}
          >
            <span className={`led ${running ? '' : 'led-idle'}`} aria-hidden="true" />
            {running ? 'Detener motor' : 'Arrancar motor'}
          </button>
          <InstallButton />
        </div>
      </div>
    </header>
  )
}

function SideNav() {
  return (
    <nav
      aria-label="Secciones de la aplicación"
      className="flex gap-1 overflow-x-auto border-b border-panel-line/70 bg-panel/50 px-2 py-1.5 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:w-56 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-2 lg:py-4"
    >
      <p className="kicker mb-2 hidden px-3 lg:block">Navegación</p>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className="link-nav shrink-0 whitespace-nowrap rounded-r-md"
            activeOptions={{ exact: item.to === '/' }}
          >
            <Icon className="shrink-0 opacity-80" />
            {item.label}
          </Link>
        )
      })}
      <div className="mt-auto hidden px-3 pt-6 lg:block">
        <p className="kicker text-[0.55rem]">ECU virtual</p>
        <p className="num mt-1 text-[0.68rem] leading-relaxed text-ink-dim">
          DC-Tuner Studio
          <br />
          build 1.0 · sim
        </p>
      </div>
    </nav>
  )
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <SideNav />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="kicker text-[0.6rem] text-hot">DC-Tuner Studio</p>
              <h1 className="display text-2xl font-semibold uppercase tracking-[0.08em] text-ink sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-ink-dim">{subtitle}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
