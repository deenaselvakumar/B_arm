import { NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/data.server'
import { getManager } from '@/lib/auth.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const manager = await getManager()
  if (!manager) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getSnapshot(manager), { headers: { 'Cache-Control': 'no-store' } })
}
