import { commandBytes, decodeFrame, type IniDefinition, type Telemetry } from './ini'

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo?: () => { usbVendorId?: number; usbProductId?: number }
}

type SerialApi = {
  requestPort: () => Promise<SerialPortLike>
  getPorts: () => Promise<SerialPortLike[]>
}

export function serialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

function serialApi(): SerialApi {
  return (navigator as unknown as { serial: SerialApi }).serial
}

class EcuLink {
  private port: SerialPortLike | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private buffer = new Uint8Array(0)

  get connected() {
    return Boolean(this.port)
  }

  get deviceLabel() {
    const info = this.port?.getInfo?.()
    if (!info) return 'ECU serie'
    const vendor = info.usbVendorId?.toString(16).padStart(4, '0') ?? '----'
    const product = info.usbProductId?.toString(16).padStart(4, '0') ?? '----'
    return `USB ${vendor}:${product}`
  }

  async requestAndOpen(baudRate: number) {
    if (!serialSupported()) throw new Error('Web Serial no está disponible en este navegador')
    const port = await serialApi().requestPort()
    await this.openPort(port, baudRate)
  }

  async openExisting(baudRate: number) {
    const ports = await serialApi().getPorts()
    if (ports.length === 0) throw new Error('No hay puertos autorizados')
    await this.openPort(ports[0], baudRate)
  }

  private async openPort(port: SerialPortLike, baudRate: number) {
    await port.open({ baudRate })
    this.port = port
    this.buffer = new Uint8Array(0)
    this.reader = port.readable?.getReader() ?? null
    this.writer = port.writable?.getWriter() ?? null
  }

  async close() {
    try {
      await this.reader?.cancel()
      this.reader?.releaseLock()
    } catch {
      // reader already released
    }
    try {
      this.writer?.releaseLock()
    } catch {
      // writer already released
    }
    try {
      await this.port?.close()
    } catch {
      // port already closed
    }
    this.reader = null
    this.writer = null
    this.port = null
    this.buffer = new Uint8Array(0)
  }

  private async readExactly(size: number, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs
    while (this.buffer.byteLength < size) {
      if (!this.reader) throw new Error('Puerto serie no abierto')
      if (Date.now() > deadline) throw new Error('Tiempo de espera agotado sin respuesta de la ECU')
      const remaining = deadline - Date.now()
      const result = await Promise.race([
        this.reader.read(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado sin respuesta de la ECU')), remaining),
        ),
      ])
      if (result.done) throw new Error('La ECU cerró la conexión')
      const chunk = result.value
      const merged = new Uint8Array(this.buffer.byteLength + chunk.byteLength)
      merged.set(this.buffer)
      merged.set(chunk, this.buffer.byteLength)
      this.buffer = merged
    }
    const frame = this.buffer.slice(0, size)
    this.buffer = this.buffer.slice(size)
    return frame
  }

  async readFrame(def: IniDefinition, timeoutMs = 900): Promise<Telemetry> {
    if (!this.writer) throw new Error('Puerto serie no abierto')
    const request = commandBytes(def)
    await this.writer.write(request)
    const blockSize = def.blockSize > 0 ? def.blockSize : 139
    const bytes = await this.readExactly(blockSize, timeoutMs)
    return decodeFrame(bytes, def)
  }

  async writeBytes(bytes: Uint8Array) {
    if (!this.writer) throw new Error('Puerto serie no abierto')
    await this.writer.write(bytes)
  }
}

export const ecuLink = new EcuLink()
