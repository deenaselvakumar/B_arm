import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import demo from './demoData.json'
import type { Snapshot, EmployeeRow, Presence } from './types'
import type { Manager } from './auth.server'

const ONLINE_WINDOW_MS = 3 * 60 * 1000
const HISTORY_DAYS = 62
const SESSION_DAYS = 7
const ROW_CAP = 30000

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// supabase-js builds a Realtime client at construction, which throws on Node < 22 when no native WebSocket
// exists. The portal never uses Realtime, so give it an inert transport that is never instantiated.
class NoRealtimeTransport {}

export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: NoRealtimeTransport as never },
    // Next.js caches server-side fetch() by default, which would freeze the dashboard on the first result.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

const istDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const daysBefore = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// PostgREST caps responses at 1000 rows, so page through larger tables.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; from < ROW_CAP; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

function presenceFor(employees: EmployeeRow[], live: boolean): Record<string, Presence> {
  const now = Date.now()
  return Object.fromEntries(
    employees.map((e) => {
      if (!live) return [e.id, e.status]
      const fresh = e.last_seen && now - Date.parse(e.last_seen) < ONLINE_WINDOW_MS
      return [e.id, fresh ? e.status : 'offline']
    }),
  )
}

const demoEmployees = () => (demo as unknown as { employees: EmployeeRow[] }).employees

// Demo mode accepts any credentials; the typed email picks which demo manager you are (default: manager@barm.in).
export function demoManagerFor(email: string): Manager {
  const mgrs = demoEmployees().filter((e) => e.is_manager)
  const m = mgrs.find((e) => e.email.toLowerCase() === email.trim().toLowerCase()) ?? mgrs.find((e) => e.email === 'manager@barm.in') ?? mgrs[0]
  return { id: m.id, email: m.email, name: m.name }
}

function demoSnapshot(manager: Manager, warning?: string): Snapshot {
  const d = demo as unknown as Omit<Snapshot, 'mode' | 'generatedAt' | 'now' | 'today' | 'presence' | 'config' | 'manager'>
  const mine = new Set(d.employees.filter((e) => e.manager_id === manager.id).map((e) => e.id))
  const own = <T extends { employee_id: string }>(rows: T[]) => rows.filter((r) => mine.has(r.employee_id))
  const today = d.dailyStats.reduce((m, r) => (r.stat_date > m ? r.stat_date : m), '0000-00-00')
  const sessionFrom = daysBefore(today, SESSION_DAYS)
  const employees = d.employees.filter((e) => mine.has(e.id)).map((e) => ({ ...e, last_seen: e.status === 'offline' ? null : new Date().toISOString() }))
  return {
    mode: 'demo',
    manager,
    warning,
    generatedAt: new Date().toISOString(),
    // Demo clock is frozen at the CSV export time (29-10-2026 1pm IST) so the partial "today" row makes sense.
    now: `${today}T13:00:00+05:30`,
    today,
    presence: presenceFor(employees, false),
    config: { screenshotsEnabled: false, idleThresholdSeconds: 120 },
    employees,
    dailyStats: own(d.dailyStats),
    punches: own(d.punches),
    breaks: own(d.breaks),
    timesheet: own(d.timesheet),
    sessions: own(d.sessions).filter((s) => istDate(new Date(s.start_time)) >= sessionFrom),
  }
}

// A manager's snapshot contains ONLY employees whose manager_id is theirs, and only those employees' rows.
export async function getSnapshot(manager: Manager): Promise<Snapshot> {
  if (!supabaseConfigured()) return demoSnapshot(manager)
  try {
    const sb = serviceClient()
    const today = istDate(new Date())
    const since = daysBefore(today, HISTORY_DAYS)
    const sinceTs = `${since}T00:00:00+05:30`
    const sessionTs = `${daysBefore(today, SESSION_DAYS)}T00:00:00+05:30`

    const employees = await fetchAll<EmployeeRow>((a, b) =>
      sb.from('employees').select('id,email,name,department,role,is_manager,manager_id,status,last_seen').eq('manager_id', manager.id).order('name').range(a, b))
    const ids = employees.map((e) => e.id)
    const none = <T,>() => Promise.resolve([] as T[])
    const [dailyStats, punches, breaks, timesheet, sessions, cfg] = await Promise.all([
      ids.length ? fetchAll<Snapshot['dailyStats'][number]>((a, b) => sb.from('daily_stats').select('*').in('employee_id', ids).gte('stat_date', since).order('stat_date').range(a, b)) : none<Snapshot['dailyStats'][number]>(),
      ids.length ? fetchAll<Snapshot['punches'][number]>((a, b) => sb.from('attendance_punches').select('id,employee_id,punch_type,punch_time').in('employee_id', ids).gte('punch_time', sinceTs).order('punch_time').range(a, b)) : none<Snapshot['punches'][number]>(),
      ids.length ? fetchAll<Snapshot['breaks'][number]>((a, b) => sb.from('breaks').select('*').in('employee_id', ids).gte('break_start', sinceTs).order('break_start').range(a, b)) : none<Snapshot['breaks'][number]>(),
      ids.length ? fetchAll<Snapshot['timesheet'][number]>((a, b) => sb.from('timesheet_entries').select('*').in('employee_id', ids).gte('entry_date', since).order('entry_date').range(a, b)) : none<Snapshot['timesheet'][number]>(),
      ids.length ? fetchAll<Snapshot['sessions'][number]>((a, b) => sb.from('activity_sessions').select('id,employee_id,start_time,end_time,app_name,url,category,is_active,duration_ms').in('employee_id', ids).gte('start_time', sessionTs).order('start_time').range(a, b)) : none<Snapshot['sessions'][number]>(),
      sb.from('system_config').select('config_key,config_value'),
    ])
    const c = Object.fromEntries((cfg.data ?? []).map((r: { config_key: string; config_value: string }) => [r.config_key, r.config_value]))
    return {
      mode: 'supabase',
      manager,
      generatedAt: new Date().toISOString(),
      now: new Date().toISOString(),
      today,
      presence: presenceFor(employees, true),
      config: { screenshotsEnabled: c.screenshots_enabled === 'true', idleThresholdSeconds: Number(c.idle_threshold_seconds ?? 120) },
      employees,
      dailyStats: dailyStats.map((r) => ({ ...r, productivity_percentage: Number(r.productivity_percentage) })),
      punches,
      breaks,
      timesheet: timesheet.map((r) => ({ ...r, hours: Number(r.hours) })),
      sessions,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return demoSnapshot(manager, `Supabase is configured but could not be read (${msg}). Showing demo data instead. Have you run supabase/schema.sql?`)
  }
}
