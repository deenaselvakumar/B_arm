const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const ActivityMonitor = require('./monitor')
const DataServer = require('./server')

let tray = null
let mainWindow = null
let monitor = null
let server = null

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
      label: 'Status: Running', 
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
  
  monitor = new ActivityMonitor()
  monitor.start()
  
  server = new DataServer(monitor)
  server.start()

  console.log('MyZen Agent started successfully')
  console.log('API Server running on http://localhost:3001')
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('before-quit', () => {
  if (monitor) {
    monitor.stop()
  }
  if (server) {
    server.stop()
  }
})
