'use client'

import { useState } from 'react'
import { Loading, useSnapshot } from '@/components/SnapshotProvider'

export default function EmployeesPage() {
  const { snap, refresh } = useSnapshot()
  const [form, setForm] = useState({ name: '', email: '', department: '', role: '', password: '' })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!snap) return <Loading />

  const people = snap.employees.filter((e) => !e.is_manager)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `${form.name} added. They can now log in to the desktop agent with ${form.email} and the password you set.` })
      setForm({ name: '', email: '', department: '', role: '', password: '' })
      refresh()
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900'
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <p className="text-gray-600 mt-1">Employees mapped to you ({snap.manager.name}). They log in to the desktop agent, not to this website.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Team</th><th className="p-3">Role</th><th className="p-3">Now</th></tr></thead>
            <tbody>
              {people.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-gray-900">{e.name}</td><td className="p-3">{e.email}</td>
                  <td className="p-3">{e.department ?? '-'}</td><td className="p-3">{e.role ?? '-'}</td><td className="p-3 capitalize">{snap.presence[e.id]}</td>
                </tr>
              ))}
              {people.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No employees mapped to you yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Add employee</h2>
          {snap.mode === 'demo' && <p className="text-xs rounded bg-amber-50 text-amber-800 p-2">Demo mode: saving is disabled. Connect Supabase to add employees (or use the SQL helper in the README).</p>}
          <label className="block text-sm text-gray-600">Full name<input className={input} value={form.name} onChange={set('name')} required /></label>
          <label className="block text-sm text-gray-600">Work email<input type="email" className={input} value={form.email} onChange={set('email')} required /></label>
          <label className="block text-sm text-gray-600">Department / team<input className={input} value={form.department} onChange={set('department')} /></label>
          <label className="block text-sm text-gray-600">Role<input className={input} value={form.role} onChange={set('role')} /></label>
          <label className="block text-sm text-gray-600">Initial password (min 8)<input type="text" autoComplete="off" className={input} value={form.password} onChange={set('password')} required minLength={8} /></label>
          {msg && <p className={`text-sm rounded p-2 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
          <button disabled={busy} className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? 'Adding…' : 'Add employee'}</button>
          <p className="text-xs text-gray-500">Share the password with the employee privately. It is stored only as a bcrypt hash.</p>
        </form>
      </div>
    </div>
  )
}
