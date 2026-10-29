'use client'

import { Activity, Circle, Coffee } from 'lucide-react'
import { Loading, useSnapshot } from '@/components/SnapshotProvider'
import { fmtMin, initials, istTime, liveState, staff } from '@/lib/derive'

export default function RealTimePage() {
  const { snap, refresh } = useSnapshot()
  if (!snap) return <Loading />

  const people = staff(snap)
  const rows = people.map((e) => {
    const st = liveState(snap, e.id)
    const today = snap.dailyStats.find((r) => r.employee_id === e.id && r.stat_date === snap.today)
    return { e, st, today, presence: snap.presence[e.id] }
  })
  const onlineRows = rows.filter((r) => r.presence !== 'offline')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real Time</h1>
          <p className="text-gray-600 mt-1">
            Refreshes every 20s from {snap.mode === 'supabase' ? 'Supabase (agents sync about once a minute)' : 'demo data'}.
          </p>
        </div>
        <button onClick={refresh} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Refresh now</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Online now ({onlineRows.length} of {people.length})</h2>
          <div className="flex items-center space-x-2">
            <Circle className="w-3 h-3 text-green-500 fill-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        <div className="space-y-4">
          {onlineRows.map(({ e, st, today, presence }) => (
            <div key={e.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{initials(e.name)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{e.name}</h3>
                    <p className="text-sm text-gray-600">{e.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-8 text-sm">
                  <div>
                    <p className="text-gray-500">State</p>
                    {st.onBreak || presence === 'away' ? (
                      <p className="font-medium text-orange-600 flex items-center gap-1"><Coffee className="w-4 h-4" /> On break</p>
                    ) : (
                      <p className="font-medium text-green-700">Working{st.since ? ` since ${istTime(st.since)}` : ''}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">Last activity</p>
                    <p className="font-medium text-gray-900">{st.lastSession ? `${st.lastSession.app_name ?? 'Idle'}${st.lastSession.url ? ` · ${st.lastSession.url}` : ''}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Online / productive</p>
                    <p className="font-medium text-gray-900">{today ? `${fmtMin(today.online_minutes)} / ${fmtMin(today.productive_minutes)}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Productivity</p>
                    <p className="font-semibold text-blue-600">{today ? `${Number(today.productivity_percentage).toFixed(1)}%` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {onlineRows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No employees are online</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
