const express = require('express')
const cors = require('cors')
const { machineIdSync } = require('node-machine-id')

class DataServer {
  constructor(monitor) {
    this.monitor = monitor
    this.app = express()
    this.port = 3001
    this.server = null
    
    this.app.use(cors())
    this.app.use(express.json())
    
    this.setupRoutes()
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.json({ 
        status: 'running',
        service: 'MyZen Agent API',
        version: '0.1.0'
      })
    })

    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        machineId: machineIdSync(),
        timestamp: Date.now()
      })
    })

    this.app.get('/api/stats', (req, res) => {
      const stats = this.monitor.getStats()
      res.json(stats)
    })

    this.app.get('/api/current', (req, res) => {
      const activity = this.monitor.getCurrentActivity()
      res.json(activity || { status: 'idle' })
    })

    this.app.get('/api/sessions', (req, res) => {
      const stats = this.monitor.getStats()
      res.json(stats.sessions)
    })

    this.app.get('/api/config', (req, res) => {
      res.json(this.monitor.config)
    })

    this.app.post('/api/config', (req, res) => {
      this.monitor.config = { ...this.monitor.config, ...req.body }
      this.monitor.saveConfig()
      res.json({ success: true, config: this.monitor.config })
    })
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`Data server running on http://localhost:${this.port}`)
    })
  }

  stop() {
    if (this.server) {
      this.server.close()
      console.log('Data server stopped')
    }
  }
}

module.exports = DataServer
