import { useMemo, useState } from 'react'
import type { Sample } from '../lib/tuner-store'
import { round } from '../lib/tuning'

export type ChannelKey = keyof Pick<
  Sample,
  'rpm' | 'map' | 'tps' | 'afr' | 'targetAfr' | 'advance' | 'duty' | 've' | 'coolant'
>

export type ChannelMeta = {
  key: ChannelKey
  label: string
  unit: string
  token: 'hot' | 'cool' | 'good' | 'warn' | 'danger' | 'chrome'
  min: number
  max: number
  decimals: number
}

export const CHANNELS: ChannelMeta[] = [
  { key: 'rpm', label: 'RPM', unit: 'rpm', token: 'hot', min: 0, max: 7500, decimals: 0 },
  { key: 'map', label: 'MAP', unit: 'kPa', token: 'cool', min: 0, max: 250, decimals: 0 },
  { key: 'tps', label: 'TPS', unit: '%', token: 'chrome', min: 0, max: 100, decimals: 1 },
  { key: 'afr', label: 'AFR real', unit: 'AFR', token: 'good', min: 9, max: 19, decimals: 2 },
  { key: 'targetAfr', label: 'AFR objetivo', unit: 'AFR', token: 'warn', min: 9, max: 19, decimals: 2 },
  { key: 'advance', label: 'Avance', unit: '°', token: 'hot', min: 0, max: 45, decimals: 1 },
  { key: 'duty', label: 'Duty iny.', unit: '%', token: 'cool', min: 0, max: 100, decimals: 1 },
  { key: 've', label: 'VE', unit: '%', token: 'chrome', min: 20, max: 130, decimals: 1 },
  { key: 'coolant', label: 'Temp. CLT', unit: '°C', token: 'danger', min: 0, max: 120, decimals: 1 },
]

export function channelMeta(key: ChannelKey) {
  return CHANNELS.find((channel) => channel.key === key) ?? CHANNELS[0]
}

export function ChannelPicker({
  selected,
  onToggle,
}: {
  selected: ChannelKey[]
  onToggle: (key: ChannelKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Canales del gráfico">
      {CHANNELS.map((channel) => {
        const active = selected.includes(channel.key)
        return (
          <button
            key={channel.key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(channel.key)}
            data-testid={`channel-${channel.key}`}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.66rem] transition-colors ${
              active
                ? 'border-panel-line bg-panel-raised text-ink'
                : 'border-panel-line/60 text-ink-dim hover:text-ink'
            }`}
          >
            <span
              className="h-1.5 w-3 rounded-full"
              style={{
                backgroundColor: active ? `hsl(var(--${channel.token}))` : 'hsl(var(--panel-line))',
              }}
            />
            {channel.label}
          </button>
        )
      })}
    </div>
  )
}

export function MultiChart({
  samples,
  channels,
  height = 320,
  showKnock = true,
}: {
  samples: Sample[]
  channels: ChannelKey[]
  height?: number
  showKnock?: boolean
}) {
  const width = 900
  const padLeft = 44
  const padRight = 12
  const padTop = 14
  const padBottom = 22

  if (samples.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-panel-line/80 text-xs text-ink-dim"
        style={{ height }}
      >
        Sin datos. Arranca el motor, graba un datalog o conecta la ECU para ver las gráficas.
      </div>
    )
  }

  const active = channels.map(channelMeta)
  const xAt = (index: number) =>
    padLeft + (index / (samples.length - 1)) * (width - padLeft - padRight)
  const yAt = (value: number, min: number, max: number) => {
    const ratio = (value - min) / (max - min || 1)
    return padTop + (1 - Math.min(1, Math.max(0, ratio))) * (height - padTop - padBottom)
  }
  const lastSample = samples[samples.length - 1]

  const paths = active.map((channel) => ({
    channel,
    d: samples
      .map((sample, index) => {
        const value = Number(sample[channel.key] ?? 0)
        return `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(1)},${yAt(value, channel.min, channel.max).toFixed(1)}`
      })
      .join(' '),
  }))

  const spanSeconds = Math.max(1, samples[samples.length - 1].t - samples[0].t)
  const ticks = 6

  return (
    <div className="rounded-md border border-panel-line/70 bg-background/50">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-panel-line/60 px-3 py-1.5">
        {active.map((channel) => (
          <span key={channel.key} className="flex items-center gap-1.5 text-[0.66rem] text-ink-dim">
            <span
              className="h-1.5 w-3 rounded-full"
              style={{ backgroundColor: `hsl(var(--${channel.token}))` }}
            />
            {channel.label}
            <span className="num text-ink">
              {Number(lastSample[channel.key] ?? 0).toFixed(channel.decimals)}
              {channel.unit === 'AFR' ? '' : ` ${channel.unit}`}
            </span>
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Gráfica de ${active.map((channel) => channel.label).join(', ')}`}
        data-testid="multi-chart"
      >
        {Array.from({ length: ticks + 1 }).map((_, index) => {
          const y = padTop + (index / ticks) * (height - padTop - padBottom)
          return (
            <line
              key={`h-${index}`}
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="hsl(var(--panel-line) / 0.6)"
              strokeWidth="1"
              strokeDasharray={index === ticks ? '0' : '3 6'}
            />
          )
        })}
        {Array.from({ length: ticks + 1 }).map((_, index) => {
          const y = padTop + (index / ticks) * (height - padTop - padBottom)
          return (
            <text
              key={`label-${index}`}
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="hsl(var(--ink-dim))"
              fontFamily="var(--font-mono)"
            >
              {Math.round((1 - index / ticks) * 100)}%
            </text>
          )
        })}

        {showKnock
          ? samples.map((sample, index) =>
              sample.knock && !samples[index - 1]?.knock ? (
                <line
                  key={`knock-${index}`}
                  x1={xAt(index)}
                  x2={xAt(index)}
                  y1={padTop}
                  y2={height - padBottom}
                  stroke="hsl(var(--danger) / 0.5)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
              ) : null,
            )
          : null}

        {paths.map(({ channel, d }) => (
          <path
            key={channel.key}
            d={d}
            fill="none"
            stroke={`hsl(var(--${channel.token}))`}
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {[0, 0.5, 1].map((fraction) => (
          <text
            key={`x-${fraction}`}
            x={padLeft + fraction * (width - padLeft - padRight)}
            y={height - 6}
            textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}
            fontSize="9"
            fill="hsl(var(--ink-dim))"
            fontFamily="var(--font-mono)"
          >
            {(fraction * spanSeconds).toFixed(0)} s
          </text>
        ))}
      </svg>
    </div>
  )
}

export function ChannelStats({ samples, channels }: { samples: Sample[]; channels: ChannelKey[] }) {
  const rows = useMemo(
    () =>
      channels.map((key) => {
        const meta = channelMeta(key)
        const values = samples.map((sample) => Number(sample[key] ?? 0))
        const min = values.length ? Math.min(...values) : 0
        const max = values.length ? Math.max(...values) : 0
        const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
        return { meta, min, max, avg }
      }),
    [channels, samples],
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[0.72rem]">
        <thead>
          <tr className="border-b border-panel-line/70 text-ink-dim">
            <th className="kicker px-2 py-1.5 font-semibold">Canal</th>
            <th className="kicker px-2 py-1.5 font-semibold">Mín</th>
            <th className="kicker px-2 py-1.5 font-semibold">Medio</th>
            <th className="kicker px-2 py-1.5 font-semibold">Máx</th>
            <th className="kicker px-2 py-1.5 font-semibold">Actual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ meta, min, max, avg }) => {
            const last = samples.length ? Number(samples[samples.length - 1][meta.key] ?? 0) : 0
            return (
              <tr key={meta.key} className="border-b border-panel-line/40 last:border-0">
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span
                      className="h-1.5 w-3 rounded-full"
                      style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
                    />
                    {meta.label}
                  </span>
                </td>
                <td className="num px-2 py-1.5 text-ink-dim">{min.toFixed(meta.decimals)}</td>
                <td className="num px-2 py-1.5 text-ink-dim">{avg.toFixed(meta.decimals)}</td>
                <td className="num px-2 py-1.5 text-ink-dim">{max.toFixed(meta.decimals)}</td>
                <td className="num px-2 py-1.5 text-ink">{last.toFixed(meta.decimals)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function useChannels(initial: ChannelKey[] = ['rpm', 'afr', 'targetAfr', 'map']) {
  const [channels, setChannels] = useState<ChannelKey[]>(initial)
  const toggle = (key: ChannelKey) =>
    setChannels((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  return { channels, toggle, setChannels }
}
