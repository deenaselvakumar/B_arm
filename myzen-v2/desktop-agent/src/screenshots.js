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

  // In Supabase mode the org's settings are authoritative (a PC's env can only narrow them); in demo mode
  // the PC's own SCREENSHOT_TEAMS list is the only allowlist.
  policy() {
    const s = this.settings.screenshots
    if (!s.enabled) return { enabled: false, reason: 'ENABLE_SCREENSHOTS is not "true" (default: off)' }
    const emp = this.getEmployee()
    if (!emp) return { enabled: false, reason: 'not logged in' }
    const allows = (teams) => teams.includes('*') || teams.includes(emp.department)
    const server = this.getServerConfig()
    if (server) {
      if (server.screenshots_enabled !== 'true') return { enabled: false, reason: 'disabled by org policy (system_config.screenshots_enabled)' }
      let teams = []
      try { teams = JSON.parse(server.screenshot_teams || '[]') } catch {}
      if (!allows(teams)) return { enabled: false, reason: `team "${emp.department}" is not allowed by org policy (system_config.screenshot_teams)` }
    }
    if (s.teams.length || !server) {
      if (!allows(s.teams)) return { enabled: false, reason: s.teams.length ? `team "${emp.department}" is not on this PC's SCREENSHOT_TEAMS list` : 'no team allowlist (set SCREENSHOT_TEAMS)' }
    }
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

  uploadStatus() {
    const rows = this.store.data.screenshots
    return {
      configured: !!this.settings.portalUrl,
      uploaded: rows.filter((r) => r.uploaded).length,
      waiting: rows.filter((r) => !r.uploaded && !r.uploadFailed).length,
      failed: rows.filter((r) => r.uploadFailed).length,
    }
  }

  // Sends queued images (a few per call) to the portal's upload API, which re-checks the org policy and stores
  // them in a private Supabase Storage bucket. Success removes the local copy. Network/5xx errors retry later.
  async uploadPending(token, { limit = 3 } = {}) {
    if (!this.settings.portalUrl || !token) return { skipped: true }
    const rows = this.store.data.screenshots.filter((r) => !r.uploaded && !r.uploadFailed).slice(0, limit)
    let sent = 0
    for (const r of rows) {
      const file = path.join(this.dir, r.file)
      if (!fs.existsSync(file)) { r.uploadFailed = 'local file missing'; continue }
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 30000)
      try {
        const res = await fetch(`${this.settings.portalUrl}/api/agent/screenshot`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'X-Shot-Id': r.id,
            'X-Captured-At': new Date(r.time).toISOString(),
            'X-App': encodeURIComponent(r.app || ''),
          },
          body: fs.readFileSync(file),
          signal: ctrl.signal,
        })
        if (res.ok) { r.uploaded = true; fs.unlinkSync(file); sent++ }
        else if (res.status === 401) { this.lastError = 'Upload refused: session expired'; break }
        else if ([400, 403, 409, 413, 415, 429].includes(res.status)) { r.uploadFailed = `portal answered HTTP ${res.status}` }
        else { this.lastError = `Upload failed (HTTP ${res.status}), will retry`; break }
      } catch (e) {
        this.lastError = `Upload offline: ${e.name === 'AbortError' ? 'timed out' : e.message}`
        break
      } finally {
        clearTimeout(timer)
      }
    }
    this.store.save()
    return { sent }
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
      upload: this.uploadStatus(),
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
