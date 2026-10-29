'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Lock, User } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'demo' | 'supabase' | null>(null)

  useEffect(() => {
    fetch('/api/login').then((r) => r.json()).then((d) => setMode(d.mode)).catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError((await res.json().catch(() => ({}))).error || 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-xl mb-4">
              <span className="text-2xl font-bold text-white">MZ</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">MyZenV2</h1>
            <p className="text-blue-200">B-Arm India · Manager Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="manager@barm.in"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-blue-200">
            {mode === 'supabase'
              ? 'Sign in with a manager account from the employees table.'
              : mode === 'demo'
              ? 'Demo mode (Supabase not configured): any credentials are accepted.'
              : ''}
          </p>
          <p className="mt-2 text-center text-xs text-blue-300">Employees punch in/out from the MyZen desktop app, not this site.</p>
        </div>
      </div>
    </div>
  )
}
