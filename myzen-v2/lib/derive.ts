import type { Category, EmployeeRow, Snapshot } from './types'

const IST = 'Asia/Kolkata'

export const istDay = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST })
export const istTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true })
export const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`
export const fmtHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}h ${String(Math.round(m % 60)).padStart(2, '0')}m`
export const pct = (n: number) => `${n.toFixed(1)}%`

export const staff = (s: Snapshot): EmployeeRow[] => s.employees.filter((e) => !e.is_manager)
export const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('')
export const monthLabel = (today: string) =>
  new Date(`${today.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function monthDates(today: string) {
  const [y, m] = today.split('-').map(Number)
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: n }, (_, i) => `${today.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`)
}
export const isSunday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0

export function monthTotals(s: Snapshot, empId: string) {
  const month = s.today.slice(0, 7)
  const rows = s.dailyStats.filter((r) => r.employee_id === empId && r.stat_date.startsWith(month) && r.present)
  const sum = (k: 'online_minutes' | 'active_minutes' | 'productive_minutes' | 'unproductive_minutes' | 'idle_minutes' | 'total_breaks_minutes') =>
    rows.reduce((a, r) => a + r[k], 0)
  const online = sum('online_minutes')
  return {
    days: rows.length,
    online,
    active: sum('active_minutes'),
    productive: sum('productive_minutes'),
    unproductive: sum('unproductive_minutes'),
    idle: sum('idle_minutes'),
    breaks: sum('total_breaks_minutes'),
    productivity: online ? (sum('productive_minutes') / online) * 100 : 0,
  }
}

export interface DayRow {
  date: string
  firstIn: string | null
  lastOut: string | null
  workedMin: number
  breakMin: number
  open: boolean
  missingOut: boolean
  manual: Snapshot['timesheet']
  manualHours: number
}

export function buildTimesheet(s: Snapshot, empId: string): DayRow[] {
  const nowMs = Date.parse(s.now)
  const days = new Map<string, DayRow>()
  const row = (date: string): DayRow => {
    if (!days.has(date)) days.set(date, { date, firstIn: null, lastOut: null, workedMin: 0, breakMin: 0, open: false, missingOut: false, manual: [], manualHours: 0 })
    return days.get(date)!
  }
  const byDay = new Map<string, Snapshot['punches']>()
  for (const p of s.punches.filter((p) => p.employee_id === empId).sort((a, b) => a.punch_time.localeCompare(b.punch_time))) {
    const d = istDay(p.punch_time)
    byDay.set(d, [...(byDay.get(d) ?? []), p])
  }
  for (const [date, list] of byDay) {
    const r = row(date)
    let inAt: number | null = null
    let worked = 0
    for (const p of list) {
      const t = Date.parse(p.punch_time)
      if (p.punch_type === 'in') {
        if (inAt === null) { inAt = t; r.firstIn ??= p.punch_time }
      } else if (inAt !== null) {
        worked += t - inAt
        inAt = null
        r.lastOut = p.punch_time
      }
    }
    if (inAt !== null) {
      if (date === istDay(s.now)) { worked += nowMs - inAt; r.open = true } else r.missingOut = true
    }
    r.workedMin = Math.round(worked / 60000)
  }
  for (const b of s.breaks.filter((b) => b.employee_id === empId)) {
    const r = row(istDay(b.break_start))
    const end = b.break_end ? Date.parse(b.break_end) : nowMs
    r.breakMin += b.duration_minutes ?? Math.max(0, Math.round((end - Date.parse(b.break_start)) / 60000))
  }
  for (const t of s.timesheet.filter((t) => t.employee_id === empId)) {
    const r = row(t.entry_date)
    r.manual.push(t)
    r.manualHours += t.hours
  }
  for (const r of days.values()) r.workedMin = Math.max(0, r.workedMin - r.breakMin)
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function appUsage(s: Snapshot, empId: string | null, minDay?: string) {
  const map = new Map<string, { app: string; url: string | null; category: Category; minutes: number }>()
  for (const x of s.sessions) {
    if (!x.is_active || !x.app_name) continue
    if (empId && x.employee_id !== empId) continue
    if (minDay && istDay(x.start_time) < minDay) continue
    const key = `${x.app_name}|${x.url ?? ''}|${x.category}`
    const cur = map.get(key) ?? { app: x.app_name, url: x.url, category: x.category, minutes: 0 }
    cur.minutes += x.duration_ms / 60000
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes)
}

export function liveState(s: Snapshot, empId: string) {
  const today = s.today
  const punches = s.punches.filter((p) => p.employee_id === empId && istDay(p.punch_time) === today).sort((a, b) => a.punch_time.localeCompare(b.punch_time))
  const last = punches[punches.length - 1]
  const onBreak = s.breaks.some((b) => b.employee_id === empId && !b.break_end && istDay(b.break_start) === today)
  const lastSession = s.sessions.filter((x) => x.employee_id === empId).sort((a, b) => b.start_time.localeCompare(a.start_time))[0]
  return {
    punchedIn: last?.punch_type === 'in',
    punchedInToday: punches.length > 0,
    since: last?.punch_type === 'in' ? last.punch_time : null,
    onBreak,
    lastSession,
  }
}

export function productivityTrend(s: Snapshot, maxDays = 14) {
  const byDate = new Map<string, { p: number; o: number }>()
  const ids = new Set(staff(s).map((e) => e.id))
  for (const r of s.dailyStats) {
    if (!ids.has(r.employee_id) || !r.present || r.online_minutes <= 0) continue
    const cur = byDate.get(r.stat_date) ?? { p: 0, o: 0 }
    cur.p += r.productive_minutes
    cur.o += r.online_minutes
    byDate.set(r.stat_date, cur)
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-maxDays)
    .map(([date, v]) => ({ date, label: date.slice(8), productivity: +((v.p / v.o) * 100).toFixed(1) }))
}
