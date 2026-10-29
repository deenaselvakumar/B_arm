const express = require('express')
const cors = require('cors')
const { machineIdSync } = require('node-machine-id')
const { isSupabaseEnabled } = require('./supabase')

class DataServer {
  constructor(monitor, screenshotManager) {
    this.monitor = monitor
    this.screenshotManager = screenshotManager
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
        version: '0.1.0',
        supabaseSync: isSupabaseEnabled()
      })
    })

    this.app.post('/api/login', async (req, res) => {
      const { email, password } = req.body
      
      if (!isSupabaseEnabled()) {
        const mockEmployees = [
          { id: 'emp1', email: 'chandru.p@barm.in', name: 'Chandru P', role: 'Senior Developer', department: 'Engineering' },
          { id: 'emp2', email: 'deena.s@barm.in', name: 'Deena Selvakumar', role: 'Full Stack Developer', department: 'Engineering' }
        ]
        
        const employee = mockEmployees.find(e => e.email.toLowerCase() === email.toLowerCase())
        
        if (employee) {
          this.monitor.employeeId = employee.id
          return res.json({ success: true, employee })
        } else {
          return res.json({ success: false, message: 'Invalid credentials' })
        }
      }

      try {
        const { getSupabase } = require('./supabase')
        const supabase = getSupabase()
        
        const { data: employee, error } = await supabase
          .from('employees')
          .select('id, email, name, role, department')
          .eq('email', email)
          .single()

        if (error || !employee) {
          return res.json({ success: false, message: 'Invalid credentials' })
        }

        this.monitor.employeeId = employee.id
        res.json({ success: true, employee })
      } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ success: false, message: 'Login failed' })
      }
    })

    this.app.post('/api/punch', async (req, res) => {
      const { employeeId, type } = req.body

      if (!employeeId || !['in', 'out'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid request' })
      }

      const punchTime = new Date().toISOString()

      if (!isSupabaseEnabled()) {
        console.log(`Punch ${type} recorded locally for employee ${employeeId}`)
        return res.json({ success: true, punchTime })
      }

      try {
        const { getSupabase } = require('./supabase')
        const supabase = getSupabase()
        
        const { error } = await supabase
          .from('attendance_punches')
          .insert({
            employee_id: employeeId,
            punch_type: type,
            punch_time: punchTime
          })

        if (error) throw error

        console.log(`Punch ${type} synced to Supabase for employee ${employeeId}`)
        res.json({ success: true, punchTime })
      } catch (error) {
        console.error('Punch error:', error)
        res.status(500).json({ success: false, message: 'Failed to record punch' })
      }
    })

    this.app.post('/api/break', async (req, res) => {
      const { employeeId, action } = req.body

      if (!employeeId || !['start', 'end'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid request' })
      }

      const breakTime = new Date().toISOString()

      if (!isSupabaseEnabled()) {
        console.log(`Break ${action} recorded locally for employee ${employeeId}`)
        return res.json({ success: true, breakTime })
      }

      try {
        const { getSupabase } = require('./supabase')
        const supabase = getSupabase()

        if (action === 'start') {
          const { data, error } = await supabase
            .from('breaks')
            .insert({
              employee_id: employeeId,
              break_start: breakTime,
              break_type: 'regular'
            })
            .select()
            .single()

          if (error) throw error

          console.log(`Break started and synced to Supabase for employee ${employeeId}`)
          res.json({ success: true, breakTime, breakId: data.id })
        } else {
          const { data: breaks, error: fetchError } = await supabase
            .from('breaks')
            .select('*')
            .eq('employee_id', employeeId)
            .is('break_end', null)
            .order('break_start', { ascending: false })
            .limit(1)

          if (fetchError) throw fetchError

          if (!breaks || breaks.length === 0) {
            return res.status(400).json({ success: false, message: 'No active break found' })
          }

          const activeBreak = breaks[0]
          const breakStart = new Date(activeBreak.break_start)
          const breakEnd = new Date()
          const durationMinutes = Math.floor((breakEnd - breakStart) / 1000 / 60)

          const { error: updateError } = await supabase
            .from('breaks')
            .update({
              break_end: breakTime,
              duration_minutes: durationMinutes
            })
            .eq('id', activeBreak.id)

          if (updateError) throw updateError

          console.log(`Break ended and synced to Supabase for employee ${employeeId}`)
          res.json({ success: true, breakTime, durationMinutes })
        }
      } catch (error) {
        console.error('Break error:', error)
        res.status(500).json({ success: false, message: 'Failed to record break' })
      }
    })

    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        machineId: machineIdSync(),
        timestamp: Date.now(),
        supabaseSync: isSupabaseEnabled(),
        screenshotsEnabled: this.screenshotManager?.isEnabled() || false
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
      const config = this.monitor.config
      const screenshotConfig = this.screenshotManager?.getScreenshotConfig() || {
        enabled: false,
        intervalMinutes: 10,
        blur: true
      }
      
      res.json({
        ...config,
        screenshots: screenshotConfig,
        supabaseEnabled: isSupabaseEnabled()
      })
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
