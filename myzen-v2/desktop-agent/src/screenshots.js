const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

// Screenshots are OFF by default and gated three independent ways. ALL must pass before anything is captured:
//   1. This PC's env:      ENABLE_SCREENSHOTS=true
//   2. The org's switch:   system_config.screenshots_enabled = 'true' (Supabase mode only)
//   3. The team allowlist: employee's department is in SCREENSHOT_TEAMS (env) or system_config.screenshot_teams
// When enabled: one capture per interval while punched in and NOT on break. The image stays on this PC;
// only metadata (time, foreground app, file name) is queued for Supabase `screenshots`.
// Not implemented yet (do before enabling for real): blur/redaction, upload to a private Storage bucket,
// employee-visible notice and consent record.
const CHECK_MS = 30000
const KEEP_DAYS = 7

class ScreenshotManager {
  constructor({ dir, settings, store, getEmployee, getServerConfig, isTracking, getApp, capturer, now = () => Date.now() }) {
    this.dir = path.join(dir, 'screenshots')
    this.settings = settings
    this.store = store
    this.getEmployee = getEmployee
    this.getServerConfig = getServerConfig
    this.isTracking = isTracking
    this.getApp = getApp || (() => null)
    this.capturer = capturer
    this.now = now
    this.timer = null
    this.last = 0
    this.lastError = null
  }

  intervalMinutes() {
    const own = this.settings.screenshots.intervalMinutes
    const server = Number(this.getServerConfig()?.screenshot_interval_minutes)
    return Math.max(1, own || server || 10)
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
    this.stop()
    this.timer = setInterval(() => this.maybeCapture().catch((e) => { this.lastError = e.message; console.error('[screenshots]', e.message) }), CHECK_MS)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  count(day) {
    return this.store.data.screenshots.filter((s) => this.store.dayOf(s.time) === day).length
  }

  summary(day = this.store.dayOf(this.now())) {
    const rows = this.store.data.screenshots
    return {
      ...this.policy(),
      intervalMinutes: this.intervalMinutes(),
      todayCount: this.count(day),
      lastAt: rows.length ? rows[rows.length - 1].time : null,
      error: this.lastError,
    }
  }

  async maybeCapture() {
    if (!this.policy().enabled || !this.isTracking()) return null
    if (this.now() - this.last < this.intervalMinutes() * 60000) return null
    this.last = this.now()
    return this.capture()
  }

  async capture() {
    const png = this.capturer ? await this.capturer() : await require('screenshot-desktop')({ format: 'png' }) // optional dependency, loaded only once policy allows
    fs.mkdirSync(this.dir, { recursive: true })
    const id = randomUUID()
    const time = this.now()
    const file = `${time}_${id.slice(0, 8)}.png`
    fs.writeFileSync(path.join(this.dir, file), png)
    this.lastError = null
    this.store.addScreenshot({ id, time, file, app: this.getApp() })
    this.store.emit('change')
    this.prune()
    return file
  }

  prune() {
    const cutoff = this.now() - KEEP_DAYS * 86400000
    for (const f of fs.existsSync(this.dir) ? fs.readdirSync(this.dir) : []) {
      const p = path.join(this.dir, f)
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p)
    }
  }
}

module.exports = { ScreenshotManager }
