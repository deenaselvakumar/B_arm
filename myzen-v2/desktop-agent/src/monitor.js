const activeWin = require('active-win')
const fs = require('fs')
const path = require('path')
const { machineIdSync } = require('node-machine-id')

class ActivityMonitor {
  constructor() {
    this.sessions = []
    this.currentSession = null
    this.isActive = false
    this.lastActivity = Date.now()
    this.checkInterval = null
    this.machineId = machineIdSync()
    this.dataPath = path.join(__dirname, '../data/sessions.json')
    this.configPath = path.join(__dirname, '../data/config.json')
    
    this.loadConfig()
    this.loadSessions()
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
      } else {
        this.config = {
          productiveApps: [
            'Visual Studio Code',
            'IntelliJ IDEA',
            'PyCharm',
            'Sublime Text',
            'Atom',
            'Eclipse',
            'NetBeans',
            'WebStorm',
            'Xcode',
            'Android Studio',
            'Figma',
            'Adobe XD',
            'Sketch',
            'Photoshop',
            'Illustrator',
            'Terminal',
            'iTerm',
            'Git',
            'Docker',
            'Postman'
          ],
          productiveDomains: [
            'github.com',
            'gitlab.com',
            'stackoverflow.com',
            'docs.microsoft.com',
            'developer.mozilla.org',
            'npmjs.com',
            'pypi.org',
            'aws.amazon.com',
            'console.cloud.google.com',
            'figma.com',
            'dribbble.com',
            'behance.net'
          ],
          unproductiveDomains: [
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'reddit.com',
            'youtube.com',
            'netflix.com',
            'twitch.tv',
            'tiktok.com'
          ],
          neutralApps: [
            'Slack',
            'Teams',
            'Discord',
            'Zoom',
            'Skype',
            'Mail',
            'Outlook',
            'Calendar'
          ],
          idleThresholdSeconds: 300
        }
        this.saveConfig()
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  saveConfig() {
    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  loadSessions() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8')
        this.sessions = JSON.parse(data)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      this.sessions = []
    }
  }

  saveSessions() {
    try {
      const dir = path.dirname(this.dataPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.sessions, null, 2))
    } catch (error) {
      console.error('Error saving sessions:', error)
    }
  }

  categorizeActivity(appName, url) {
    if (this.config.productiveApps.some(app => 
      appName.toLowerCase().includes(app.toLowerCase())
    )) {
      return 'productive'
    }

    if (url) {
      if (this.config.productiveDomains.some(domain => url.includes(domain))) {
        return 'productive'
      }
      if (this.config.unproductiveDomains.some(domain => url.includes(domain))) {
        return 'unproductive'
      }
    }

    if (this.config.neutralApps.some(app => 
      appName.toLowerCase().includes(app.toLowerCase())
    )) {
      return 'neutral'
    }

    return 'neutral'
  }

  async checkActivity() {
    try {
      const window = await activeWin()
      
      if (!window) {
        this.handleIdle()
        return
      }

      const now = Date.now()
      const appName = window.owner.name
      let url = null

      if (appName.toLowerCase().includes('chrome') || 
          appName.toLowerCase().includes('firefox') ||
          appName.toLowerCase().includes('safari') ||
          appName.toLowerCase().includes('edge')) {
        url = window.url || null
      }

      const category = this.categorizeActivity(appName, url)

      if (!this.currentSession || 
          this.currentSession.appName !== appName || 
          this.currentSession.url !== url) {
        
        if (this.currentSession) {
          this.currentSession.endTime = now
          this.currentSession.duration = now - this.currentSession.startTime
          this.sessions.push(this.currentSession)
          this.saveSessions()
        }

        this.currentSession = {
          startTime: now,
          endTime: null,
          appName: appName,
          url: url,
          category: category,
          isActive: true,
          duration: 0
        }
      }

      this.lastActivity = now
      this.isActive = true
    } catch (error) {
      console.error('Error checking activity:', error)
    }
  }

  handleIdle() {
    if (this.currentSession && this.isActive) {
      const now = Date.now()
      const idleTime = now - this.lastActivity

      if (idleTime > this.config.idleThresholdSeconds * 1000) {
        this.currentSession.endTime = now
        this.currentSession.duration = now - this.currentSession.startTime
        this.currentSession.isActive = false
        this.sessions.push(this.currentSession)
        this.saveSessions()
        this.currentSession = null
        this.isActive = false
      }
    }
  }

  start() {
    console.log('Activity monitoring started')
    this.checkInterval = setInterval(() => this.checkActivity(), 5000)
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    if (this.currentSession) {
      this.currentSession.endTime = Date.now()
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime
      this.sessions.push(this.currentSession)
      this.saveSessions()
    }
    console.log('Activity monitoring stopped')
  }

  getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const todaySessions = this.sessions.filter(s => s.startTime >= todayTimestamp)

    let totalOnline = 0
    let totalActive = 0
    let totalProductive = 0

    todaySessions.forEach(session => {
      totalOnline += session.duration
      if (session.isActive) {
        totalActive += session.duration
        if (session.category === 'productive') {
          totalProductive += session.duration
        }
      }
    })

    const productivity = totalOnline > 0 ? (totalProductive / totalOnline) * 100 : 0

    return {
      onlineTime: Math.floor(totalOnline / 1000 / 60),
      activeTime: Math.floor(totalActive / 1000 / 60),
      productiveTime: Math.floor(totalProductive / 1000 / 60),
      productivity: productivity.toFixed(2),
      sessions: todaySessions
    }
  }

  getCurrentActivity() {
    if (this.currentSession) {
      return {
        appName: this.currentSession.appName,
        url: this.currentSession.url,
        category: this.currentSession.category,
        isActive: this.isActive,
        duration: Math.floor((Date.now() - this.currentSession.startTime) / 1000 / 60)
      }
    }
    return null
  }
}

module.exports = ActivityMonitor
