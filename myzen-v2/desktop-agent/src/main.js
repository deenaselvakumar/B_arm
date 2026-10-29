const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const ActivityMonitor = require('./monitor')
const DataServer = require('./server')
const ScreenshotManager = require('./screenshots')
const { initSupabase, isSupabaseEnabled } = require('./supabase')

let tray = null
let mainWindow = null
let monitor = null
let server = null
let screenshotManager = null

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'MyZen Agent v0.1', 
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: `Status: Running${isSupabaseEnabled() ? ' (Synced)' : ' (Local)'}`, 
      enabled: false 
    },
    { 
      label: 'Open Dashboard', 
      click: () => showDashboard() 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('MyZen Agent - Monitoring')
  tray.setContextMenu(contextMenu)
}

function showDashboard() {
  if (mainWindow) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'MyZen Agent Dashboard'
  })

  mainWindow.loadFile('src/dashboard.html')

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createTray()
  
  initSupabase()
  
  monitor = new ActivityMonitor()
  monitor.start()
  
  screenshotManager = new ScreenshotManager()
  if (screenshotManager.isEnabled()) {
    screenshotManager.startAutoCapture(
      process.env.EMPLOYEE_ID,
      () => monitor.currentSession
    )
  } else {
    console.log('Screenshots DISABLED (privacy-first default)')
  }
  
  server = new DataServer(monitor, screenshotManager)
  server.start()

  console.log('MyZen Agent started successfully')
  console.log('API Server running on http://localhost:3001')
  if (isSupabaseEnabled()) {
    console.log('Supabase sync: ENABLED')
  } else {
    console.log('Supabase sync: DISABLED (local storage only)')
  }
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('before-quit', () => {
  if (monitor) {
    monitor.stop()
  }
  if (screenshotManager) {
    screenshotManager.stopAutoCapture()
  }
  if (server) {
    server.stop()
  }
})
