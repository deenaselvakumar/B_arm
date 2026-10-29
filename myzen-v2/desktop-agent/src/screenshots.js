const screenshot = require('screenshot-desktop')
const fs = require('fs')
const path = require('path')

class ScreenshotManager {
  constructor() {
    this.enabled = process.env.ENABLE_SCREENSHOTS === 'true'
    this.intervalMinutes = parseInt(process.env.SCREENSHOT_INTERVAL_MINUTES) || 10
    this.blur = process.env.BLUR_SCREENSHOTS !== 'false'
    this.screenshotDir = path.join(__dirname, '../screenshots')
    this.captureInterval = null
    
    if (this.enabled) {
      this.ensureScreenshotDir()
    }
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true })
    }
  }

  isEnabled() {
    return this.enabled
  }

  async captureScreenshot(employeeId, sessionId, appName) {
    if (!this.enabled) {
      return null
    }

    try {
      const timestamp = Date.now()
      const filename = `screenshot_${employeeId}_${timestamp}.png`
      const filepath = path.join(this.screenshotDir, filename)

      const img = await screenshot()
      fs.writeFileSync(filepath, img)

      console.log(`Screenshot captured: ${filename}`)

      return {
        filepath,
        filename,
        employeeId,
        sessionId,
        appName,
        capturedAt: new Date().toISOString(),
        isBlur: this.blur
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error)
      return null
    }
  }

  startAutoCapture(employeeId, getCurrentSession) {
    if (!this.enabled) {
      console.log('Screenshots are DISABLED (privacy-first default)')
      return
    }

    console.log(`Screenshot auto-capture ENABLED (interval: ${this.intervalMinutes} minutes)`)
    console.log('WARNING: Screenshots contain sensitive information - ensure compliance with privacy policies')

    this.captureInterval = setInterval(async () => {
      const session = getCurrentSession()
      if (session && session.isActive) {
        await this.captureScreenshot(employeeId, session.id, session.appName)
      }
    }, this.intervalMinutes * 60 * 1000)
  }

  stopAutoCapture() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval)
      this.captureInterval = null
      console.log('Screenshot auto-capture stopped')
    }
  }

  getScreenshotConfig() {
    return {
      enabled: this.enabled,
      intervalMinutes: this.intervalMinutes,
      blur: this.blur,
      directory: this.screenshotDir
    }
  }

  cleanupOldScreenshots(daysToKeep = 7) {
    if (!this.enabled) return

    try {
      const files = fs.readdirSync(this.screenshotDir)
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)

      files.forEach(file => {
        const filepath = path.join(this.screenshotDir, file)
        const stats = fs.statSync(filepath)
        
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filepath)
          console.log(`Deleted old screenshot: ${file}`)
        }
      })
    } catch (error) {
      console.error('Error cleaning up screenshots:', error)
    }
  }
}

module.exports = ScreenshotManager
