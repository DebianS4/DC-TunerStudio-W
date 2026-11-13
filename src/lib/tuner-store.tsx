import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  CLT_SENSOR_OFFSET,
  ECU_PROFILES,
  MAP_SENSOR_SCALE,
  clamp,
  createTune,
  defaultAfrTable,
  defaultIgnitionTable,
  defaultVeTable,
  interp,
  nearestCell,
  normalizeTune,
  round,
  scaleTable,
  smoothTable,
  uid,
  type EcuConfig,
  type EcuSettings,
  type EngineConfig,
  type Table,
  type Tune,
} from './tuning'
import { ecuLink, serialSupported } from './serial'
import { SPEEDUINO_DEFINITION, parseIni, type IniDefinition, type Telemetry } from './ini'

export type Sample = {
  t: number
  rpm: number
  map: number
  tps: number
  afr: number
  targetAfr: number
  advance: number
  duty: number
  ve: number
  knock: boolean
  coolant: number
}

export type Correction = {
  id: string
  at: number
  cell: string
  before: number
  after: number
  afr: number
  targetAfr: number
}

export type DataLog = {
  id: string
  name: string
  startedAt: number
  durationMs: number
  samples: Sample[]
}

export type RestorePoint = {
  id: string
  name: string
  at: number
  tune: Tune
}

export type LogEvent = {
  id: string
  at: number
  text: string
  tone: 'info' | 'warn' | 'ok'
}

type Sim = {
  running: boolean
  auto: boolean
  manualThrottle: number
  t: number
  ticks: number
  rpm: number
  map: number
  tps: number
  coolant: number
  advance: number
  afr: number
  targetAfr: number
  duty: number
  ve: number
  knock: boolean
  accelTicks: number
  prevTps: number
  iat: number
  battery: number
  dwell: number
  fanOn: boolean
  history: Sample[]
  events: LogEvent[]
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type Connection = {
  status: ConnectionStatus
  live: boolean
  frames: number
  device: string
  error: string | null
  log: string[]
  ini: IniDefinition | null
  telemetry: Telemetry | null
}

type State = {
  tune: Tune
  savedTunes: Tune[]
  restorePoints: RestorePoint[]
  logs: DataLog[]
  recording: DataLog | null
  analyze: { active: boolean; corrections: number; log: Correction[] }
  sim: Sim
  connection: Connection
  hydrated: boolean
}

type Persisted = {
  tune: Tune
  savedTunes: Tune[]
  restorePoints: RestorePoint[]
  logs: DataLog[]
}

type Action =
  | { type: 'hydrate'; payload: Persisted | null }
  | { type: 'tick' }
  | { type: 'toggleRunning' }
  | { type: 'toggleAuto' }
  | { type: 'setThrottle'; value: number }
  | { type: 'toggleAnalyze' }
  | { type: 'setCell'; table: 've' | 'ignition' | 'afr'; row: number; col: number; value: number }
  | { type: 'patchEngine'; patch: Partial<EngineConfig> }
  | { type: 'patchSettings'; patch: Partial<EcuSettings> }
  | { type: 'event'; text: string; tone?: LogEvent['tone'] }
  | { type: 'importTune'; tune: Tune }
  | { type: 'connectionStatus'; status: ConnectionStatus; device?: string; error?: string | null; message?: string }
  | { type: 'connectionIni'; ini: IniDefinition | null }
  | { type: 'connectionLive'; live: boolean }
  | { type: 'telemetry'; telemetry: Telemetry }
  | { type: 'patchEcu'; patch: Partial<EcuConfig> }
  | { type: 'renameTune'; name: string }
  | { type: 'scaleTable'; table: 've' | 'ignition' | 'afr'; factor: number }
  | { type: 'smoothTable'; table: 've' | 'ignition' | 'afr' }
  | { type: 'resetTable'; table: 've' | 'ignition' | 'afr' }
  | { type: 'resetTune' }
  | { type: 'saveTune' }
  | { type: 'loadTune'; id: string }
  | { type: 'deleteTune'; id: string }
  | { type: 'duplicateTune'; id: string }
  | { type: 'saveRestore' }
  | { type: 'restorePoint'; id: string }
  | { type: 'deleteRestore'; id: string }
  | { type: 'startRecording' }
  | { type: 'stopRecording' }
  | { type: 'deleteLog'; id: string }

const STORAGE_KEY = 'dc-tuner-studio/v1'
const HISTORY_LIMIT = 240
const LOG_SAMPLE_LIMIT = 1200

function event(state: Sim, text: string, tone: LogEvent['tone'] = 'info'): LogEvent[] {
  return [{ id: uid(), at: Date.now(), text, tone }, ...state.events].slice(0, 14)
}

function pushSample(history: Sample[], sample: Sample) {
  const next = [...history, sample]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

const initialSim = (): Sim => ({
  running: false,
  auto: true,
  manualThrottle: 0.3,
  t: 0,
  ticks: 0,
  rpm: 0,
  map: 0,
  tps: 0,
  coolant: 24,
  advance: 0,
  afr: 0,
  targetAfr: 0,
  duty: 0,
  ve: 0,
  knock: false,
  accelTicks: 0,
  prevTps: 0,
  iat: 24,
  battery: 12.4,
  dwell: 0,
  fanOn: false,
  history: [],
  events: [
    {
      id: uid(),
      at: Date.now(),
      text: 'DC-Tuner Studio listo · ECU virtual en espera',
      tone: 'info',
    },
  ],
})

const initialState = (): State => ({
  tune: createTune('Tune base · DC'),
  savedTunes: [],
  restorePoints: [],
  logs: [],
  recording: null,
  analyze: { active: false, corrections: 0, log: [] },
  sim: initialSim(),
  connection: {
    status: 'disconnected',
    live: false,
    frames: 0,
    device: '',
    error: null,
    log: [],
    ini: null,
    telemetry: null,
  },
  hydrated: false,
})

function simulate(state: State): State {
  const s = state.sim
  const engine = state.tune.engine
  const dt = 0.12

  if (!s.running) {
    return state
  }

  const t = s.t + dt
  const ticks = s.ticks + 1
  const cycle = t % 54

  let demand: number
  if (s.auto) {
    if (cycle < 9) demand = 0.05 + 0.015 * Math.sin(t * 2.1)
    else if (cycle < 18) demand = 0.22 + 0.08 * Math.sin(t * 0.9)
    else if (cycle < 24) demand = 0.82 + 0.12 * Math.sin(t * 1.7)
    else if (cycle < 33) demand = 0.38 + 0.14 * Math.sin(t * 1.2)
    else if (cycle < 37) demand = 0.02
    else demand = 0.55 + 0.3 * Math.sin(t * 0.7)
  } else {
    demand = s.manualThrottle
  }
  demand = clamp(demand, 0, 1)

  const rpmTarget = engine.idleRpm + demand * (engine.revLimit - engine.idleRpm) * 0.86
  const mapTarget = 22 + demand * 205

  const rpm = clamp(
    s.rpm + (rpmTarget - s.rpm) * 0.22 + (Math.random() - 0.5) * 20,
    engine.idleRpm * 0.55,
    engine.revLimit + 100,
  )
  const map = clamp(s.map + (mapTarget - s.map) * 0.2 + (Math.random() - 0.5) * 2, 18, 245)
  const tps = s.tps + (demand * 100 - s.tps) * 0.35

  const settings = state.tune.settings
  const ve = interp(state.tune.ve, rpm, map)
  const ignitionAdvance = interp(state.tune.ignition, rpm, map)
  const targetAfr = interp(state.tune.afrTarget, rpm, map)

  const coolant = clamp(s.coolant + (88 - s.coolant) * 0.012 + (demand > 0.7 ? 0.02 : 0), 18, 118)
  const fanOn = coolant > settings.fanOnC

  const requiredVe = clamp(34 + (map / 240) * 54 + (rpm / 7000) * 12, 28, 112)
  const veError = (requiredVe - ve) / requiredVe
  let afr = targetAfr * (1 + veError * 1.85)
  if (settings.wueEnabled && coolant < 72) afr -= (72 - coolant) * 0.02
  const tpsDelta = tps - s.prevTps
  const accelTrigger =
    settings.accelMode === 'TPS'
      ? tpsDelta > settings.accelThreshold * 0.35
      : mapTarget - s.map > 8
  const accelTicks = accelTrigger
    ? Math.round(settings.accelMs * 8)
    : Math.max(0, s.accelTicks - 1)
  if (accelTicks > 0) afr -= 0.55
  if (settings.egoEnabled && map < 110) {
    afr += (targetAfr - afr) * (settings.egoAuthority / 100) * 0.35
  }
  afr = clamp(afr + (Math.random() - 0.5) * 0.08, 9.5, 19)

  const dwellPenalty = settings.dwellMs < 2.5 ? 3 : settings.dwellMs > 4.5 ? 1 : 0
  const knockLimit = 36 - map / 13 + (rpm < 2600 ? 3 : 0) - dwellPenalty
  const knock = ignitionAdvance > knockLimit
  const advance = knock ? knockLimit - 2.5 : ignitionAdvance
  const layoutFactor =
    settings.injectionLayout === 'seq' ? 0.9 : settings.injectionLayout === 'semi-seq' ? 0.95 : 1
  const duty = clamp(
    (map * rpm * ve * layoutFactor) / (engine.injectorCc * engine.cylinders * 383),
    1.5,
    96,
  )

  const tpsCal =
    settings.tpsCalOpen === settings.tpsCalClosed
      ? tps
      : clamp(
          ((tps - settings.tpsCalClosed) / (settings.tpsCalOpen - settings.tpsCalClosed)) * 100,
          0,
          100,
        )
  const mapDisplay = round(map * MAP_SENSOR_SCALE[settings.mapSensor], 1)
  const coolantDisplay = round(
    (fanOn ? coolant - 0.4 : coolant) + CLT_SENSOR_OFFSET[settings.cltSensor],
    1,
  )
  const iatDisplay = round(24 + (map / 240) * 8, 1)
  const battery = round(13.8 + Math.sin(t * 0.8) * 0.12, 2)
  const dwell = settings.dwellMs

  const sample: Sample = {
    t: round(t, 1),
    rpm: Math.round(rpm),
    map: mapDisplay,
    tps: round(tpsCal, 1),
    afr: round(afr, 2),
    targetAfr: round(targetAfr, 2),
    advance: round(advance, 1),
    duty: round(duty, 1),
    ve: round(ve, 1),
    knock,
    coolant: coolantDisplay,
  }

  let tune = state.tune
  let analyze = state.analyze
  if (analyze.active && ticks % 3 === 0) {
    const error = Math.abs(afr - targetAfr)
    if (error > 0.06) {
      const { row, col } = nearestCell(rpm, map)
      const before = tune.ve[row][col]
      const ratio = clamp(targetAfr / afr, 0.88, 1.14)
      const after = clamp(
        before * (1 + (ratio - 1) * engine.analyzeStrength * 0.8),
        10,
        135,
      )
      if (Math.abs(after - before) > 0.04) {
        const veTable = tune.ve.map((cells, ri) =>
          cells.map((value, ci) => (ri === row && ci === col ? round(after, 1) : value)),
        )
        tune = { ...tune, ve: veTable, updatedAt: Date.now() }
        analyze = {
          active: true,
          corrections: analyze.corrections + 1,
          log: [
            {
              id: uid(),
              at: Date.now(),
              cell: `${Math.round(rpm)} rpm · ${Math.round(map)} kPa`,
              before: round(before, 1),
              after: round(after, 1),
              afr: round(afr, 2),
              targetAfr: round(targetAfr, 2),
            },
            ...analyze.log,
          ].slice(0, 10),
        }
      }
    }
  }

  let recording = state.recording
  if (recording && recording.samples.length < LOG_SAMPLE_LIMIT) {
    recording = {
      ...recording,
      durationMs: Date.now() - recording.startedAt,
      samples: [...recording.samples, sample],
    }
  }

  let events = s.events
  if (knock && !s.knock) {
    events = event(
      { ...s, events },
      `Knock detectado a ${Math.round(rpm)} rpm · ${Math.round(map)} kPa`,
      'warn',
    )
  }

  return {
    ...state,
    tune,
    analyze,
    recording,
    sim: {
      ...s,
      t,
      ticks,
      rpm,
      map: mapDisplay,
      tps: tpsCal,
      coolant: coolantDisplay,
      advance,
      afr,
      targetAfr,
      duty,
      ve,
      knock,
      iat: iatDisplay,
      battery,
      dwell,
      fanOn,
      accelTicks,
      prevTps: tps,
      history: pushSample(s.history, sample),
      events,
    },
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate': {
      if (!action.payload) return { ...state, hydrated: true }
      return {
        ...state,
        tune: normalizeTune(action.payload.tune),
        savedTunes: (action.payload.savedTunes ?? []).map((item) => normalizeTune(item)),
        restorePoints: (action.payload.restorePoints ?? []).map((point) => ({
          ...point,
          tune: normalizeTune(point.tune),
        })),
        logs: action.payload.logs ?? [],
        hydrated: true,
      }
    }
    case 'tick':
      return simulate(state)

    case 'toggleRunning': {
      const running = !state.sim.running
      return {
        ...state,
        sim: {
          ...state.sim,
          running,
          t: running ? 0 : state.sim.t,
          ticks: running ? 0 : state.sim.ticks,
          rpm: running ? state.tune.engine.idleRpm : 0,
          map: running ? 32 : 0,
          tps: running ? 3 : 0,
          afr: running ? state.tune.engine.afrIdle : 0,
          targetAfr: running ? state.tune.engine.afrIdle : 0,
          advance: running ? 8 : 0,
          duty: running ? 4 : 0,
          coolant: running ? Math.max(state.sim.coolant, 40) : state.sim.coolant,
          history: running ? [] : state.sim.history,
          events: event(
            state.sim,
            running ? 'Motor en marcha · ECU virtual conectada' : 'Motor detenido',
            running ? 'ok' : 'info',
          ),
        },
      }
    }

    case 'toggleAuto': {
      const auto = !state.sim.auto
      return {
        ...state,
        sim: {
          ...state.sim,
          auto,
          events: event(state.sim, auto ? 'Ciclo de conducción automático' : 'Control manual de acelerador'),
        },
      }
    }

    case 'setThrottle':
      return {
        ...state,
        sim: { ...state.sim, manualThrottle: clamp(action.value, 0, 1), auto: false },
      }

    case 'toggleAnalyze': {
      const active = !state.analyze.active
      return {
        ...state,
        analyze: { ...state.analyze, active },
        sim: {
          ...state.sim,
          events: event(
            state.sim,
            active ? 'VE Analyze Live activo · corrigiendo tabla' : 'VE Analyze Live detenido',
            active ? 'ok' : 'info',
          ),
        },
      }
    }

    case 'setCell': {
      const limits: Record<string, [number, number]> = {
        ve: [10, 140],
        ignition: [-5, 48],
        afr: [8, 18],
      }
      const limit = limits[action.table] ?? [0, 100]
      const value = round(clamp(action.value, limit[0], limit[1]), 1)
      const table = state.tune[action.table].map((cells, ri) =>
        cells.map((cell, ci) => (ri === action.row && ci === action.col ? value : cell)),
      )
      return {
        ...state,
        tune: { ...state.tune, [action.table]: table, updatedAt: Date.now() },
      }
    }

    case 'patchEngine': {
      const engine: EngineConfig = { ...state.tune.engine, ...action.patch }
      engine.idleRpm = clamp(Math.round(engine.idleRpm), 500, 1600)
      engine.revLimit = clamp(Math.round(engine.revLimit), 3500, 9500)
      engine.cylinders = clamp(Math.round(engine.cylinders), 2, 12)
      engine.displacement = clamp(round(engine.displacement, 1), 0.5, 8)
      engine.injectorCc = clamp(Math.round(engine.injectorCc), 100, 2200)
      engine.afrIdle = clamp(round(engine.afrIdle, 1), 10, 16)
      engine.afrCruise = clamp(round(engine.afrCruise, 1), 10, 16)
      engine.afrBoost = clamp(round(engine.afrBoost, 1), 9, 15)
      engine.analyzeStrength = clamp(round(engine.analyzeStrength, 2), 0.1, 1)
      return { ...state, tune: { ...state.tune, engine, updatedAt: Date.now() } }
    }

    case 'patchEcu': {
      const next: EcuConfig = { ...state.tune.ecu, ...action.patch }
      const profile = ECU_PROFILES[next.platform] ?? ECU_PROFILES.speeduino
      const firmware = profile.firmware.includes(next.firmware)
        ? next.firmware
        : profile.firmware[0]
      const ecu: EcuConfig = {
        platform: profile.id,
        firmware,
        port: next.port.trim() || '/dev/ttyACM0',
        baud: profile.baud,
      }
      return {
        ...state,
        tune: { ...state.tune, ecu, updatedAt: Date.now() },
        sim: {
          ...state.sim,
          events: event(
            state.sim,
            `ECU configurada: ${profile.name} · ${ecu.firmware}`,
            'ok',
          ),
        },
      }
    }

    case 'patchSettings': {
      const settings: EcuSettings = { ...state.tune.settings, ...action.patch }
      settings.dwellMs = clamp(round(settings.dwellMs, 1), 0.5, 8)
      settings.idlePwm = clamp(Math.round(settings.idlePwm), 0, 100)
      settings.accelMs = clamp(round(settings.accelMs, 1), 0, 8)
      settings.accelThreshold = clamp(round(settings.accelThreshold, 1), 1, 60)
      settings.egoAuthority = clamp(Math.round(settings.egoAuthority), 0, 50)
      settings.fanOnC = clamp(Math.round(settings.fanOnC), 70, 115)
      settings.tpsCalClosed = clamp(Math.round(settings.tpsCalClosed), 0, 60)
      settings.tpsCalOpen = clamp(Math.round(settings.tpsCalOpen), 40, 100)
      return {
        ...state,
        tune: { ...state.tune, settings, updatedAt: Date.now() },
        sim: { ...state.sim, dwell: settings.dwellMs },
      }
    }

    case 'event':
      return {
        ...state,
        sim: { ...state.sim, events: event(state.sim, action.text, action.tone ?? 'info') },
      }

    case 'importTune': {
      const tune = normalizeTune({ ...action.tune, id: action.tune.id || uid() })
      return {
        ...state,
        tune,
        sim: {
          ...state.sim,
          events: event(state.sim, `Tune importado · ${tune.name}`, 'ok'),
        },
      }
    }

    case 'connectionStatus':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: action.status,
          device: action.device ?? state.connection.device,
          error: action.error ?? null,
          log: action.message
            ? [`${new Date().toLocaleTimeString('es-ES')} · ${action.message}`, ...state.connection.log].slice(0, 40)
            : state.connection.log,
        },
        sim: {
          ...state.sim,
          events: action.message ? event(state.sim, action.message, action.status === 'error' ? 'warn' : 'info') : state.sim.events,
        },
      }

    case 'connectionIni':
      return {
        ...state,
        connection: {
          ...state.connection,
          ini: action.ini,
          log: action.ini
            ? [
                `${new Date().toLocaleTimeString('es-ES')} · INI cargado: ${action.ini.signature || 'sin firma'} · ${action.ini.blockSize} bytes · ${action.ini.channels.length} canales`,
                ...state.connection.log,
              ].slice(0, 40)
            : state.connection.log,
        },
      }

    case 'connectionLive':
      return {
        ...state,
        connection: {
          ...state.connection,
          live: action.live,
          log: [
            `${new Date().toLocaleTimeString('es-ES')} · ${action.live ? 'Telemetría real activa' : 'Telemetría real en pausa'}`,
            ...state.connection.log,
          ].slice(0, 40),
        },
      }

    case 'telemetry': {
      const data = action.telemetry
      const sample: Sample = {
        t: round(state.sim.t + 0.12, 1),
        rpm: Math.round(data.rpm),
        map: round(data.map, 1),
        tps: round(data.tps, 1),
        afr: round(data.afr, 2),
        targetAfr: round(data.targetAfr || data.afr, 2),
        advance: round(data.advance, 1),
        duty: round(data.duty, 1),
        ve: round(state.sim.ve, 1),
        knock: false,
        coolant: round(data.coolant, 1),
      }
      let recording = state.recording
      if (recording && recording.samples.length < LOG_SAMPLE_LIMIT) {
        recording = {
          ...recording,
          durationMs: Date.now() - recording.startedAt,
          samples: [...recording.samples, sample],
        }
      }
      return {
        ...state,
        recording,
        connection: {
          ...state.connection,
          frames: state.connection.frames + 1,
          telemetry: data,
        },
        sim: {
          ...state.sim,
          running: true,
          t: state.sim.t + 0.12,
          rpm: data.rpm,
          map: data.map,
          tps: data.tps,
          afr: data.afr,
          targetAfr: data.targetAfr || data.afr,
          advance: data.advance,
          coolant: data.coolant,
          iat: data.iat || state.sim.iat,
          battery: data.battery || state.sim.battery,
          dwell: data.dwell || state.tune.settings.dwellMs,
          duty: data.duty,
          history: pushSample(state.sim.history, sample),
        },
      }
    }

    case 'renameTune':
      return { ...state, tune: { ...state.tune, name: action.name } }

    case 'scaleTable': {
      const factor = clamp(action.factor, 0.5, 1.5)
      return {
        ...state,
        tune: {
          ...state.tune,
          [action.table]: scaleTable(state.tune[action.table], factor),
          updatedAt: Date.now(),
        },
      }
    }

    case 'smoothTable':
      return {
        ...state,
        tune: {
          ...state.tune,
          [action.table]: smoothTable(state.tune[action.table]),
          updatedAt: Date.now(),
        },
      }

    case 'resetTable':
      return {
        ...state,
        tune: {
          ...state.tune,
          [action.table]:
            action.table === 've'
              ? defaultVeTable()
              : action.table === 'afr'
                ? defaultAfrTable()
                : defaultIgnitionTable(),
          updatedAt: Date.now(),
        },
      }

    case 'resetTune': {
      const tune = createTune(state.tune.name)
      return {
        ...state,
        tune,
        sim: { ...state.sim, events: event(state.sim, 'Tune restablecido a valores base', 'warn') },
      }
    }

    case 'saveTune': {
      const exists = state.savedTunes.some((item) => item.id === state.tune.id)
      const savedTunes = exists
        ? state.savedTunes.map((item) =>
            item.id === state.tune.id ? { ...state.tune, updatedAt: Date.now() } : item,
          )
        : [...state.savedTunes, { ...state.tune, updatedAt: Date.now() }]
      return {
        ...state,
        savedTunes,
        sim: { ...state.sim, events: event(state.sim, `Tune "${state.tune.name}" guardado`, 'ok') },
      }
    }

    case 'loadTune': {
      const found = state.savedTunes.find((item) => item.id === action.id)
      if (!found) return state
      return {
        ...state,
        tune: { ...found, ve: found.ve.map((r) => [...r]), ignition: found.ignition.map((r) => [...r]) },
        sim: { ...state.sim, events: event(state.sim, `Tune "${found.name}" cargado`, 'ok') },
      }
    }

    case 'deleteTune':
      return { ...state, savedTunes: state.savedTunes.filter((item) => item.id !== action.id) }

    case 'duplicateTune': {
      const found = state.savedTunes.find((item) => item.id === action.id)
      if (!found) return state
      const copy: Tune = {
        ...found,
        id: uid(),
        name: `${found.name} copia`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ve: found.ve.map((r) => [...r]),
        ignition: found.ignition.map((r) => [...r]),
      }
      return { ...state, savedTunes: [...state.savedTunes, copy] }
    }

    case 'saveRestore': {
      const point: RestorePoint = {
        id: uid(),
        name: `Restore ${state.restorePoints.length + 1}`,
        at: Date.now(),
        tune: {
          ...state.tune,
          ve: state.tune.ve.map((r) => [...r]),
          ignition: state.tune.ignition.map((r) => [...r]),
          engine: { ...state.tune.engine },
        },
      }
      return {
        ...state,
        restorePoints: [point, ...state.restorePoints].slice(0, 12),
        sim: { ...state.sim, events: event(state.sim, `${point.name} creado`, 'ok') },
      }
    }

    case 'restorePoint': {
      const point = state.restorePoints.find((item) => item.id === action.id)
      if (!point) return state
      return {
        ...state,
        tune: {
          ...point.tune,
          ve: point.tune.ve.map((r) => [...r]),
          ignition: point.tune.ignition.map((r) => [...r]),
          engine: { ...point.tune.engine },
          updatedAt: Date.now(),
        },
        sim: { ...state.sim, events: event(state.sim, `Restaurado: ${point.name}`, 'warn') },
      }
    }

    case 'deleteRestore':
      return {
        ...state,
        restorePoints: state.restorePoints.filter((item) => item.id !== action.id),
      }

    case 'startRecording':
      return {
        ...state,
        recording: {
          id: uid(),
          name: `Log ${state.logs.length + 1}`,
          startedAt: Date.now(),
          durationMs: 0,
          samples: [],
        },
        sim: { ...state.sim, events: event(state.sim, 'Grabación de datalog iniciada', 'ok') },
      }

    case 'stopRecording': {
      const recording = state.recording
      if (!recording) return state
      const saved: DataLog = {
        ...recording,
        durationMs: Date.now() - recording.startedAt,
      }
      return {
        ...state,
        recording: null,
        logs: [saved, ...state.logs].slice(0, 8),
        sim: {
          ...state.sim,
          events: event(
            state.sim,
            `Datalog guardado · ${saved.samples.length} muestras`,
            'ok',
          ),
        },
      }
    }

    case 'deleteLog':
      return { ...state, logs: state.logs.filter((log) => log.id !== action.id) }

    default:
      return state
  }
}

const persist = (state: State): Persisted => ({
  tune: state.tune,
  savedTunes: state.savedTunes,
  restorePoints: state.restorePoints,
  logs: state.logs.map((log) => ({ ...log, samples: log.samples.slice(-600) })),
})

type TunerContextValue = {
  state: State
  dispatch: React.Dispatch<Action>
  serialAvailable: boolean
  connectEcu: () => Promise<void>
  disconnectEcu: () => Promise<void>
  loadIni: (text: string, source: string) => void
  toggleLive: () => void
}

const TunerContext = createContext<TunerContextValue | null>(null)

export function TunerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      dispatch({ type: 'hydrate', payload: raw ? (JSON.parse(raw) as Persisted) : null })
    } catch {
      dispatch({ type: 'hydrate', payload: null })
    }
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persist(state)))
    } catch {
      // Storage full or unavailable: keep the session running without persistence.
    }
  }, [state])

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 120)
    return () => window.clearInterval(id)
  }, [])

  const connectEcu = useCallback(async () => {
    if (!serialSupported()) {
      dispatch({
        type: 'connectionStatus',
        status: 'error',
        error: 'Web Serial no disponible',
        message: 'Este navegador no expone Web Serial. Usa Chrome o Edge en escritorio con HTTPS.',
      })
      return
    }
    dispatch({ type: 'connectionStatus', status: 'connecting', message: 'Solicitando puerto serie…' })
    try {
      await ecuLink.requestAndOpen(state.tune.ecu.baud)
      dispatch({
        type: 'connectionStatus',
        status: 'connected',
        device: ecuLink.deviceLabel,
        message: `Conectado a ${ecuLink.deviceLabel} · ${state.tune.ecu.baud} baudios · ${state.tune.ecu.platform}`,
      })
      dispatch({ type: 'connectionLive', live: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el puerto'
      dispatch({
        type: 'connectionStatus',
        status: 'error',
        error: message,
        message: `Error de conexión: ${message}`,
      })
    }
  }, [state.tune.ecu.baud, state.tune.ecu.platform])

  const disconnectEcu = useCallback(async () => {
    await ecuLink.close()
    dispatch({ type: 'connectionStatus', status: 'disconnected', message: 'ECU desconectada' })
    dispatch({ type: 'connectionLive', live: false })
  }, [])

  const loadIni = useCallback((text: string, source: string) => {
    try {
      const ini = parseIni(text, source)
      if (ini.channels.length === 0) throw new Error('El archivo no contiene canales en [OutputChannels]')
      dispatch({ type: 'connectionIni', ini })
    } catch (error) {
      dispatch({
        type: 'connectionStatus',
        status: 'error',
        error: error instanceof Error ? error.message : 'INI inválido',
        message: `INI inválido: ${error instanceof Error ? error.message : 'desconocido'}`,
      })
    }
  }, [])

  const toggleLive = useCallback(() => {
    dispatch({ type: 'connectionLive', live: !state.connection.live })
  }, [state.connection.live])

  useEffect(() => {
    if (state.connection.status !== 'connected' || !state.connection.live) return
    const definition = state.connection.ini ?? SPEEDUINO_DEFINITION
    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const frame = await ecuLink.readFrame(definition, 800)
        if (cancelled) return
        dispatch({ type: 'telemetry', telemetry: frame })
        timer = window.setTimeout(poll, 150)
      } catch (error) {
        if (cancelled) return
        dispatch({
          type: 'connectionStatus',
          status: 'error',
          error: error instanceof Error ? error.message : 'Lectura fallida',
          message: `Lectura interrumpida: ${error instanceof Error ? error.message : 'error'}`,
        })
        dispatch({ type: 'connectionLive', live: false })
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [state.connection.status, state.connection.live, state.connection.ini])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      serialAvailable: serialSupported(),
      connectEcu,
      disconnectEcu,
      loadIni,
      toggleLive,
    }),
    [state, connectEcu, disconnectEcu, loadIni, toggleLive],
  )

  return <TunerContext.Provider value={value}>{children}</TunerContext.Provider>
}

export function useTuner() {
  const context = useContext(TunerContext)
  if (!context) throw new Error('useTuner debe usarse dentro de TunerProvider')
  return context
}

export function useTable(table: 've' | 'ignition' | 'afr'): Table {
  const { state } = useTuner()
  return state.tune[table]
}
