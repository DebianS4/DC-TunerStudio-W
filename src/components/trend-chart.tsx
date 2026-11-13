import type { Sample } from '../lib/tuner-store'

type Series = {
  key: keyof Sample
  label: string
  token: 'hot' | 'cool' | 'good' | 'warn' | 'danger'
  min: number
  max: number
}

const SERIES_PRESETS: Record<string, Series[]> = {
  live: [
    { key: 'rpm', label: 'RPM', token: 'hot', min: 0, max: 7500 },
    { key: 'map', label: 'MAP kPa', token: 'cool', min: 0, max: 250 },
    { key: 'afr', label: 'AFR', token: 'good', min: 10, max: 18 },
  ],
  fuel: [
    { key: 'afr', label: 'AFR real', token: 'good', min: 10, max: 18 },
    { key: 'targetAfr', label: 'AFR objetivo', token: 'warn', min: 10, max: 18 },
    { key: 've', label: 'VE %', token: 'hot', min: 20, max: 130 },
  ],
  ignition: [
    { key: 'advance', label: 'Avance °', token: 'hot', min: 0, max: 45 },
    { key: 'map', label: 'MAP kPa', token: 'cool', min: 0, max: 250 },
  ],
}

export function TrendChart({
  samples,
  preset = 'live',
  height = 200,
}: {
  samples: Sample[]
  preset?: keyof typeof SERIES_PRESETS
  height?: number
}) {
  const series = SERIES_PRESETS[preset] ?? SERIES_PRESETS.live
  const width = 640
  const padX = 6
  const padY = 10

  if (samples.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-panel-line/80 text-xs text-ink-dim"
        style={{ height }}
      >
        Sin datos todavía. Arranca el motor o graba un datalog.
      </div>
    )
  }

  const buildPath = (item: Series) => {
    return samples
      .map((sample, index) => {
        const raw = Number(sample[item.key] ?? 0)
        const x = padX + (index / (samples.length - 1)) * (width - padX * 2)
        const ratio = (raw - item.min) / (item.max - item.min || 1)
        const y = padY + (1 - Math.min(1, Math.max(0, ratio))) * (height - padY * 2)
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((item) => (
          <span key={String(item.key)} className="flex items-center gap-1.5 text-[0.65rem] text-ink-dim">
            <span
              className="inline-block h-1.5 w-4 rounded-full"
              style={{ backgroundColor: `hsl(var(--${item.token}))` }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-md border border-panel-line/70 bg-background/50"
        style={{ height }}
        role="img"
        aria-label={`Gráfico de ${series.map((s) => s.label).join(', ')}`}
        data-testid="trend-chart"
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + fraction * (height - padY * 2)}
            y2={padY + fraction * (height - padY * 2)}
            stroke="hsl(var(--panel-line) / 0.7)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        ))}
        {series.map((item) => (
          <path
            key={String(item.key)}
            d={buildPath(item)}
            fill="none"
            stroke={`hsl(var(--${item.token}))`}
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.95}
          />
        ))}
      </svg>
    </div>
  )
}
