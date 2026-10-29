const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { EventEmitter } = require('events')

class RuleError extends Error {
  constructor(message, code = 409) {
    super(message)
    this.code = code
  }
}

const EMPTY = () => ({ session: null, punches: [], breaks: [], timesheet: [], sessions: [] })
const RETAIN_MS = 14 * 86400000

// Local source of truth for attendance + activity. Every row carries `synced`; the cloud loop pushes the
// unsynced ones, so a PC that is offline loses nothing.
class Store extends EventEmitter {
  constructor(dir, { timezone = 'Asia/Kolkata', now = () => Date.now() } = {}) {
    super()
    this.file = path.join(dir, 'state.json')
    this.tz = timezone
    this.now = now
    this.data = EMPTY()
    try {
      this.data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }
    } catch {}
    const cutoff = this.now() - RETAIN_MS
    this.data.sessions = this.data.sessions.filter((s) => !s.synced || s.startTime >= cutoff)
  }

  save() {
    const tmp = this.file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(this.data))
    fs.renameSync(tmp, this.file)
  }

  dayOf(ts) {
    return new Date(ts).toLocaleDateString('en-CA', { timeZone: this.tz })
  }

  get employee() {
    return this.data.session?.employee ?? null
  }
  get session() {
    return this.data.session
  }

  login(session) {
    if (this.data.session && this.data.session.employee.id !== session.employee.id) this.data = EMPTY()
    this.data.session = session
    this.save()
    this.emit('change')
  }

  logout() {
    this.data = EMPTY()
    this.save()
    this.emit('change')
  }

  state() {
    const last = this.data.punches[this.data.punches.length - 1]
    const openBreak = this.data.breaks.find((b) => !b.end)
    const punchedIn = last?.type === 'in'
    return {
      punchedIn,
      since: punchedIn ? last.time : null,
      onBreak: punchedIn && !!openBreak,
      breakSince: openBreak?.start ?? null,
      // Still punched in from an earlier day: probably forgot to punch out.
      stale: punchedIn && this.dayOf(last.time) !== this.dayOf(this.now()),
    }
  }

  isTracking() {
    const s = this.state()
    return !!this.employee && s.punchedIn && !s.onBreak
  }

  _need() {
    if (!this.employee) throw new RuleError('Please log in first.', 401)
    return this.state()
  }

  punch(type) {
    const s = this._need()
    if (type === 'in' && s.punchedIn) throw new RuleError('You are already punched in.')
    if (type === 'out' && !s.punchedIn) throw new RuleError('You are not punched in.')
    if (type !== 'in' && type !== 'out') throw new RuleError('Invalid punch type.', 400)
    if (type === 'out' && s.onBreak) this._endBreak()
    const row = { id: randomUUID(), type, time: this.now(), synced: false }
    this.data.punches.push(row)
    this.save()
    this.emit('change')
    return row
  }

  startBreak() {
    const s = this._need()
    if (!s.punchedIn) throw new RuleError('Punch in before starting a break.')
    if (s.onBreak) throw new RuleError('A break is already in progress.')
    const row = { id: randomUUID(), start: this.now(), end: null, minutes: null, type: 'regular', synced: false }
    this.data.breaks.push(row)
    this.save()
    this.emit('change')
    return row
  }

  _endBreak() {
    const b = this.data.breaks.find((x) => !x.end)
    b.end = this.now()
    b.minutes = Math.max(0, Math.round((b.end - b.start) / 60000))
    b.synced = false
    return b
  }

  endBreak() {
    const s = this._need()
    if (!s.onBreak) throw new RuleError('No break in progress.')
    const b = this._endBreak()
    this.save()
    this.emit('change')
    return b
  }

  // Manual entry for time worked away from the computer or a missed punch. `hours` or start+end is required.
  logTime({ date, start, end, hours, description }) {
    this._need()
    const today = this.dayOf(this.now())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new RuleError('Choose a valid date.', 400)
    if (date > today) throw new RuleError('You cannot log time for a future date.', 400)
    const t = (v) => (v ? (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null) : '')
    const s = t(start), e = t(end)
    if (s === null || e === null) throw new RuleError('Times must look like 14:30.', 400)
    let h = Number(hours)
    if (s && e) {
      const [sh, sm] = s.split(':').map(Number), [eh, em] = e.split(':').map(Number)
      const diff = (eh * 60 + em - (sh * 60 + sm)) / 60
      if (diff <= 0) throw new RuleError('End time must be after start time.', 400)
      h = Math.round(diff * 100) / 100
    }
    if (!(h > 0) || h > 24) throw new RuleError('Enter hours between 0 and 24, or a start and end time.', 400)
    const text = String(description || '').trim().slice(0, 500)
    if (!text) throw new RuleError('Add a short description.', 400)
    const row = { id: randomUUID(), date, start: s || null, end: e || null, hours: h, description: text, approved: false, synced: false }
    this.data.timesheet.push(row)
    this.save()
    this.emit('change')
    return row
  }

  addSession(row) {
    this.data.sessions.push({ ...row, synced: false })
    this.save()
  }

  pending() {
    const u = (a) => a.filter((x) => !x.synced)
    return { punches: u(this.data.punches), breaks: u(this.data.breaks), timesheet: u(this.data.timesheet), sessions: u(this.data.sessions) }
  }
  pendingCount() {
    const p = this.pending()
    return p.punches.length + p.breaks.length + p.timesheet.length + p.sessions.length
  }
  markSynced(p) {
    for (const k of ['punches', 'breaks', 'timesheet', 'sessions']) {
      const ids = new Set(p[k].map((x) => x.id))
      for (const row of this.data[k]) if (ids.has(row.id)) row.synced = true
    }
    this.save()
  }

  // Merge the server's copy (used at login so a reinstall or second PC still knows today's state).
  mergeRemote(h) {
    const ts = (v) => (v ? Date.parse(v) : null)
    const have = (k) => new Set(this.data[k].map((x) => x.id))
    let ids = have('punches')
    for (const p of h.punches ?? []) if (!ids.has(p.id)) this.data.punches.push({ id: p.id, type: p.type, time: ts(p.time), synced: true })
    this.data.punches.sort((a, b) => a.time - b.time)
    ids = have('breaks')
    for (const b of h.breaks ?? []) if (!ids.has(b.id)) this.data.breaks.push({ id: b.id, start: ts(b.start), end: ts(b.end), minutes: b.minutes, type: b.type, synced: true })
    ids = have('timesheet')
    for (const t of h.timesheet ?? [])
      if (!ids.has(t.id)) this.data.timesheet.push({ id: t.id, date: t.date, start: t.start?.slice(0, 5) ?? null, end: t.end?.slice(0, 5) ?? null, hours: Number(t.hours), description: t.description, approved: !!t.approved, synced: true })
    this.save()
    this.emit('change')
  }

  // Per-day attendance summary shown in the app's timesheet history.
  history(days = 14) {
    const nowMs = this.now()
    const map = new Map()
    const row = (d) => {
      if (!map.has(d)) map.set(d, { date: d, firstIn: null, lastOut: null, workedMin: 0, breakMin: 0, manual: [], open: false })
      return map.get(d)
    }
    let inAt = null, inDay = null
    for (const p of this.data.punches) {
      const d = this.dayOf(p.time)
      const r = row(d)
      if (p.type === 'in' && inAt === null) { inAt = p.time; inDay = d; r.firstIn ??= p.time }
      else if (p.type === 'out' && inAt !== null) {
        row(inDay).workedMin += Math.round((p.time - inAt) / 60000)
        row(inDay).lastOut = p.time
        inAt = null
      }
    }
    if (inAt !== null) { const r = row(inDay); r.open = true; r.workedMin += Math.round((nowMs - inAt) / 60000) }
    for (const b of this.data.breaks) {
      const m = b.minutes ?? Math.round(((b.end ?? nowMs) - b.start) / 60000)
      row(this.dayOf(b.start)).breakMin += m
    }
    for (const t of this.data.timesheet) row(t.date).manual.push(t)
    const cutoff = this.dayOf(nowMs - days * 86400000)
    return [...map.values()]
      .filter((r) => r.date >= cutoff)
      .map((r) => ({ ...r, workedMin: Math.max(0, r.workedMin - r.breakMin) }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
}

module.exports = { Store, RuleError }
