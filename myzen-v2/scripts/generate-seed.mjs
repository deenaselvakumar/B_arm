// Generates supabase/seed.sql and lib/demoData.json from the two October 2026 CSV exports.
//   node scripts/generate-seed.mjs
// Chandru P and Deena Selvakumar come straight from the CSVs (attendance per day, monthly totals).
// The other teammates are fictional and generated with a fixed seed so output is reproducible.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const YEAR = 2026
const MONTH = 10
const TODAY = 29 // CSV exports were generated on 29-10-2026 at 1pm IST; that day is partial
const DAYS = 31

const uid = (key) => {
  const h = createHash('sha1').update(`myzenv2:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
let seed = 20261029
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (a, b) => a + rnd() * (b - a)
const pad = (n) => String(n).padStart(2, '0')
const dateStr = (d) => `${YEAR}-${pad(MONTH)}-${pad(d)}`
const dow = (d) => new Date(Date.UTC(YEAR, MONTH - 1, d)).getUTCDay()
const ist = (d, minutesFromMidnight) =>
  new Date(Date.parse(`${dateStr(d)}T00:00:00+05:30`) + minutesFromMidnight * 60000)

// ---------------------------------------------------------------- CSV parsing
const readCsv = (f) => readFileSync(join(root, 'supabase/data', f), 'utf8').split(/\r?\n/).filter(Boolean)
const hms = (s) => { const m = s.match(/(\d+)h:(\d+)m:(\d+)s/); return +m[1] * 60 + +m[2] + +m[3] / 60 }
const hm = (s) => { const m = s.match(/(\d+)h\s*(\d+)m/); return m ? +m[1] * 60 + +m[2] : 0 }

const summary = {}
{
  const lines = readCsv('summary_oct2026.csv')
  const start = lines.findIndex((l) => l.startsWith('Employee,'))
  for (const l of lines.slice(start + 1)) {
    const [name, present, online, active, productive, pct] = l.split(',')
    summary[name.trim().toUpperCase()] = {
      present: +present, online: hms(online), active: hms(active), productive: hms(productive), pct: parseFloat(pct),
    }
  }
}
const csvAttendance = {}
{
  const lines = readCsv('attendance_oct2026.csv')
  const start = lines.findIndex((l) => l.startsWith('Employee,'))
  for (const l of lines.slice(start + 1)) {
    const cells = l.split(',')
    const name = cells[0].trim().toUpperCase()
    const days = {}
    for (let d = 1; d <= DAYS; d++) {
      const c = (cells[d] ?? '').trim()
      if (/^\d+h/.test(c)) days[d] = { type: 'present', minutes: hm(c) }
      else if (c === 'A') days[d] = { type: 'absent' }
      else if (/weekly/i.test(c)) days[d] = { type: 'off' }
    }
    csvAttendance[name] = days
  }
}

// ---------------------------------------------------------------------- team
const team = [
  { key: 'chandru', name: 'Chandru P', email: 'chandru.p@barm.in', department: 'Engineering', role: 'Senior Developer', csv: 'CHANDRU P', status: 'online',
    apps: [['Visual Studio Code', 0.62], ['Terminal', 0.18], ['Postman', 0.2]], sites: ['github.com', 'stackoverflow.com'] },
  { key: 'deena', name: 'Deena Selvakumar', email: 'deena.s@barm.in', department: 'Engineering', role: 'Full Stack Developer', csv: 'DEENA SELVAKUMAR', status: 'online',
    apps: [['IntelliJ IDEA', 0.6], ['Terminal', 0.15], ['Postman', 0.25]], sites: ['github.com', 'supabase.com'] },
  { key: 'arun', name: 'Arun Kumar', email: 'arun.k@barm.in', department: 'AI/ML', role: 'ML Engineer', status: 'away', target: 82, avgH: 8.4,
    apps: [['PyCharm', 0.55], ['Jupyter Notebook', 0.35], ['Terminal', 0.1]], sites: ['arxiv.org', 'github.com'] },
  { key: 'priya', name: 'Priya Sharma', email: 'priya.s@barm.in', department: 'Design', role: 'UI/UX Designer', status: 'online', target: 85, avgH: 8.2,
    apps: [['Figma', 0.8], ['Adobe Illustrator', 0.2]], sites: ['dribbble.com', 'figma.com'] },
  { key: 'vikram', name: 'Vikram Singh', email: 'vikram.s@barm.in', department: 'Product', role: 'Product Manager', status: 'offline', target: 74, avgH: 8.0,
    apps: [['Notion', 0.5], ['Excel', 0.3], ['Figma', 0.2]], sites: ['linear.app', 'docs.google.com'] },
  { key: 'meera', name: 'Meera Nair', email: 'meera.n@barm.in', department: 'AI/ML', role: 'Data Analyst', status: 'online', target: 79, avgH: 8.6,
    apps: [['Excel', 0.4], ['Jupyter Notebook', 0.4], ['Power BI', 0.2]], sites: ['kaggle.com', 'github.com'] },
  { key: 'manager', name: 'B-Arm Manager', email: 'manager@barm.in', department: 'Management', role: 'Engineering Manager', status: 'offline', isManager: true },
]
const neutralApps = ['Slack', 'Microsoft Teams', 'Outlook']
const badSites = ['youtube.com', 'instagram.com', 'reddit.com']

const employees = team.map((t) => ({
  id: uid(t.key), email: t.email, name: t.name, department: t.department, role: t.role,
  is_manager: !!t.isManager, status: t.status, last_seen: null,
}))
const punches = [], breaks = [], timesheet = [], dailyStats = [], sessions = []

for (const t of team.filter((x) => !x.isManager)) {
  const id = uid(t.key)
  // 1) attendance minutes per day
  const att = {}
  if (t.csv) {
    for (const [d, v] of Object.entries(csvAttendance[t.csv])) att[+d] = v
  } else {
    for (let d = 1; d <= TODAY; d++) {
      if (dow(d) === 0) att[d] = { type: 'off' }
      else if (d < TODAY && rnd() < 0.07) att[d] = { type: 'absent' }
      else att[d] = { type: 'present', minutes: d === TODAY ? Math.round(between(150, 230)) : Math.round(between(t.avgH - 1.2, t.avgH + 1.4) * 60) }
    }
  }
  const presentDays = Object.entries(att).filter(([, v]) => v.type === 'present').map(([d, v]) => ({ d: +d, minutes: v.minutes }))

  // 2) targets for the month
  const attTotal = presentDays.reduce((s, x) => s + x.minutes, 0)
  let target
  if (t.csv) {
    const s = summary[t.csv]
    target = { online: s.online, active: s.active, productive: s.productive }
  } else {
    const online = attTotal * 0.92
    target = { online, active: online * between(0.9, 0.95), productive: online * (t.target / 100) }
  }
  const k = target.online / attTotal
  const activeRatio = target.active / target.online
  const prodRatio = target.productive / target.online

  // 3) per-day stats with jitter, then rescaled so monthly totals match the targets
  const rows = presentDays.map((p) => {
    const online = p.minutes * k
    const ar = Math.min(0.99, activeRatio * between(0.96, 1.03))
    const pr = Math.min(ar - 0.02, prodRatio * between(0.9, 1.1))
    return { ...p, online, active: online * ar, productive: online * pr }
  })
  const sum = (key) => rows.reduce((s, r) => s + r[key], 0)
  const so = target.online / sum('online'), sa = target.active / sum('active'), sp = target.productive / sum('productive')
  for (const r of rows) {
    r.online = Math.round(r.online * so)
    r.active = Math.min(r.online, Math.round(r.active * sa))
    r.productive = Math.min(r.active, Math.round(r.productive * sp))
  }

  for (const r of rows) {
    const d = r.d
    const lunch = Math.round(between(30, 45))
    const inMin = Math.round(between(9 * 60 + 5, 10 * 60 + 5))
    const partialToday = d === TODAY
    const outMin = inMin + r.minutes + (partialToday ? 0 : lunch)

    punches.push({ id: uid(`${t.key}:in:${d}`), employee_id: id, punch_type: 'in', punch_time: ist(d, inMin).toISOString(), notes: null })
    const stillIn = partialToday && t.status !== 'offline'
    if (!stillIn) punches.push({ id: uid(`${t.key}:out:${d}`), employee_id: id, punch_type: 'out', punch_time: ist(d, outMin).toISOString(), notes: null })

    let breakMinutes = 0
    if (!partialToday) {
      breakMinutes = lunch
      breaks.push({ id: uid(`${t.key}:brk:${d}`), employee_id: id, break_start: ist(d, inMin + Math.round(r.minutes / 2)).toISOString(),
        break_end: ist(d, inMin + Math.round(r.minutes / 2) + lunch).toISOString(), duration_minutes: lunch, break_type: 'lunch' })
    } else if (t.status === 'away') {
      breaks.push({ id: uid(`${t.key}:brk:${d}`), employee_id: id, break_start: ist(d, 12 * 60 + 50).toISOString(), break_end: null, duration_minutes: null, break_type: 'regular' })
    }

    const idle = r.online - r.active
    const unproductive = rnd() < 0.55 ? Math.min(r.active - r.productive, Math.round(between(4, 25))) : 0
    const neutral = r.active - r.productive - unproductive
    dailyStats.push({
      id: uid(`${t.key}:ds:${d}`), employee_id: id, stat_date: dateStr(d), online_minutes: r.online, active_minutes: r.active,
      productive_minutes: r.productive, unproductive_minutes: unproductive, idle_minutes: idle, total_breaks_minutes: breakMinutes,
      productivity_percentage: +((r.productive / r.online) * 100).toFixed(2), present: true,
    })

    // 4) sessions laid out sequentially from punch-in, split around the lunch break
    const parts = []
    for (const [app, w] of t.apps) parts.push({ app, url: null, cat: 'productive', active: true, m: r.productive * w * 0.8 })
    t.sites.forEach((site, i) => parts.push({ app: 'Google Chrome', url: site, cat: 'productive', active: true, m: r.productive * 0.2 / t.sites.length }))
    parts.push({ app: neutralApps[Math.floor(rnd() * neutralApps.length)], url: null, cat: 'neutral', active: true, m: neutral })
    if (unproductive > 0) parts.push({ app: 'Google Chrome', url: badSites[Math.floor(rnd() * badSites.length)], cat: 'unproductive', active: true, m: unproductive })
    if (idle > 0) parts.push({ app: 'Idle', url: null, cat: 'neutral', active: false, m: idle })
    let cursor = inMin, used = 0
    const half = r.online / 2
    let breakDone = partialToday
    for (const p of parts) {
      const m = Math.round(p.m)
      if (m <= 0) continue
      if (!breakDone && used >= half) { cursor += lunch; breakDone = true }
      sessions.push({
        id: uid(`${t.key}:s:${d}:${sessions.length}`), employee_id: id, start_time: ist(d, cursor).toISOString(),
        end_time: ist(d, cursor + m).toISOString(), app_name: p.app, url: p.url, category: p.cat, is_active: p.active, duration_ms: m * 60000,
      })
      cursor += m; used += m
    }
  }
}

// manual time entries (made from the desktop "Log time" form)
const manual = [
  ['deena', 6, '15:00', '16:30', 1.5, 'Client discovery call (off-computer)', true],
  ['chandru', 12, '17:00', '18:00', 1, 'Production support handover', true],
  ['arun', 15, '10:00', '11:30', 1.5, 'Whiteboard session with product team', true],
  ['priya', 27, '16:00', '17:00', 1, 'User interview recording review', false],
]
for (const [key, d, s, e, h, desc, ok] of manual)
  timesheet.push({ id: uid(`${key}:ts:${d}`), employee_id: uid(key), entry_date: dateStr(d), start_time: s, end_time: e, hours: h, description: desc, entry_type: 'manual', approved: ok })

// ----------------------------------------------------------------- outputs
writeFileSync(join(root, 'lib/demoData.json'), JSON.stringify({ employees, dailyStats, punches, breaks, timesheet, sessions }))

const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const insert = (table, rows, conflict = 'on conflict (id) do nothing') => {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const chunks = []
  for (let i = 0; i < rows.length; i += 200)
    chunks.push(`insert into ${table} (${cols.join(', ')}) values\n${rows.slice(i, i + 200).map((r) => `  (${cols.map((c) => q(r[c])).join(', ')})`).join(',\n')}\n${conflict};\n`)
  return `-- ${table} (${rows.length} rows)\n${chunks.join('\n')}\n`
}
const sql = [
  '-- MyZenV2 demo seed (generated by scripts/generate-seed.mjs - do not edit by hand).',
  '-- Run supabase/schema.sql first. Safe to re-run (inserts use ON CONFLICT DO NOTHING).',
  '-- Chandru P / Deena Selvakumar: attendance + monthly totals from the Oct 2026 CSV exports.',
  '-- Other employees are fictional. Emails are placeholders.',
  '',
  insert('employees', employees.map(({ last_seen, ...r }) => r), 'on conflict (email) do nothing'),
  insert('attendance_punches', punches),
  insert('breaks', breaks),
  insert('timesheet_entries', timesheet),
  insert('daily_stats', dailyStats, 'on conflict (employee_id, stat_date) do nothing'),
  insert('activity_sessions', sessions),
  '-- DEMO PASSWORDS. Everyone gets "myzen123" so the desktop app and manager login work out of the box.',
  '-- DELETE THIS BLOCK or change the passwords (select set_employee_password(email, ...)) before exposing the portal publicly.',
  ...employees.map((e) => `select set_employee_password('${e.email}', 'myzen123');`),
  '',
].join('\n')
writeFileSync(join(root, 'supabase/seed.sql'), sql)

// --------------------------------------------------------------- self-check
for (const t of team.filter((x) => x.csv)) {
  const id = uid(t.key), s = summary[t.csv]
  const ds = dailyStats.filter((r) => r.employee_id === id)
  const tot = (k) => ds.reduce((a, r) => a + r[k], 0)
  console.log(`${t.name}: present ${ds.length} (csv ${s.present}) online ${(tot('online_minutes') / 60).toFixed(1)}h (csv ${(s.online / 60).toFixed(1)}h) ` +
    `productive ${(tot('productive_minutes') / 60).toFixed(1)}h (csv ${(s.productive / 60).toFixed(1)}h) productivity ${((tot('productive_minutes') / tot('online_minutes')) * 100).toFixed(2)}% (csv ${s.pct}%)`)
}
console.log(`rows: employees ${employees.length}, punches ${punches.length}, breaks ${breaks.length}, daily_stats ${dailyStats.length}, sessions ${sessions.length}, timesheet ${timesheet.length}`)
