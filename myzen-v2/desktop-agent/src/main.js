const { app, BrowserWindow, Tray, Menu, nativeImage, powerMonitor, shell } = require('electron')
const { dataDir, loadEnv, settings } = require('./paths')
const { createCore } = require('./core')
const { listen } = require('./server')
const { RealSource, SimulatedSource } = require('./sources')

process.on('unhandledRejection', (e) => console.error('[agent] unhandled rejection:', e))
const simulate = process.argv.includes('--simulate')
let win = null
let tray = null
let core = null
let server = null
let quitting = false

// Generated at runtime so the repo needs no binary assets: a 16x16 teal disc.
function trayIcon() {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 49
      const i = (y * size + x) * 4
      buf[i] = 166; buf[i + 1] = 148; buf[i + 2] = 13; buf[i + 3] = inside ? 255 : 0 // BGRA
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

function showWindow() {
  if (!win) return
  win.show()
  win.focus()
}

function createWindow(port) {
  win = new BrowserWindow({
    width: 400, height: 680, minWidth: 360, minHeight: 560, title: 'MyZenV2', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  win.loadURL(`http://127.0.0.1:${port}/ui`)
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); win.hide() }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
else {
  app.on('second-instance', showWindow)
  app.whenReady().then(async () => {
    const dir = dataDir(app)
    loadEnv(dir)
    const cfg = settings()
    const source = simulate ? new SimulatedSource({}) : new RealSource({ getIdleSeconds: () => powerMonitor.getSystemIdleTime() })
    core = createCore({ dir, settings: cfg, source })
    try {
      server = await listen(core)
    } catch (e) {
      console.error('[agent] cannot start local server:', e.message)
      app.quit()
      return
    }
    core.start()
    createWindow(cfg.port)

    tray = new Tray(trayIcon())
    tray.setToolTip('MyZen Agent')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open MyZen Agent', click: showWindow },
      { type: 'separator' },
      { label: 'Quit (stops tracking)', click: () => app.quit() },
    ]))
    tray.on('click', showWindow)
  })
  app.on('before-quit', (e) => {
    if (quitting) return
    quitting = true
    if (core) {
      e.preventDefault()
      core.stop().finally(() => { server?.close(); app.exit(0) })
    }
  })
  app.on('window-all-closed', () => {})
}
