'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Snapshot } from '@/lib/types'

interface Ctx { snap: Snapshot | null; error: string | null; refresh: () => void }
const SnapshotContext = createContext<Ctx>({ snap: null, error: null, refresh: () => {} })

export const useSnapshot = () => useContext(SnapshotContext)

export default function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshot', { cache: 'no-store' })
      if (res.status === 401) { router.push('/'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSnap(await res.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    }
  }, [router])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  }, [refresh])

  return <SnapshotContext.Provider value={{ snap, error, refresh }}>{children}</SnapshotContext.Provider>
}

export function Loading() {
  const { error } = useSnapshot()
  return <div className="p-8 text-gray-500">{error ? `Could not load data: ${error}` : 'Loading…'}</div>
}
