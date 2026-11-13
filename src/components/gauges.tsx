import { clamp, round } from '../lib/tuning'

type Accent = 'hot' | 'cool' | 'good' | 'warn' | 'danger'

const accentVar = (accent: Accent) => `hsl(var(--${accent}))`

export function ArcGauge({
  label,
  value,
  min = 0,
  max = 100,
  unit,
  decimals = 0,
  accent = 'hot',
  warnAt,
  dangerAt,
  size = 'md',
}: {
  label: string
  value: number
  min?: number
  max?: number
  unit?: string
  decimals?: number
  accent?: Accent
  warnAt?: number
  dangerAt?: number
  size?: 'md' | 'lg'
}) {
  const ratio = clamp((value - min) / (max - min || 1), 0, 1)
  const activeAccent: Accent =
    dangerAt !== undefined && value >= dangerAt
      ? 'danger'
      : warnAt !== undefined && value >= warnAt
        ? 'warn'
        : accent

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75
  const dim = size === 'lg' ? 'h-44 w-44 sm:h-52 sm:w-52' : 'h-32 w-32'

  return (
    <div
      className="flex flex-col items-center justify-center"
      role="meter"
      aria-label={label}
      aria-valuenow={round(value, decimals)}
      aria-valuemin={min}
      aria-valuemax={max}
      data-testid={`gauge-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={`relative ${dim}`}>
        <svg viewBox="0 0 140 140" className="h-full w-full">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="hsl(var(--panel-line))"
            strokeWidth="9"
            strokeDasharray={`${arc} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={accentVar(activeAccent)}
            strokeWidth="9"
            strokeDasharray={`${arc * ratio} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
            style={{ transition: 'stroke-dasharray 120ms linear' }}
          />
          {Array.from({ length: 9 }).map((_, index) => {
            const angle = 135 + (270 / 8) * index
            return (
              <line
                key={index}
                x1="70"
                y1="20"
                x2="70"
                y2="26"
                stroke="hsl(var(--ink-dim) / 0.4)"
                strokeWidth="1.2"
                transform={`rotate(${angle} 70 70)`}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="num text-xl font-medium leading-none text-ink sm:text-2xl">
            {value.toFixed(decimals)}
          </span>
          {unit ? (
            <span className="kicker mt-1 text-[0.55rem] tracking-[0.16em]">{unit}</span>
          ) : null}
        </div>
      </div>
      <span className="kicker mt-1 text-center text-[0.6rem]">{label}</span>
    </div>
  )
}

export function BarMeter({
  label,
  value,
  min = 0,
  max = 100,
  unit,
  accent = 'cool',
  decimals = 0,
  warnAt,
  dangerAt,
}: {
  label: string
  value: number
  min?: number
  max?: number
  unit?: string
  accent?: Accent
  decimals?: number
  warnAt?: number
  dangerAt?: number
}) {
  const ratio = clamp((value - min) / (max - min || 1), 0, 1)
  const activeAccent: Accent =
    dangerAt !== undefined && value >= dangerAt
      ? 'danger'
      : warnAt !== undefined && value >= warnAt
        ? 'warn'
        : accent

  return (
    <div
      className="w-full"
      role="meter"
      aria-label={label}
      aria-valuenow={round(value, decimals)}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="kicker text-[0.6rem]">{label}</span>
        <span className="num text-sm text-ink">
          {value.toFixed(decimals)}
          {unit ? <span className="ml-1 text-[0.6rem] text-ink-dim">{unit}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-panel-line/70">
        <div
          className="h-full rounded-full"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: accentVar(activeAccent),
            transition: 'width 120ms linear',
          }}
        />
      </div>
    </div>
  )
}

export function Readout({
  label,
  value,
  unit,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'default' | 'hot' | 'cool' | 'good' | 'warn' | 'danger'
}) {
  const color =
    tone === 'default'
      ? 'text-ink'
      : tone === 'hot'
        ? 'text-hot'
        : tone === 'cool'
          ? 'text-cool'
          : tone === 'good'
            ? 'text-good'
            : tone === 'warn'
              ? 'text-warn'
              : 'text-danger'
  return (
    <div className="rounded-md border border-panel-line/80 bg-panel/60 px-3 py-2">
      <span className="kicker block text-[0.55rem]">{label}</span>
      <span className={`num block text-base ${color}`}>
        {value}
        {unit ? <span className="ml-1 text-[0.62rem] text-ink-dim">{unit}</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-[0.65rem] text-ink-dim">{hint}</span> : null}
    </div>
  )
}
