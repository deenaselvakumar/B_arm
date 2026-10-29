'use client'

import { useCallback, useEffect, useState } from 'react'
import { Camera } from 'lucide-react'

interface Item { id: string; employee_id: string; captured_at: string; app_name: string | null; uploaded: boolean }
interface Employee { id: string; name: string; email: string; department: string | null }
interface Resp { mode: 'demo' | 'supabase'; enabled: boolean; teams?: string[]; employees: Employee[]; items: Item[]; note?: string; error?: string }

const istDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })

// Manager-only gallery. Everything it shows comes from /api/screenshots, which only returns employees mapped to the
// logged-in manager, and images are streamed by /api/screenshots/<id>/image with the same check.
export default function ScreenshotGallery({ employeeId }: { employeeId?: string }) {
  const [employee, setEmployee] = useState(employeeId ?? '')
  const [day, setDay] = useState(istDay())
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Item | null>(null)

  useEffect(() => { if (employeeId !== undefined) setEmployee(employeeId) }, [employeeId])

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ day })
      if (employee) qs.set('employee', employee)
      const res = await fetch(`/api/screenshots?${qs}`, { cache: 'no-store' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setData(j); setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [employee, day])

  useEffect(() => { load() }, [load])

  const name = (id: string) => data?.employees.find((e) => e.id === id)?.name ?? 'Unknown'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {employeeId === undefined && (
          <label className="text-sm text-gray-600">Employee
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900">
              <option value="">All my employees</option>
              {data?.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm text-gray-600">Day
          <input type="date" value={day} max={istDay()} onChange={(e) => setDay(e.target.value)} className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900" />
        </label>
        <button onClick={load} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Refresh</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {data?.note && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.note}</div>}
      {data && data.mode === 'supabase' && !data.enabled && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Screenshots are <b>off</b> for the organisation (default). Nothing is captured or uploaded. Existing images from earlier are still listed below.
          To enable for specific teams see the README (&quot;Screenshots&quot;).
        </div>
      )}
      {data && data.mode === 'supabase' && data.employees.length === 0 && (
        <p className="text-sm text-gray-600">No employees are mapped to you yet. Add one on the Employees page.</p>
      )}

      {data && data.items.length === 0 && data.mode === 'supabase' && data.employees.length > 0 && (
        <div className="text-center text-gray-500 py-12"><Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />No screenshots for this day.</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.items.map((s) => (
          <button key={s.id} onClick={() => s.uploaded && setOpen(s)} className="text-left bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow">
            {s.uploaded ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/screenshots/${s.id}/image`} alt={`Screenshot of ${name(s.employee_id)} at ${istTime(s.captured_at)}`} loading="lazy" className="w-full h-32 object-cover bg-gray-100" />
            ) : (
              <div className="h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500 px-2 text-center">Image not uploaded (metadata only)</div>
            )}
            <div className="p-2 text-xs">
              <p className="font-medium text-gray-900">{name(s.employee_id)}</p>
              <p className="text-gray-500">{istTime(s.captured_at)} IST{s.app_name ? ` · ${s.app_name}` : ''}</p>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-full overflow-auto p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{name(open.employee_id)} · {istTime(open.captured_at)} IST{open.app_name ? ` · ${open.app_name}` : ''}</span>
              <button onClick={() => setOpen(null)} className="text-gray-500 hover:text-gray-800">Close</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/screenshots/${open.id}/image`} alt="Screenshot" className="w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
