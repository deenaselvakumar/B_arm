'use client'

import { useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Loading, useSnapshot } from '@/components/SnapshotProvider'
import { downloadCsv } from '@/lib/csv'
import { appUsage, buildTimesheet, fmtHM, fmtMin, isSunday, monthDates, monthLabel, monthTotals, staff } from '@/lib/derive'
import type { Snapshot } from '@/lib/types'

type Report = 'summary' | 'attendance' | 'productivity' | 'apps'
type Table = { title: string; file: string; head: string[]; rows: string[][] }

function build(snap: Snapshot, kind: Report): Table {
  const people = staff(snap)
  const month = snap.today.slice(0, 7)
  if (kind === 'summary') {
    return {
      title: `Summary Report - ${monthLabel(snap.today)}`, file: `summary_${month}.csv`,
      head: ['Employee', 'Present Days', 'Online Time', 'Active Time', 'Productive Time', 'Productivity %'],
      rows: people.map((e) => {
        const m = monthTotals(snap, e.id)
        return [e.name, String(m.days), fmtMin(m.online), fmtMin(m.active), fmtMin(m.productive), `${m.productivity.toFixed(2)}%`]
      }),
    }
  }
  if (kind === 'attendance') {
    const dates = monthDates(snap.today)
    return {
      title: `Monthly Attendance - ${monthLabel(snap.today)}`, file: `attendance_${month}.csv`,
      head: ['Employee', ...dates.map((d) => String(Number(d.slice(8)))), 'Total Present', 'Total Absent'],
      rows: people.map((e) => {
        const byDate = new Map(buildTimesheet(snap, e.id).map((d) => [d.date, d]))
        let present = 0, absent = 0
        const cells = dates.map((d) => {
          const r = byDate.get(d)
          if (r?.firstIn) { present++; return r.missingOut ? 'No punch-out' : fmtHM(r.workedMin) }
          if (d > snap.today) return ''
          if (isSunday(d)) return 'Weekly off'
          absent++
          return 'A'
        })
        return [e.name, ...cells, String(present), String(absent)]
      }),
    }
  }
  if (kind === 'productivity') {
    const names = new Map(people.map((e) => [e.id, e.name]))
    return {
      title: `Productivity Report - ${monthLabel(snap.today)} (daily)`, file: `productivity_${month}.csv`,
      head: ['Employee', 'Date', 'Online Time', 'Active Time', 'Productive Time', 'Idle Time', 'Productivity %'],
      rows: snap.dailyStats.filter((r) => names.has(r.employee_id) && r.stat_date.startsWith(month) && r.present)
        .sort((a, b) => a.stat_date.localeCompare(b.stat_date) || names.get(a.employee_id)!.localeCompare(names.get(b.employee_id)!))
        .map((r) => [names.get(r.employee_id)!, r.stat_date, fmtMin(r.online_minutes), fmtMin(r.active_minutes), fmtMin(r.productive_minutes), fmtMin(r.idle_minutes), `${Number(r.productivity_percentage).toFixed(2)}%`]),
    }
  }
  return {
    title: 'Apps & URLs Report - last 7 days (active time)', file: `apps_urls_${snap.today}.csv`,
    head: ['Employee', 'Application', 'URL', 'Category', 'Time'],
    rows: people.flatMap((e) => appUsage(snap, e.id).map((a) => [e.name, a.app, a.url ?? '', a.category, fmtMin(a.minutes)])),
  }
}

const LABELS: Record<Report, string> = { summary: 'Summary', attendance: 'Monthly Attendance', productivity: 'Productivity', apps: 'Apps & URLs' }

export default function ReportsPage() {
  const { snap } = useSnapshot()
  const [kind, setKind] = useState<Report>('summary')
  const table = useMemo(() => (snap ? build(snap, kind) : null), [snap, kind])
  if (!snap || !table) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Preview, then download as CSV.</p>
        </div>
        <button onClick={() => downloadCsv([table.head, ...table.rows], table.file)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg">
          <Download className="w-5 h-5" /> Download CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(LABELS) as Report[]).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`p-5 rounded-xl border-2 text-left ${kind === k ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <FileText className={`w-7 h-7 mb-2 ${kind === k ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">{LABELS[k]}</h3>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{table.title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left font-semibold text-gray-700">
                {table.head.map((h, i) => <th key={i} className={`py-2 px-2 whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-white' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {r.map((c, j) => <td key={j} className={`py-2 px-2 whitespace-nowrap ${j === 0 ? 'font-medium text-gray-900 sticky left-0 bg-white' : 'text-gray-700'}`}>{c}</td>)}
                </tr>
              ))}
              {table.rows.length === 0 && <tr><td colSpan={table.head.length} className="py-6 text-center text-gray-500">No data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
