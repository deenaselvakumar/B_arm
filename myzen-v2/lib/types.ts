export type Category = 'productive' | 'neutral' | 'unproductive'
export type Presence = 'online' | 'away' | 'offline'

export interface EmployeeRow {
  id: string
  email: string
  name: string
  department: string | null
  role: string | null
  is_manager: boolean
  status: Presence
  last_seen: string | null
}

export interface DailyStatRow {
  employee_id: string
  stat_date: string
  online_minutes: number
  active_minutes: number
  productive_minutes: number
  unproductive_minutes: number
  idle_minutes: number
  total_breaks_minutes: number
  productivity_percentage: number
  present: boolean
}

export interface PunchRow {
  id: string
  employee_id: string
  punch_type: 'in' | 'out'
  punch_time: string
}

export interface BreakRow {
  id: string
  employee_id: string
  break_start: string
  break_end: string | null
  duration_minutes: number | null
  break_type: string
}

export interface TimesheetEntryRow {
  id: string
  employee_id: string
  entry_date: string
  start_time: string | null
  end_time: string | null
  hours: number
  description: string | null
  entry_type: string
  approved: boolean
}

export interface SessionRow {
  id: string
  employee_id: string
  start_time: string
  end_time: string | null
  app_name: string | null
  url: string | null
  category: Category
  is_active: boolean
  duration_ms: number
}

export interface Snapshot {
  mode: 'demo' | 'supabase'
  warning?: string
  generatedAt: string
  now: string
  today: string
  presence: Record<string, Presence>
  config: { screenshotsEnabled: boolean; idleThresholdSeconds: number }
  employees: EmployeeRow[]
  dailyStats: DailyStatRow[]
  punches: PunchRow[]
  breaks: BreakRow[]
  timesheet: TimesheetEntryRow[]
  sessions: SessionRow[]
}
