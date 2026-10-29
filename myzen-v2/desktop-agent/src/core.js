const { Store, RuleError } = require('./store')
const { ActivityMonitor } = require('./monitor')
const { Cloud } = require('./cloud')
const { ScreenshotManager } = require('./screenshots')
const { DEMO_ACCOUNTS } = require('./demoAccounts')

const iso = (ms) => (ms ? new Date(ms).toISOString() : null)

function createCore({ dir, settings, source, now = () => Date.now() }) {
  const store = new Store(dir, { timezone: settings.timezone, now })
  const cloud = new Cloud({ url: settings.supabaseUrl, key: settings.supabaseAnonKey })
  const live = () => cloud.enabled
  const lastSync = { at: null, error: null }

  const monitor = new ActivityMonitor({
    store, source, now,
    getRules: () => store.session?.rules ?? [],
    getIdleThreshold: () => (live() && Number(store.session?.config?.idle_threshold_seconds)) || settings.idleThresholdSeconds,
  })
  const screenshots = new ScreenshotManager({
    dir, settings, now, store,
    capturer: source.captureScreen ? () => source.captureScreen() : undefined,
    getApp: () => monitor.currentActivity()?.app ?? null,
    getEmployee: () => store.employee,
    getServerConfig: () => (live() ? store.session?.config ?? null : null),
    isTracking: () => store.isTracking(),
  })

  const pendingTotal = () => store.pendingCount() + (settings.portalUrl && live() ? screenshots.uploadStatus().waiting : 0)

  let syncing = null
  let syncSoonTimer = null
  let currentStatus = null

  const statusNow = () => {
    const s = store.state()
    return s.punchedIn ? (s.onBreak ? 'away' : 'online') : 'offline'
  }

  async function syncNow(statusOverride) {
    if (!live() || !store.session?.token || store.session.expired) return { skipped: true }
    if (syncing) return syncing
    syncing = (async () => {
      try {
        const p = store.pending()
        const batch = { ...p, sessions: p.sessions.slice(0, 500), screenshots: p.screenshots.slice(0, 100) }
        const payload = {
          status: statusOverride || statusNow(),
          machine: settings.machine,
        version: require('../package.json').version,
          punches: batch.punches.map((x) => ({ id: x.id, type: x.type, time: iso(x.time) })),
          breaks: batch.breaks.map((x) => ({ id: x.id, start: iso(x.start), end: iso(x.end), minutes: x.minutes, type: x.type })),
          timesheet: batch.timesheet.map((x) => ({ id: x.id, date: x.date, start: x.start, end: x.end, hours: x.hours, description: x.description })),
          sessions: batch.sessions.map((x) => ({
            id: x.id, start: iso(x.startTime), end: iso(x.endTime), app: x.app, url: x.url,
            category: x.category, active: x.isActive, duration_ms: Math.round(x.durationMs),
          })),
          screenshots: batch.screenshots.map((x) => ({ id: x.id, time: iso(x.time), app: x.app, file: x.file })),
          stats: store.employee ? monitor.getStats() : undefined,
        }
        const { error } = await cloud.sync(store.session.token, payload)
        if (error) {
          lastSync.error = error.code === 'network' ? 'Offline: will retry' : `Sync failed: ${error.message}`
          if (error.code === 'unauthorized') { store.session.expired = true; store.save(); lastSync.error = 'Session expired: please log in again' }
          return { error }
        }
        store.markSynced(batch)
        await screenshots.uploadPending(store.session.token).catch(() => {})
        currentStatus = payload.status
        lastSync.at = now()
        lastSync.error = null
        return { ok: true }
      } finally {
        syncing = null
      }
    })()
    return syncing
  }

  const syncSoon = () => {
    clearTimeout(syncSoonTimer)
    syncSoonTimer = setTimeout(() => syncNow().catch(() => {}), 400)
  }

  store.on('change', () => {
    if (!store.isTracking()) monitor.closeCurrent()
    if (store.employee) syncSoon()
  })

  const publicEmployee = () => store.employee

  const api = {
    store, monitor, cloud, screenshots, settings,

    async login(email, password) {
      email = String(email || '').trim()
      if (!email || !password) throw new RuleError('Enter your email and password.', 400)
      if (live()) {
        const { data, error } = await cloud.login(email, password, settings.machine)
        if (error) {
          if (error.code === 'network') throw new RuleError('Cannot reach Supabase. Check your internet connection.', 503)
          if (error.code === 'too_many_attempts') throw new RuleError('Too many failed attempts. Try again in 10 minutes.', 429)
          if (error.code === 'invalid_credentials') throw new RuleError('Invalid email or password.', 401)
          throw new RuleError(`Login failed: ${error.message}`, 502)
        }
        store.login({ token: data.token, employee: data.employee, rules: data.rules, config: data.config, expired: false })
        const h = await cloud.history(data.token, 30)
        if (!h.error) store.mergeRemote(h.data)
        syncSoon()
      } else {
        const acct = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
        if (!acct) throw new RuleError(`Demo mode (Supabase not configured). Use one of: ${DEMO_ACCOUNTS.slice(0, 2).map((a) => a.email).join(', ')}`, 401)
        store.login({ token: null, employee: acct, rules: [], config: {}, expired: false })
      }
      return publicEmployee()
    },

    async logout({ force = false } = {}) {
      monitor.closeCurrent()
      if (live() && store.session?.token && !store.session.expired) {
        await syncNow('offline')
        const pending = pendingTotal()
        if (pending > 0 && !force) {
          const e = new RuleError(`${pending} item(s) have not synced yet. Connect to the internet and try again, or log out anyway and lose them.`, 409)
          e.pending = pending
          throw e
        }
        await cloud.logout(store.session.token)
      }
      store.logout()
    },

    punch: (type) => store.punch(type),
    startBreak: () => store.startBreak(),
    endBreak: () => store.endBreak(),
    logTime: (body) => store.logTime(body),
    history: (days) => store.history(days),
    syncNow,
    logs: (day) => { if (!store.employee) throw new RuleError('Please log in first.', 401); return monitor.getLogs(day) },

    state() {
      const s = store.state()
      return {
        mode: live() ? 'supabase' : 'demo',
        machine: settings.machine,
        idleThresholdSeconds: monitor.getIdleThreshold(),
        employee: store.employee,
        ...s,
        tracking: store.isTracking(),
        stats: store.employee ? monitor.getStats() : null,
        totals: store.employee ? store.dayTotals() : { workedMs: 0, breakMs: 0 },
        logCount: store.employee ? monitor.getLogs().count : 0,
        current: store.isTracking() ? monitor.currentActivity() : null,
        pending: pendingTotal(),
        sync: { ...lastSync, expired: !!store.session?.expired },
        screenshots: screenshots.summary(),
        serverTime: now(),
      }
    },

    start() {
      monitor.start(settings.checkIntervalSeconds * 1000)
      screenshots.start()
      api._syncTimer = setInterval(() => syncNow().catch(() => {}), settings.syncIntervalSeconds * 1000)
      if (live() && store.session?.token) {
        cloud.history(store.session.token, 30).then((h) => { if (!h.error) store.mergeRemote(h.data) }).catch(() => {})
      }
    },

    async stop() {
      clearInterval(api._syncTimer)
      screenshots.stop()
      monitor.stop()
      await Promise.race([syncNow('offline'), new Promise((r) => setTimeout(r, 4000))])
    },
  }
  return api
}

module.exports = { createCore }
