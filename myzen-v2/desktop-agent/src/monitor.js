const { randomUUID } = require('crypto')
const { categorize, toHost } = require('./rules')

const ROTATE_MS = 5 * 60 * 1000 // close/reopen long sessions so they sync to the portal while still in progress
const MIN_SESSION_MS = 1000

// Samples the foreground app + idle timer. It records only while the employee is punched in and not on a
// break, so nothing is observed off the clock.
class ActivityMonitor {
  constructor({ store, source, getRules, getIdleThreshold, now = () => Date.now() }) {
    this.store = store
    this.source = source
    this.getRules = getRules
    this.getIdleThreshold = getIdleThreshold
    this.now = now
    this.current = null
    this.timer = null
    this.busy = false
  }

  async tick() {
    if (this.busy) return
    this.busy = true
    try {
      if (!this.store.isTracking()) return this.closeCurrent()
      const idleFor = this.source.getIdleSeconds()
      const active = idleFor < this.getIdleThreshold()
      let app = 'Idle', host = null
      if (active) {
        const w = await this.source.getActiveWindow()
        app = w?.app || 'Unknown'
        host = toHost(w?.url)
      }
      const key = `${active}|${app}|${host ?? ''}`
      const t = this.now()
      if (this.current && this.current.key === key && t - this.current.startTime < ROTATE_MS) return
      this.closeCurrent(t)
      this.current = {
        key, id: randomUUID(), startTime: t, app, url: host, isActive: active,
        category: active ? categorize(this.getRules(), app, host) : 'neutral',
      }
    } finally {
      this.busy = false
    }
  }

  closeCurrent(at = this.now()) {
    const c = this.current
    this.current = null
    if (!c || at - c.startTime < MIN_SESSION_MS) return
    this.store.addSession({
      id: c.id, startTime: c.startTime, endTime: at, app: c.app, url: c.url,
      category: c.category, isActive: c.isActive, durationMs: at - c.startTime,
    })
  }

  start(intervalMs) {
    this.stop()
    this.timer = setInterval(() => this.tick().catch((e) => console.error('[agent] tick failed:', e)), intervalMs)
    this.tick().catch(() => {})
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.closeCurrent()
  }

  currentActivity() {
    const c = this.current
    if (!c) return null
    return { app: c.app, url: c.url, category: c.category, isActive: c.isActive, since: c.startTime }
  }

  // Today's activity logs (closed sessions plus the one in progress), newest first, with summaries for the UI.
  getLogs(day = this.store.dayOf(this.now())) {
    const rows = this.store.data.sessions
      .filter((s) => this.store.dayOf(s.startTime) === day)
      .map((s) => ({ id: s.id, start: s.startTime, end: s.endTime, app: s.app, host: s.url, category: s.category, active: s.isActive, ms: s.durationMs, live: false }))
    const c = this.current
    if (c && this.store.dayOf(c.startTime) === day) {
      rows.push({ id: c.id, start: c.startTime, end: null, app: c.app, host: c.url, category: c.category, active: c.isActive, ms: this.now() - c.startTime, live: true })
    }
    rows.sort((a, b) => b.start - a.start)
    const byCategory = { productive: 0, neutral: 0, unproductive: 0, idle: 0 }
    const apps = new Map()
    for (const r of rows) {
      byCategory[r.active ? r.category : 'idle'] += r.ms
      if (r.active) apps.set(r.app, (apps.get(r.app) || 0) + r.ms)
    }
    const topApps = [...apps].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([app, ms]) => ({ app, ms }))
    return { day, count: rows.length, byCategory, topApps, logs: rows }
  }

  // Minutes for one day. productivity = productive time / online (tracked) time, as the product spec defines it.
  getStats(day = this.store.dayOf(this.now())) {
    const rows = this.store.data.sessions
      .filter((s) => this.store.dayOf(s.startTime) === day)
      .map((s) => ({ ms: s.durationMs, active: s.isActive, cat: s.category }))
    const c = this.current
    if (c && this.store.dayOf(c.startTime) === day) rows.push({ ms: this.now() - c.startTime, active: c.isActive, cat: c.category })
    const min = (f) => rows.filter(f).reduce((a, r) => a + r.ms, 0) / 60000
    const online = min(() => true)
    const active = min((r) => r.active)
    const productive = min((r) => r.active && r.cat === 'productive')
    const unproductive = min((r) => r.active && r.cat === 'unproductive')
    const breaks = this.store.data.breaks
      .filter((b) => this.store.dayOf(b.start) === day)
      .reduce((a, b) => a + (b.minutes ?? Math.max(0, ((b.end ?? this.now()) - b.start) / 60000)), 0)
    const r = Math.round
    return {
      date: day, online: r(online), active: r(active), productive: r(productive), unproductive: r(unproductive),
      idle: r(online - active), breaks: r(breaks), pct: online > 0 ? +((productive / online) * 100).toFixed(2) : 0,
    }
  }
}

module.exports = { ActivityMonitor }
