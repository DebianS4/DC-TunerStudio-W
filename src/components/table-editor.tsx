import { useEffect, useRef, useState } from 'react'
import {
  MAP_AXIS,
  RPM_AXIS,
  clamp,
  nearestCell,
  round,
  tableStats,
  type Table,
} from '../lib/tuning'

type Kind = 've' | 'ignition' | 'afr'

const RANGES: Record<Kind, { min: number; max: number; step: number; unit: string; token: string }> = {
  ve: { min: 20, max: 115, step: 1, unit: '%', token: 'hot' },
  ignition: { min: 0, max: 40, step: 0.5, unit: '°', token: 'cool' },
  afr: { min: 10, max: 16, step: 0.1, unit: 'AFR', token: 'warn' },
}

const TITLES: Record<Kind, { heading: string; table: string; cells: string }> = {
  ve: {
    heading: 'Fuel table · VE %',
    table: 'Tabla de combustible VE',
    cells: 'Celdas de la tabla VE',
  },
  ignition: {
    heading: 'Ignition table · avance °',
    table: 'Tabla de avance de encendido',
    cells: 'Celdas de la tabla de encendido',
  },
  afr: {
    heading: 'AFR target table',
    table: 'Tabla de AFR objetivo',
    cells: 'Celdas de la tabla de AFR objetivo',
  },
}

export function TableEditor({
  table,
  kind,
  liveRpm,
  liveMap,
  running,
  onChange,
  onScale,
  onSmooth,
  onReset,
}: {
  table: Table
  kind: Kind
  liveRpm: number
  liveMap: number
  running: boolean
  onChange: (row: number, col: number, value: number) => void
  onScale: (factor: number) => void
  onSmooth: () => void
  onReset: () => void
}) {
  const [selected, setSelected] = useState({ row: 6, col: 6 })
  const [scaleValue, setScaleValue] = useState('5')
  const [view, setView] = useState<'grid' | '3d'>('grid')
  const gridRef = useRef<HTMLDivElement>(null)
  const range = RANGES[kind]
  const stats = tableStats(table)
  const live = nearestCell(liveRpm, liveMap)
  const selectedValue = table[selected.row]?.[selected.col] ?? 0

  useEffect(() => {
    const node = gridRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
    node?.focus({ preventScroll: true })
  }, [selected])

  const move = (rowDelta: number, colDelta: number) => {
    setSelected((prev) => ({
      row: clamp(prev.row + rowDelta, 0, MAP_AXIS.length - 1),
      col: clamp(prev.col + colDelta, 0, RPM_AXIS.length - 1),
    }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keyMap: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const move2 = keyMap[event.key]
    if (move2) {
      event.preventDefault()
      move(move2[0], move2[1])
      return
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      onChange(selected.row, selected.col, selectedValue + range.step)
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      onChange(selected.row, selected.col, selectedValue - range.step)
    }
  }

  return (
    <section className="panel overflow-hidden" aria-label={TITLES[kind].table}>
      <div className="panel-head flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
            {TITLES[kind].heading}
          </h2>
          <span className="tag">
            {table.length}×{table[0].length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.65rem] text-ink-dim">
          <span className="num">min {stats.min}{range.unit}</span>
          <span className="num">max {stats.max}{range.unit}</span>
          <span className="num">avg {stats.avg}{range.unit}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-panel-line/70 px-3 py-2.5">
        <div className="flex items-end gap-1.5">
          <label className="block">
            <span className="kicker block text-[0.52rem]">Escalar %</span>
            <input
              className="field w-16"
              type="number"
              step="0.5"
              min="0.5"
              max="1.5"
              value={scaleValue}
              onChange={(event) => setScaleValue(event.target.value)}
              aria-label="Porcentaje de escalado de la tabla"
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const factor = 1 + clamp(Number(scaleValue) || 0, -50, 50) / 100
              onScale(factor)
            }}
          >
            Aplicar
          </button>
        </div>
        <button type="button" className="btn" onClick={onSmooth}>
          Suavizar
        </button>
        <button type="button" className="btn btn-danger" onClick={onReset}>
          Restablecer tabla
        </button>

        <div className="flex rounded-md border border-panel-line p-0.5" role="group" aria-label="Vista de la tabla">
          <button
            type="button"
            className={`rounded px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
              view === 'grid' ? 'bg-hot/15 text-hot' : 'text-ink-dim'
            }`}
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
            data-testid="view-grid"
          >
            Tabla
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
              view === '3d' ? 'bg-hot/15 text-hot' : 'text-ink-dim'
            }`}
            aria-pressed={view === '3d'}
            onClick={() => setView('3d')}
            data-testid="view-3d"
          >
            3D
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="tag">
            {MAP_AXIS[selected.row]} kPa · {RPM_AXIS[selected.col]} rpm
          </span>
          <label className="flex items-center gap-1.5">
            <span className="kicker text-[0.52rem]">Valor</span>
            <input
              className="field w-20 text-right"
              type="number"
              step={range.step}
              value={selectedValue}
              onChange={(event) =>
                onChange(selected.row, selected.col, Number(event.target.value))
              }
              aria-label="Valor de la celda seleccionada"
              data-testid="cell-value-input"
            />
          </label>
          <button
            type="button"
            className="btn px-2"
            onClick={() => onChange(selected.row, selected.col, selectedValue - range.step)}
            aria-label="Restar a la celda"
          >
            −
          </button>
          <button
            type="button"
            className="btn px-2"
            onClick={() => onChange(selected.row, selected.col, selectedValue + range.step)}
            aria-label="Sumar a la celda"
          >
            +
          </button>
        </div>
      </div>

      {view === '3d' ? (
        <Surface3D
          table={table}
          range={range}
          selected={selected}
          live={live}
          running={running}
          onSelect={setSelected}
        />
      ) : (
      <div className="overflow-x-auto p-2">
        <div
          ref={gridRef}
          className="min-w-[760px] select-none"
          role="grid"
          aria-label={TITLES[kind].cells}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={{ display: 'grid', gridTemplateColumns: `3.2rem repeat(${RPM_AXIS.length}, minmax(2.3rem, 1fr))` }}
        >
          <div className="kicker flex items-end justify-center pb-1 text-[0.5rem]">kPa \ rpm</div>
          {RPM_AXIS.map((rpm) => (
            <div
              key={`rpm-${rpm}`}
              className="kicker flex items-end justify-center pb-1 text-[0.55rem] text-ink-dim"
            >
              {rpm >= 1000 ? `${rpm / 1000}k` : rpm}
            </div>
          ))}

          {MAP_AXIS.map((mapValue, row) => (
            <RowCells
              key={`row-${mapValue}`}
              row={row}
              mapValue={mapValue}
              table={table}
              range={range}
              selected={selected}
              live={live}
              running={running}
              onSelect={setSelected}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-panel-line/70 px-3 py-2 text-[0.65rem] text-ink-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-ink" /> celda en vivo
          {running ? ` · ${Math.round(liveRpm)} rpm / ${Math.round(liveMap)} kPa` : ' · motor detenido'}
        </span>
        <span>Flechas para moverte, + / − para ajustar</span>
      </div>
    </section>
  )
}

function RowCells({
  row,
  mapValue,
  table,
  range,
  selected,
  live,
  running,
  onSelect,
  onChange,
}: {
  row: number
  mapValue: number
  table: Table
  range: { min: number; max: number; step: number; unit: string; token: string }
  selected: { row: number; col: number }
  live: { row: number; col: number }
  running: boolean
  onSelect: (cell: { row: number; col: number }) => void
  onChange: (row: number, col: number, value: number) => void
}) {
  return (
    <>
      <div className="kicker flex items-center justify-end pr-2 text-[0.55rem] text-ink-dim">
        {mapValue}
      </div>
      {RPM_AXIS.map((rpm, col) => {
        const value = table[row][col]
        const ratio = clamp((value - range.min) / (range.max - range.min || 1), 0, 1)
        const isSelected = selected.row === row && selected.col === col
        const isLive = running && live.row === row && live.col === col
        return (
          <button
            key={`${row}-${col}`}
            type="button"
            role="gridcell"
            data-testid={`cell-${row}-${col}`}
            data-selected={isSelected}
            aria-label={`${rpm} rpm, ${mapValue} kPa: ${round(value, 1)}${range.unit}`}
            onClick={() => onSelect({ row, col })}
            onDoubleClick={() => {
              const next = window.prompt(
                `Valor para ${rpm} rpm / ${mapValue} kPa (${range.unit})`,
                String(value),
              )
              if (next !== null && next.trim() !== '') onChange(row, col, Number(next))
            }}
            className={`num m-[1px] rounded-[3px] py-1.5 text-[0.66rem] leading-none transition-shadow ${
              isSelected ? 'text-ink' : 'text-ink/85'
            }`}
            style={{
              backgroundColor: `hsl(var(--${range.token}) / ${0.08 + ratio * 0.55})`,
              boxShadow: isLive
                ? 'inset 0 0 0 2px hsl(var(--ink))'
                : isSelected
                  ? 'inset 0 0 0 1px hsl(var(--hot))'
                  : 'inset 0 0 0 1px hsl(var(--panel-line) / 0.5)',
            }}
          >
            {round(value, 1)}
          </button>
        )
      })}
    </>
  )
}

function Surface3D({
  table,
  range,
  selected,
  live,
  running,
  onSelect,
}: {
  table: Table
  range: { min: number; max: number; step: number; unit: string; token: string }
  selected: { row: number; col: number }
  live: { row: number; col: number }
  running: boolean
  onSelect: (cell: { row: number; col: number }) => void
}) {
  const width = 920
  const height = 560
  const ratioOf = (value: number) => clamp((value - range.min) / (range.max - range.min || 1), 0, 1)
  const project = (row: number, col: number, ratio: number) => ({
    x: 70 + col * 38 + row * 18,
    y: 330 + row * 15 - ratio * 235,
  })
  const cell = (row: number, col: number) =>
    project(row, col, ratioOf(table[row]?.[col] ?? 0))

  return (
    <div className="p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Vista 3D de la tabla"
        data-testid="surface-3d"
      >
        {MAP_AXIS.slice(0, -1).map((_, row) =>
          RPM_AXIS.slice(0, -1).map((__, col) => {
            const a = cell(row, col)
            const b = cell(row, col + 1)
            const c = cell(row + 1, col + 1)
            const d = cell(row + 1, col)
            const ratio = ratioOf(table[row][col])
            const isSelected = selected.row === row && selected.col === col
            const isLive = running && live.row === row && live.col === col
            return (
              <polygon
                key={`q-${row}-${col}`}
                points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`}
                fill={`hsl(var(--${range.token}) / ${0.14 + ratio * 0.5})`}
                stroke={
                  isLive
                    ? 'hsl(var(--ink))'
                    : isSelected
                      ? 'hsl(var(--hot))'
                      : 'hsl(var(--panel-line) / 0.45)'
                }
                strokeWidth={isLive || isSelected ? 1.6 : 0.6}
                onClick={() => onSelect({ row, col })}
                style={{ cursor: 'pointer' }}
              />
            )
          }),
        )}

        <text x={70} y={height - 40} fontSize="10" fill="hsl(var(--ink-dim))" fontFamily="var(--font-mono)">
          rpm →
        </text>
        <text x={70} y={height - 24} fontSize="10" fill="hsl(var(--ink-dim))" fontFamily="var(--font-mono)">
          kPa ↘
        </text>
        <text x={width - 120} y={40} fontSize="10" fill="hsl(var(--ink-dim))" fontFamily="var(--font-mono)">
          {range.max}
          {range.unit}
        </text>
        <text x={width - 120} y={300} fontSize="10" fill="hsl(var(--ink-dim))" fontFamily="var(--font-mono)">
          {range.min}
          {range.unit}
        </text>
        <text x={16} y={24} fontSize="10" fill="hsl(var(--ink-dim))" fontFamily="var(--font-mono)">
          {round(table[selected.row]?.[selected.col] ?? 0, 1)}
          {range.unit} · {RPM_AXIS[selected.col]} rpm · {MAP_AXIS[selected.row]} kPa
        </text>
      </svg>
    </div>
  )
}
