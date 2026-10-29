'use client'

import { useState } from 'react'
import { Mail, Briefcase, Calendar, TrendingUp, Clock, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import ScreenshotGallery from '@/components/ScreenshotGallery'
import { Loading, useSnapshot } from '@/components/SnapshotProvider'
import { appUsage, buildTimesheet, fmtHM, fmtMin, initials, isSunday, istTime, liveState, monthDates, monthLabel, monthTotals, pct, staff } from '@/lib/derive'

const TABS = ['Overview', 'Attendance', 'Timesheet', 'Productivity', 'Apps & URLs', 'Performance Summary', 'Screenshots', 'Settings'] as const
type Tab = (typeof TABS)[number]
const TONE: Record<string, { box: string; label: string; value: string }> = {
  blue: { box: 'bg-blue-50', label: 'text-blue-700', value: 'text-blue-900' },
  green: { box: 'bg-green-50', label: 'text-green-700', value: 'text-green-900' },
  purple: { box: 'bg-purple-50', label: 'text-purple-700', value: 'text-purple-900' },
  orange: { box: 'bg-orange-50', label: 'text-orange-700', value: 'text-orange-900' },
}
const badge = (c: string) => (c === 'productive' ? 'bg-green-100 text-green-700' : c === 'unproductive' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')

export default function UserDetailPage() {
  const { snap } = useSnapshot()
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Overview')
  if (!snap) return <Loading />

  const people = staff(snap)
  const emp = people.find((p) => p.id === selected) ?? people[0]
  if (!emp) return <p className="text-gray-600">No employees yet.</p>

  const totals = monthTotals(snap, emp.id)
  const timesheet = buildTimesheet(snap, emp.id)
  const byDate = new Map(timesheet.map((d) => [d.date, d]))
  const dates = monthDates(snap.today)
  const live = liveState(snap, emp.id)
  const apps = appUsage(snap, emp.id)
  const daily = snap.dailyStats.filter((r) => r.employee_id === emp.id && r.stat_date.startsWith(snap.today.slice(0, 7)))
  const presence = snap.presence[emp.id]
  const avgHours = totals.days ? totals.online / totals.days : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Detail</h1>
        <p className="text-gray-600 mt-1">{monthLabel(snap.today)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {people.map((p) => {
          const m = monthTotals(snap, p.id)
          return (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`text-left p-3 rounded-xl border-2 bg-white transition-colors ${emp.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${snap.presence[p.id] === 'offline' ? 'bg-gray-400' : 'bg-green-500'}`}>{initials(p.name)}</div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{pct(m.productivity)} · {m.days}d</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white">{initials(emp.name)}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{emp.name}</h2>
            <p className="text-gray-600">{emp.role}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{emp.email}</span>
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{emp.department}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${presence === 'online' ? 'bg-green-100 text-green-800' : presence === 'away' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{presence}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <nav className="flex gap-4 px-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>

        <div className="p-6">
          {tab === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { l: 'Present days', v: String(totals.days), i: Calendar, c: 'blue' },
                  { l: 'Productivity', v: pct(totals.productivity), i: TrendingUp, c: 'green' },
                  { l: 'Online time', v: fmtMin(totals.online), i: Clock, c: 'purple' },
                  { l: 'Active time', v: fmtMin(totals.active), i: Activity, c: 'orange' },
                ].map((x) => (
                  <div key={x.l} className={`${TONE[x.c].box} rounded-lg p-4`}>
                    <div className={`flex items-center gap-2 mb-2 ${TONE[x.c].label} text-sm font-medium`}><x.i className="w-5 h-5" />{x.l}</div>
                    <p className={`text-2xl font-bold ${TONE[x.c].value}`}>{x.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right now</h3>
                <p className="text-gray-700">
                  {live.onBreak ? 'On break' : live.punchedIn ? `Punched in since ${istTime(live.since!)}` : live.punchedInToday ? 'Punched out for today' : 'Not punched in today'}
                  {live.lastSession && ` · last app: ${live.lastSession.app_name ?? 'Idle'}${live.lastSession.url ? ` (${live.lastSession.url})` : ''}`}
                </p>
              </div>
            </div>
          )}

          {tab === 'Attendance' && (
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="text-center text-sm font-semibold text-gray-700 py-1">{d}</div>)}
              {Array.from({ length: new Date(`${dates[0]}T00:00:00Z`).getUTCDay() }, (_, i) => <div key={`pad${i}`} />)}
              {dates.map((d) => {
                const r = byDate.get(d)
                const future = d > snap.today
                const present = !!r?.firstIn
                const cls = future ? 'bg-gray-50 text-gray-300' : present ? 'bg-green-100 text-green-900' : isSunday(d) ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-900'
                return (
                  <div key={d} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${cls}`}>
                    <span className="font-semibold">{Number(d.slice(8))}</span>
                    <span className="text-[11px]">{future ? '' : present ? fmtHM(r!.workedMin) : isSunday(d) ? 'Off' : 'A'}</span>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'Timesheet' && (
            <div className="overflow-x-auto">
              <p className="text-sm text-gray-500 mb-3">Punches and breaks come from the desktop app. Manual entries are time the employee logged by hand.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left font-semibold text-gray-700">
                    <th className="py-2 px-3">Date</th><th className="py-2 px-3">Punch in</th><th className="py-2 px-3">Punch out</th>
                    <th className="py-2 px-3">Breaks</th><th className="py-2 px-3">Worked</th><th className="py-2 px-3">Manual entries</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheet.map((d) => (
                    <tr key={d.date} className="border-b border-gray-100 align-top">
                      <td className="py-2 px-3 font-medium text-gray-900">{d.date}</td>
                      <td className="py-2 px-3">{d.firstIn ? istTime(d.firstIn) : '-'}</td>
                      <td className="py-2 px-3">{d.lastOut ? istTime(d.lastOut) : d.open ? <span className="text-green-700">in progress</span> : d.missingOut ? <span className="text-red-600">missing</span> : '-'}</td>
                      <td className="py-2 px-3">{d.breakMin ? `${d.breakMin}m` : '-'}</td>
                      <td className="py-2 px-3">{d.firstIn ? fmtMin(d.workedMin) : '-'}</td>
                      <td className="py-2 px-3">
                        {d.manual.length === 0 ? '-' : d.manual.map((m) => (
                          <div key={m.id}>{m.hours}h · {m.description} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${m.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.approved ? 'approved' : 'pending'}</span></div>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {timesheet.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">No attendance recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Productivity' && (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={daily.map((r) => ({ day: r.stat_date.slice(8), Productive: r.productive_minutes, Unproductive: r.unproductive_minutes, Idle: r.idle_minutes }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v: number) => fmtMin(v)} />
                  <Bar dataKey="Productive" stackId="a" fill="#10b981" /><Bar dataKey="Unproductive" stackId="a" fill="#ef4444" /><Bar dataKey="Idle" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left font-semibold text-gray-700"><th className="py-2 px-3">Date</th><th className="px-3">Online</th><th className="px-3">Active</th><th className="px-3">Productive</th><th className="px-3">Productivity</th></tr></thead>
                <tbody>
                  {[...daily].reverse().map((r) => (
                    <tr key={r.stat_date} className="border-b border-gray-100">
                      <td className="py-2 px-3">{r.stat_date}</td><td className="px-3">{fmtMin(r.online_minutes)}</td><td className="px-3">{fmtMin(r.active_minutes)}</td>
                      <td className="px-3">{fmtMin(r.productive_minutes)}</td><td className="px-3 font-medium">{Number(r.productivity_percentage).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Apps & URLs' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Active time over the last 7 days.</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left font-semibold text-gray-700"><th className="py-2 px-3">App</th><th className="px-3">URL</th><th className="px-3">Category</th><th className="px-3">Time</th></tr></thead>
                <tbody>
                  {apps.map((a, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">{a.app}</td><td className="px-3 text-gray-600">{a.url ?? '-'}</td>
                      <td className="px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${badge(a.category)}`}>{a.category}</span></td><td className="px-3">{fmtMin(a.minutes)}</td>
                    </tr>
                  ))}
                  {apps.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-500">No activity synced yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Performance Summary' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Present days', String(totals.days)], ['Productivity', pct(totals.productivity)], ['Avg online / day', fmtMin(avgHours)],
                ['Total online', fmtMin(totals.online)], ['Total productive', fmtMin(totals.productive)], ['Total idle', fmtMin(totals.idle)],
                ['Unproductive', fmtMin(totals.unproductive)], ['Break time', fmtMin(totals.breaks)],
                ['Manual time logged', `${timesheet.reduce((a, d) => a + d.manualHours, 0)}h`],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-600">{l}</p><p className="text-2xl font-bold text-gray-900">{v}</p></div>
              ))}
            </div>
          )}

          {tab === 'Screenshots' && <ScreenshotGallery employeeId={emp.id} />}

          {tab === 'Settings' && (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                ['Name', emp.name], ['Email', emp.email], ['Department', emp.department ?? '-'], ['Role', emp.role ?? '-'],
                ['Idle threshold', `${snap.config.idleThresholdSeconds}s without input`],
                ['Screenshots', snap.config.screenshotsEnabled ? 'Enabled by policy' : 'Off (default)'],
                ['Keystroke content', 'Never collected'],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-4"><dt className="text-gray-500">{l}</dt><dd className="font-medium text-gray-900 mt-1">{v}</dd></div>
              ))}
              <p className="text-gray-500 md:col-span-2">Read-only. Change settings in Supabase (system_config, employees).</p>
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
