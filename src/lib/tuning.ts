export const RPM_AXIS = [
  800, 1000, 1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600, 5000, 5500, 6000, 7000,
]

export const MAP_AXIS = [20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 200, 240]

export type Table = number[][]

export type EngineConfig = {
  cylinders: number
  displacement: number
  injectorCc: number
  idleRpm: number
  revLimit: number
  afrIdle: number
  afrCruise: number
  afrBoost: number
  analyzeStrength: number
}

export type EcuSettings = {
  dwellMs: number
  sparkMode: 'wasted' | 'sequential'
  injectionLayout: 'batch' | 'semi-seq' | 'seq'
  idleMode: 'open' | 'closed'
  idlePwm: number
  accelMode: 'TPS' | 'MAP'
  accelMs: number
  accelThreshold: number
  egoEnabled: boolean
  egoAuthority: number
  wueEnabled: boolean
  fanOnC: number
  cltSensor: 'GM' | 'VW' | 'Miata'
  iatSensor: 'GM' | 'VW' | 'Miata'
  mapSensor: 'MPX4250' | 'MPX5700' | '4 bar'
  tpsCalClosed: number
  tpsCalOpen: number
}

export const defaultSettings = (): EcuSettings => ({
  dwellMs: 3.2,
  sparkMode: 'wasted',
  injectionLayout: 'semi-seq',
  idleMode: 'closed',
  idlePwm: 32,
  accelMode: 'TPS',
  accelMs: 1.2,
  accelThreshold: 12,
  egoEnabled: true,
  egoAuthority: 15,
  wueEnabled: true,
  fanOnC: 96,
  cltSensor: 'GM',
  iatSensor: 'GM',
  mapSensor: 'MPX4250',
  tpsCalClosed: 0,
  tpsCalOpen: 100,
})

export const CLT_SENSOR_OFFSET: Record<EcuSettings['cltSensor'], number> = {
  GM: 0,
  VW: -1.6,
  Miata: 1.3,
}

export const MAP_SENSOR_SCALE: Record<EcuSettings['mapSensor'], number> = {
  MPX4250: 1,
  MPX5700: 0.985,
  '4 bar': 1.015,
}

export type Tune = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  ve: Table
  ignition: Table
  afrTarget: Table
  engine: EngineConfig
  settings: EcuSettings
  ecu: EcuConfig
}

export type EcuPlatform = 'speeduino' | 'megasquirt-ms2' | 'megasquirt-ms3'

export type EcuConfig = {
  platform: EcuPlatform
  firmware: string
  port: string
  baud: number
}

export type EcuProfile = {
  id: EcuPlatform
  name: string
  short: string
  firmware: string[]
  baud: number
  tableSize: string
  protocol: string
  analyzeName: string
  logFormat: string
  features: string[]
  note: string
}

export const ECU_PROFILES: Record<EcuPlatform, EcuProfile> = {
  speeduino: {
    id: 'speeduino',
    name: 'Speeduino',
    short: 'Speeduino',
    firmware: ['2024.06', '2023.09', '2022.11'],
    baud: 115200,
    tableSize: '16 × 16',
    protocol: 'Serial / USB · protocolo Speeduino 3',
    analyzeName: 'Auto Tune',
    logFormat: 'CSV (compatible MegaLogViewer)',
    features: [
      'Auto Tune de VE sobre tabla 16×16',
      'Tabla de encendido 16×16 con dwell',
      'Conexión serie USB 115200 baudios',
      'Aceleración, ralentí y boost configurables',
    ],
    note: 'Proyecto abierto sobre Arduino Mega. Los mapas se cargan con TunerStudio o Speeduino Studio.',
  },
  'megasquirt-ms2': {
    id: 'megasquirt-ms2',
    name: 'MegaSquirt MS2',
    short: 'MS2',
    firmware: ['MS2Extra 3.4.4', 'MS2Extra 3.4.2', 'MS2Extra 3.3.2'],
    baud: 115200,
    tableSize: '12 × 12 nativa',
    protocol: 'Serial RS232 / USB · protocolo MS2Extra',
    analyzeName: 'VE Analyze Live',
    logFormat: 'MSL (MegaLogViewer)',
    features: [
      'VEAL con tabla de combustible 12×12',
      'Tabla de encendido 12×12',
      'AFR objetivo por carga y RPM',
      'Datalog MSL para MegaLogViewer',
    ],
    note: 'ECU de la familia Bowling & Grippo. Usa MS2Extra y requiere adaptador USB-serie.',
  },
  'megasquirt-ms3': {
    id: 'megasquirt-ms3',
    name: 'MegaSquirt MS3',
    short: 'MS3',
    firmware: ['MS3 1.6.1', 'MS3 1.5.2', 'MS3Pro 1.5.2'],
    baud: 115200,
    tableSize: '16 × 16',
    protocol: 'USB / CAN · protocolo MS3',
    analyzeName: 'VE Analyze Live',
    logFormat: 'MSL (MegaLogViewer)',
    features: [
      'VEAL con tabla de combustible 16×16',
      'Encendido 16×16 y corte por cilindro',
      'Boost, launch control y VVT',
      'Datalog MSL con canales ampliados',
    ],
    note: 'Plataforma tope de MegaSquirt. Acepta CAN, tablas grandes y tracción por cilindro.',
  },
}

export const ECU_PLATFORMS: EcuPlatform[] = ['speeduino', 'megasquirt-ms2', 'megasquirt-ms3']

export const defaultEcu = (): EcuConfig => ({
  platform: 'speeduino',
  firmware: ECU_PROFILES.speeduino.firmware[0],
  port: '/dev/ttyACM0',
  baud: ECU_PROFILES.speeduino.baud,
})

export const ecuProfile = (ecu: EcuConfig | undefined): EcuProfile =>
  ECU_PROFILES[ecu?.platform ?? 'speeduino'] ?? ECU_PROFILES.speeduino

export function normalizeTune(raw: Partial<Tune> | null | undefined): Tune {
  const base = createTune(raw?.name ?? 'Tune base')
  if (!raw) return base
  const profile = ECU_PROFILES[raw.ecu?.platform as EcuPlatform] ?? ECU_PROFILES.speeduino
  const firmware =
    raw.ecu?.firmware && profile.firmware.includes(raw.ecu.firmware)
      ? raw.ecu.firmware
      : profile.firmware[0]
  const validTable = (table: Table | undefined) =>
    Array.isArray(table) &&
    table.length === MAP_AXIS.length &&
    table.every((row) => Array.isArray(row) && row.length === RPM_AXIS.length)

  return {
    ...base,
    ...raw,
    ve: validTable(raw.ve) ? (raw.ve as Table) : base.ve,
    ignition: validTable(raw.ignition) ? (raw.ignition as Table) : base.ignition,
    afrTarget: validTable(raw.afrTarget) ? (raw.afrTarget as Table) : base.afrTarget,
    engine: { ...base.engine, ...(raw.engine ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    ecu: {
      platform: profile.id,
      firmware,
      port: raw.ecu?.port || '/dev/ttyACM0',
      baud: profile.baud,
    },
  }
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function correctVeForAfr(before: number, afr: number, targetAfr: number, strength: number) {
  if (
    ![before, afr, targetAfr, strength].every(Number.isFinite) ||
    before <= 0 ||
    afr <= 0 ||
    targetAfr <= 0
  ) {
    return before
  }

  // A higher measured AFR means a lean mixture and therefore requires more VE/fuel.
  const fuelRatio = clamp(afr / targetAfr, 0.88, 1.14)
  const correctionStrength = clamp(strength, 0, 1) * 0.8
  return clamp(before * (1 + (fuelRatio - 1) * correctionStrength), 10, 135)
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const defaultEngine = (): EngineConfig => ({
  cylinders: 4,
  displacement: 2.0,
  injectorCc: 440,
  idleRpm: 850,
  revLimit: 7000,
  afrIdle: 14.7,
  afrCruise: 14.5,
  afrBoost: 12.3,
  analyzeStrength: 0.6,
})

export function emptyTable(fill: number): Table {
  return MAP_AXIS.map(() => RPM_AXIS.map(() => fill))
}

export function defaultVeTable(): Table {
  return MAP_AXIS.map((map) =>
    RPM_AXIS.map((rpm) => {
      const load = (map - 20) / 220
      const rpmTerm = rpm / 7000
      const torqueBump = 6 * Math.exp(-(((rpm - 3800) / 1500) ** 2))
      const idleBump = map < 40 ? 10 : 0
      return round(clamp(31 + load * 56 + rpmTerm * 10 + torqueBump + idleBump, 18, 118), 1)
    }),
  )
}

export function defaultIgnitionTable(): Table {
  return MAP_AXIS.map((map) =>
    RPM_AXIS.map((rpm) => {
      const load = (map - 20) / 220
      const rpmTerm = rpm / 7000
      const base = 10 + load * 9 + rpmTerm * 16
      const idleRetard = rpm < 1200 ? -4 : 0
      return round(clamp(base + idleRetard, 2, 40), 1)
    }),
  )
}

export function defaultAfrTable(): Table {
  return MAP_AXIS.map((map) =>
    RPM_AXIS.map(() => {
      if (map <= 45) return 14.7
      if (map <= 100) return round(14.7 - ((map - 45) / 55) * 0.2, 1)
      if (map <= 145) return round(14.5 - ((map - 100) / 45) * 2.2, 1)
      return 12.3
    }),
  )
}

export function createTune(name = 'Tune base'): Tune {
  const now = Date.now()
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    ve: defaultVeTable(),
    ignition: defaultIgnitionTable(),
    afrTarget: defaultAfrTable(),
    engine: defaultEngine(),
    settings: defaultSettings(),
    ecu: defaultEcu(),
  }
}

function axisPosition(axis: number[], value: number) {
  const v = clamp(value, axis[0], axis[axis.length - 1])
  let index = 0
  for (let i = 0; i < axis.length - 1; i += 1) {
    if (v >= axis[i] && v <= axis[i + 1]) {
      index = i
      break
    }
    if (v > axis[i + 1]) index = i + 1
  }
  const low = axis[index]
  const high = axis[Math.min(index + 1, axis.length - 1)]
  const span = high - low || 1
  return { index, ratio: clamp((v - low) / span, 0, 1) }
}

export function interp(table: Table, rpm: number, map: number): number {
  const rowPos = axisPosition(MAP_AXIS, map)
  const colPos = axisPosition(RPM_AXIS, rpm)
  const rowHigh = Math.min(rowPos.index + 1, table.length - 1)
  const colHigh = Math.min(colPos.index + 1, table[0].length - 1)
  const top =
    table[rowPos.index][colPos.index] * (1 - colPos.ratio) +
    table[rowPos.index][colHigh] * colPos.ratio
  const bottom =
    table[rowHigh][colPos.index] * (1 - colPos.ratio) +
    table[rowHigh][colHigh] * colPos.ratio
  return top * (1 - rowPos.ratio) + bottom * rowPos.ratio
}

export function nearestCell(rpm: number, map: number) {
  const row = MAP_AXIS.reduce(
    (best, value, index) =>
      Math.abs(value - map) < Math.abs(MAP_AXIS[best] - map) ? index : best,
    0,
  )
  const col = RPM_AXIS.reduce(
    (best, value, index) =>
      Math.abs(value - rpm) < Math.abs(RPM_AXIS[best] - rpm) ? index : best,
    0,
  )
  return { row, col }
}

export function targetAfrFor(engine: EngineConfig, map: number): number {
  if (map <= 50) return engine.afrIdle
  if (map <= 100) {
    const ratio = (map - 50) / 50
    return engine.afrIdle + (engine.afrCruise - engine.afrIdle) * ratio
  }
  if (map <= 145) {
    const ratio = (map - 100) / 45
    return engine.afrCruise + (engine.afrBoost - engine.afrCruise) * ratio
  }
  return engine.afrBoost
}

export function tableStats(table: Table) {
  const flat = table.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const avg = flat.reduce((sum, value) => sum + value, 0) / flat.length
  return { min, max, avg: round(avg, 1) }
}

export function smoothTable(table: Table): Table {
  return table.map((row, ri) =>
    row.map((value, ci) => {
      const neighbors: number[] = []
      for (let r = ri - 1; r <= ri + 1; r += 1) {
        for (let c = ci - 1; c <= ci + 1; c += 1) {
          if (r === ri && c === ci) continue
          if (table[r]?.[c] === undefined) continue
          neighbors.push(table[r][c])
        }
      }
      const average = neighbors.reduce((sum, v) => sum + v, 0) / neighbors.length
      return round(value * 0.6 + average * 0.4, 1)
    }),
  )
}

export function scaleTable(table: Table, factor: number): Table {
  return table.map((row) => row.map((value) => round(value * factor, 1)))
}

export function diffTables(a: Table, b: Table) {
  const changes: { row: number; col: number; from: number; to: number; delta: number }[] = []
  a.forEach((row, ri) =>
    row.forEach((value, ci) => {
      const next = b[ri]?.[ci] ?? value
      const delta = round(next - value, 1)
      if (Math.abs(delta) >= 0.1) {
        changes.push({ row: ri, col: ci, from: value, to: next, delta })
      }
    }),
  )
  return changes
}

export function tuneDiff(current: Tune, reference: Tune) {
  const ve = diffTables(reference.ve, current.ve)
  const ignition = diffTables(reference.ignition, current.ignition)
  const engineChanges = (Object.keys(current.engine) as (keyof EngineConfig)[])
    .filter((key) => current.engine[key] !== reference.engine[key])
    .map((key) => ({
      key,
      from: reference.engine[key],
      to: current.engine[key],
    }))
  const maxDelta = Math.max(
    0,
    ...ve.map((c) => Math.abs(c.delta)),
    ...ignition.map((c) => Math.abs(c.delta)),
  )
  return {
    ve,
    ignition,
    engineChanges,
    total: ve.length + ignition.length + engineChanges.length,
    maxDelta: round(maxDelta, 1),
  }
}

export function toCsv(samples: { [key: string]: number | boolean }[]) {
  if (samples.length === 0) return ''
  const keys = Object.keys(samples[0])
  const lines = [keys.join(',')]
  samples.forEach((sample) => {
    lines.push(keys.map((key) => String(sample[key])).join(','))
  })
  return lines.join('\n')
}

const MSL_COLUMNS: { key: string; label: string }[] = [
  { key: 't', label: 'Time' },
  { key: 'rpm', label: 'RPM' },
  { key: 'map', label: 'MAP' },
  { key: 'tps', label: 'TPS' },
  { key: 'afr', label: 'AFR' },
  { key: 'targetAfr', label: 'AFR Target' },
  { key: 'advance', label: 'Advance' },
  { key: 'duty', label: 'Duty Cycle' },
  { key: 've', label: 'VE' },
  { key: 'coolant', label: 'Coolant' },
]

export function toMsl(samples: { [key: string]: number | boolean }[], tuneName: string) {
  const now = new Date()
  const header = [
    '[MSL]',
    `Capture Date: ${now.toLocaleDateString('en-GB')}`,
    `Capture Time: ${now.toLocaleTimeString('en-GB')}`,
    `Tune Name: ${tuneName}`,
    'Log Format: TunerStudio MSL',
    'Sample Rate: 8.33',
    `Record Count: ${samples.length}`,
    '',
    MSL_COLUMNS.map((column) => column.label).join('\t'),
  ]
  const rows = samples.map((sample) =>
    MSL_COLUMNS.map((column) => String(sample[column.key] ?? '')).join('\t'),
  )
  return [...header, ...rows].join('\n')
}

export function correctionsCsv(
  entries: { at: number; cell: string; before: number; after: number; afr: number; targetAfr: number }[],
) {
  const lines = ['Hora,Celda,VE antes,VE despues,AFR real,AFR objetivo,Correccion %']
  entries.forEach((entry) => {
    const delta = entry.before === 0 ? 0 : ((entry.after - entry.before) / entry.before) * 100
    lines.push(
      [
        new Date(entry.at).toLocaleTimeString('es-ES'),
        entry.cell,
        entry.before,
        entry.after,
        entry.afr,
        entry.targetAfr,
        delta.toFixed(2),
      ].join(','),
    )
  })
  return lines.join('\n')
}
