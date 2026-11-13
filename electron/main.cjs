// Electron shell for DC-Tuner Studio.
// Serves the prerendered static build from ./web through a custom app:// protocol,
// so absolute asset paths (/assets/...) keep working without any local server.

const { app, BrowserWindow, protocol, shell, session } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const SCHEME = 'app'
const HOST = 'dc-tuner'
const WEB_DIR = process.env.DC_TUNER_WEB_DIR
  ? path.resolve(process.env.DC_TUNER_WEB_DIR)
  : path.join(__dirname, 'web')

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
])

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
  '.msl': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
}

function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0].split('#')[0])
  const candidates = []
  const base = path.join(WEB_DIR, clean)

  if (clean.endsWith('/')) {
    candidates.push(path.join(base, 'index.html'))
  } else {
    candidates.push(base)
    candidates.push(`${base}.html`)
    candidates.push(path.join(base, 'index.html'))
  }
  candidates.push(path.join(WEB_DIR, 'index.html'))

  for (const candidate of candidates) {
    const normalized = path.normalize(candidate)
    if (!normalized.startsWith(WEB_DIR)) continue
    if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) return normalized
  }
  return null
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0e13',
    title: 'DC-Tuner Studio',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.loadURL(`${SCHEME}://${HOST}/`)
  return win
}

app.whenReady().then(() => {
  if (!fs.existsSync(path.join(WEB_DIR, 'index.html'))) {
    console.error(
      `[DC-Tuner] No se encontró el build web en ${WEB_DIR}.\n` +
        'Ejecuta "npm run build" y copia el contenido de .output/public dentro de electron/web.',
    )
  }

  protocol.handle(SCHEME, async (request) => {
    const { pathname } = new URL(request.url)
    const file = resolveFile(pathname)
    if (!file) return new Response('No encontrado', { status: 404 })
    const data = await fs.promises.readFile(file)
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
    return new Response(data, { headers: { 'content-type': type } })
  })

  // Web Serial: allow the app to talk to the ECU over USB.
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'serial' || permission === 'usb'
  })
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'serial' || permission === 'usb')
  })
  session.defaultSession.setDevicePermissionHandler((details) => details.deviceType === 'serial')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
