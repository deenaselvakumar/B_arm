const fs = require('fs')
const path = require('path')

// Screenshots are OFF by default and gated three independent ways. ALL must pass before anything is captured:
//   1. This PC's env:      ENABLE_SCREENSHOTS=true
//   2. The org's switch:   system_config.screenshots_enabled = 'true' (Supabase mode only)
//   3. The team allowlist: employee's department is in SCREENSHOT_TEAMS (env) or system_config.screenshot_teams
// Not implemented yet (do before enabling for real): blur/redaction, upload to a private Storage bucket,
// employee-visible notice and consent record. Captures are kept on the local disk only.
class ScreenshotManager {
  constructor({ dir, settings, getEmployee, getServerConfig, isTracking, now = () => Date.now() }) {
    this.dir = path.join(dir, 'screenshots')
    this.settings = settings
    this.getEmployee = getEmployee
    this.getServerConfig = getServerConfig
    this.isTracking = isTracking
    this.now = now
    this.timer = null
    this.last = 0
  }

  policy() {
    const s = this.settings.screenshots
    if (!s.enabled) return { enabled: false, reason: 'ENABLE_SCREENSHOTS is not "true" (default: off)' }
    const emp = this.getEmployee()
    if (!emp) return { enabled: false, reason: 'not logged in' }
    const server = this.getServerConfig()
    if (server && server.screenshots_enabled !== 'true') return { enabled: false, reason: 'disabled by org policy (system_config.screenshots_enabled)' }
    let teams = s.teams
    if (!teams.length && server?.screenshot_teams) {
      try { teams = JSON.parse(server.screenshot_teams) } catch {}
    }
    if (!(teams.includes('*') || teams.includes(emp.department))) return { enabled: false, reason: `team "${emp.department}" is not on the screenshot allowlist` }
    return { enabled: true, reason: 'enabled for this team' }
  }

  start() {
    const p = this.policy()
    console.log(`[screenshots] ${p.enabled ? 'ENABLED' : 'off'} (${p.reason})`)
    this.timer = setInterval(() => this.maybeCapture().catch((e) => console.error('[screenshots]', e.message)), 30000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async maybeCapture() {
    if (!this.policy().enabled || !this.isTracking()) return null
    if (this.now() - this.last < this.settings.screenshots.intervalMinutes * 60000) return null
    this.last = this.now()
    return this.capture()
  }

  async capture() {
    const shot = require('screenshot-desktop') // optional dependency: only loaded once policy allows it
    fs.mkdirSync(this.dir, { recursive: true })
    const file = path.join(this.dir, `${this.getEmployee().id}_${this.now()}.png`)
    fs.writeFileSync(file, await shot({ format: 'png' }))
    this.prune()
    console.log('[screenshots] captured locally; upload pipeline is a stub, nothing was sent:', path.basename(file))
    return file
  }

  prune(days = 7) {
    const cutoff = this.now() - days * 86400000
    for (const f of fs.existsSync(this.dir) ? fs.readdirSync(this.dir) : []) {
      const p = path.join(this.dir, f)
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p)
    }
  }
}

module.exports = { ScreenshotManager }
