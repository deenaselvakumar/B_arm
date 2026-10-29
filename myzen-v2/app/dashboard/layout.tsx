'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem('myzen_auth')
    if (!auth) {
      router.push('/')
    }
  }, [router])

  return <Sidebar>{children}</Sidebar>
}
