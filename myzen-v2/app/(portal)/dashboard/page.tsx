'use client'

import { Users, TrendingUp, Clock, Activity } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts'
import { Loading, useSnapshot } from '@/components/SnapshotProvider'
import { appUsage, fmtMin, istDay, monthLabel, monthTotals, pct, productivityTrend, staff } from '@/lib/derive'

export default function DashboardPage() {
  const { snap } = useSnapshot()
  if (!snap) return <Loading />

  const people = staff(snap)
  const ids = new Set(people.map((p) => p.id))
  const todayStats = snap.dailyStats.filter((r) => r.stat_date === snap.today && ids.has(r.employee_id) && r.online_minutes > 0)
  const online = people.filter((p) => snap.presence[p.id] !== 'offline').length
  const presentToday = new Set([
    ...snap.punches.filter((p) => ids.has(p.employee_id) && p.punch_type === 'in' && istDay(p.punch_time) === snap.today).map((p) => p.employee_id),
    ...todayStats.map((r) => r.employee_id),
  ]).size
  const sum = (k: 'online_minutes' | 'active_minutes' | 'productive_minutes' | 'unproductive_minutes' | 'idle_minutes') =>
    todayStats.reduce((a, r) => a + r[k], 0)
  const avgProductivity = sum('online_minutes') ? (sum('productive_minutes') / sum('online_minutes')) * 100 : 0

  const productive = sum('productive_minutes')
  const unproductive = sum('unproductive_minutes')
  const idle = sum('idle_minutes')
  const neutral = Math.max(0, sum('active_minutes') - productive - unproductive)
  const breakdown = [
    { name: 'Productive', value: productive, color: '#10b981' },
    { name: 'Neutral', value: neutral, color: '#94a3b8' },
    { name: 'Unproductive', value: unproductive, color: '#ef4444' },
    { name: 'Idle', value: idle, color: '#f59e0b' },
  ]

  const sinceDay = new Date(Date.parse(`${snap.today}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10)
  const apps = new Map<string, number>()
  for (const a of appUsage(snap, null, sinceDay)) apps.set(a.app, (apps.get(a.app) ?? 0) + a.minutes)
  const topApps = [...apps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))

  const stats = [
    { title: 'Online Now', value: online, subtitle: `of ${people.length} employees`, icon: Users, color: 'bg-green-500' },
    { title: 'Avg Productivity (today)', value: pct(avgProductivity), subtitle: 'productive ÷ online time', icon: TrendingUp, color: 'bg-blue-500' },
    { title: 'Present Today', value: presentToday, subtitle: `of ${people.length} employees`, icon: Activity, color: 'bg-purple-500' },
    { title: 'Active Time (today)', value: fmtMin(sum('active_minutes')), subtitle: 'all employees combined', icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {new Date(`${snap.today}T00:00:00Z`).toLocaleDateString('en-IN', { dateStyle: 'full', timeZone: 'UTC' })} · {monthLabel(snap.today)} month-to-date below
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{s.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.subtitle}</p>
              </div>
              <div className={`${s.color} p-3 rounded-lg`}><s.icon className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Productivity Trend (team, last 14 days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={productivityTrend(snap)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" />
              <YAxis domain={[0, 100]} stroke="#6b7280" unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={(l) => `Oct ${l}`} />
              <Line type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Breakdown (today)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {breakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtMin(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2">
            {breakdown.map((i) => (
              <div key={i.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="text-sm text-gray-600">{i.name} · {fmtMin(i.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Applications (last 7 days, active time)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topApps}>
            <XAxis dataKey="name" stroke="#6b7280" interval={0} tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" />
            <Tooltip formatter={(v: number) => fmtMin(v)} />
            <Bar dataKey="minutes" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="py-3 px-4">Employee</th><th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Online today</th><th className="py-3 px-4">Productivity (month)</th><th className="py-3 px-4">Present days</th>
              </tr>
            </thead>
            <tbody>
              {people.map((e) => {
                const t = todayStats.find((r) => r.employee_id === e.id)
                const m = monthTotals(snap, e.id)
                const st = snap.presence[e.id]
                return (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4"><p className="font-medium text-gray-900">{e.name}</p><p className="text-sm text-gray-500">{e.role}</p></td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${st === 'online' ? 'bg-green-100 text-green-800' : st === 'away' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{st}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{t ? fmtMin(t.online_minutes) : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${m.productivity}%` }} /></div>
                        <span className="text-sm font-medium text-gray-700">{pct(m.productivity)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{m.days}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
