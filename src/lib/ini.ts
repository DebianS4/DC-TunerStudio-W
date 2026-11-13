export type IniChannel = {
  name: string
  type: string
  offset: number
  scale: number
  translate: number
  unit: string
}

export type IniDefinition = {
  signature: string
  blockSize: number
  getCommand: string
  channels: IniChannel[]
  source: string
}

const SCALAR = /^([A-Za-z0-9_]+)\s*=\s*scalar\s*,\s*([A-Za-z0-9]+)\s*,\s*(-?\d+)\s*(?:,\s*"([^"]*)")?\s*(?:,\s*(-?[\d.]+))?\s*(?:,\s*(-?[\d.]+))?/i

const BYTE_SIZE: Record<string, number> = {
  U08: 1,
  S08: 1,
  U16: 2,
  S16: 2,
  U32: 4,
  S32: 4,
}

export function parseIni(text: string, source = 'definición local'): IniDefinition {
  const channels: IniChannel[] = []
  let signature = ''
  let blockSize = 0
  let getCommand = ''
  let section = ''

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/;.*$/, '').trim()
    if (!line) return
    const sectionMatch = line.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase()
      return
    }
    const keyValue = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (keyValue && section === 'megatune') {
      const [, key, value] = keyValue
      const clean = value.replace(/^"|"$/g, '')
      if (key.toLowerCase() === 'signature') signature = clean
      if (key.toLowerCase() === 'ochblocksize') blockSize = Number(clean) || 0
      if (key.toLowerCase() === 'ochgetcommand') getCommand = clean
      return
    }
    if (section === 'outputchannels') {
      const match = line.match(SCALAR)
      if (!match) return
      const [, name, type, offset, unit, scale, translate] = match
      const upper = type.toUpperCase()
      if (!BYTE_SIZE[upper]) return
      channels.push({
        name,
        type: upper,
        offset: Number(offset),
        scale: scale ? Number(scale) : 1,
        translate: translate ? Number(translate) : 0,
        unit: unit ?? '',
      })
    }
  })

  return { signature, blockSize, getCommand, channels, source }
}

export const SPEEDUINO_DEFINITION: IniDefinition = {
  signature: 'speeduino (definición integrada)',
  blockSize: 139,
  getCommand: 'r$tsCanId\\x30%2o%2c',
  source: 'integrada',
  channels: [
    { name: 'map', type: 'U16', offset: 4, scale: 1, translate: 0, unit: 'kpa' },
    { name: 'iatRaw', type: 'U08', offset: 6, scale: 1, translate: 0, unit: '°C' },
    { name: 'coolantRaw', type: 'U08', offset: 7, scale: 1, translate: 0, unit: '°C' },
    { name: 'batteryVoltage', type: 'U08', offset: 9, scale: 0.1, translate: 0, unit: 'V' },
    { name: 'afr', type: 'U08', offset: 10, scale: 0.1, translate: 0, unit: 'AFR' },
    { name: 'rpm', type: 'U16', offset: 14, scale: 1, translate: 0, unit: 'rpm' },
    { name: 'afrTarget', type: 'U08', offset: 21, scale: 0.1, translate: 0, unit: 'AFR' },
    { name: 'advance', type: 'S08', offset: 24, scale: 1, translate: 0, unit: 'deg' },
    { name: 'tps', type: 'U08', offset: 25, scale: 0.5, translate: 0, unit: '%' },
    { name: 'boostDuty', type: 'U08', offset: 31, scale: 1, translate: 0, unit: '%' },
    { name: 'dwell', type: 'U16', offset: 90, scale: 0.001, translate: 0, unit: 'ms' },
  ],
}

export function commandBytes(def: IniDefinition, canId = 0): Uint8Array {
  const template = def.getCommand || 'r$tsCanId\\x30%2o%2c'
  const resolved = template
    .replace('\\$tsCanId', '\u0000')
    .replace('$tsCanId', '\u0000')
    .replace('\\x30', '0')
    .replace('%2o', '00')
    .replace('%2c', '00')
  const bytes: number[] = []
  for (const char of resolved) bytes.push(char.charCodeAt(0))
  bytes[1] = canId
  return new Uint8Array(bytes)
}

export function readChannel(bytes: Uint8Array, channel: IniChannel): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (channel.offset < 0 || channel.offset + (BYTE_SIZE[channel.type] ?? 1) > bytes.byteLength) {
    return 0
  }
  let raw = 0
  switch (channel.type) {
    case 'U08':
      raw = view.getUint8(channel.offset)
      break
    case 'S08':
      raw = view.getInt8(channel.offset)
      break
    case 'U16':
      raw = view.getUint16(channel.offset, true)
      break
    case 'S16':
      raw = view.getInt16(channel.offset, true)
      break
    case 'U32':
      raw = view.getUint32(channel.offset, true)
      break
    case 'S32':
      raw = view.getInt32(channel.offset, true)
      break
    default:
      raw = 0
  }
  return raw * channel.scale + channel.translate
}

export type Telemetry = {
  rpm: number
  map: number
  tps: number
  afr: number
  targetAfr: number
  advance: number
  coolant: number
  iat: number
  battery: number
  dwell: number
  duty: number
  raw: number
}

const FINDERS: Record<keyof Omit<Telemetry, 'raw'>, string[]> = {
  rpm: ['rpm'],
  map: ['map', 'mapkpa'],
  tps: ['tps', 'tpsdot'],
  afr: ['afr', 'afr1', 'ego'],
  targetAfr: ['afrtarget', 'targetafr'],
  advance: ['advance', 'sparkadvance', 'timing'],
  coolant: ['coolant', 'clt', 'coolantraw', 'coolanttemp'],
  iat: ['iat', 'mat', 'airtemp', 'iatraw'],
  battery: ['batteryvoltage', 'batt', 'battery'],
  dwell: ['dwell', 'dwelltime'],
  duty: ['boostduty', 'injDuty'.toLowerCase(), 'dutycycle', 'idleduty'],
}

export function decodeFrame(bytes: Uint8Array, def: IniDefinition): Telemetry {
  const byName = new Map<string, IniChannel>()
  def.channels.forEach((channel) => byName.set(channel.name.toLowerCase(), channel))

  const pick = (keys: string[]) => {
    for (const key of keys) {
      const channel = byName.get(key)
      if (channel) return readChannel(bytes, channel)
    }
    return 0
  }

  return {
    rpm: pick(FINDERS.rpm),
    map: pick(FINDERS.map),
    tps: pick(FINDERS.tps),
    afr: pick(FINDERS.afr),
    targetAfr: pick(FINDERS.targetAfr),
    advance: pick(FINDERS.advance),
    coolant: pick(FINDERS.coolant),
    iat: pick(FINDERS.iat),
    battery: pick(FINDERS.battery),
    dwell: pick(FINDERS.dwell),
    duty: pick(FINDERS.duty),
    raw: bytes.byteLength,
  }
}
