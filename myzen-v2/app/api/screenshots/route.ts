import { NextRequest, NextResponse } from 'next/server'
import { getManager } from '@/lib/auth.server'
import { serviceClient, supabaseConfigured } from '@/lib/data.server'
import { mappedEmployees, orgConfig } from '@/lib/shots.server'

export const dynamic = 'force-dynamic'

// Manager-only. Lists screenshot metadata for employees mapped to the logged-in manager and nobody else.
export async function GET(req: NextRequest) {
  const manager = await getManager()
  if (!manager) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!supabaseConfigured()) {
    return NextResponse.json({ mode: 'demo', enabled: false, employees: [], items: [], note: 'Demo mode has no screenshots. Connect Supabase to use this view.' })
  }
  try {
    const mine = await mappedEmployees(manager)
    const want = req.nextUrl.searchParams.get('employee')
    if (want && !mine.some((e) => e.id === want)) return NextResponse.json({ error: 'Not one of your employees' }, { status: 403 })
    const ids = want ? [want] : mine.map((e) => e.id)
    const cfg = await orgConfig()
    let items: unknown[] = []
    if (ids.length) {
      const day = req.nextUrl.searchParams.get('day')
      let q = serviceClient().from('screenshots').select('id,employee_id,captured_at,app_name,uploaded,blurred').in('employee_id', ids).order('captured_at', { ascending: false }).limit(200)
      if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) q = q.gte('captured_at', `${day}T00:00:00+05:30`).lt('captured_at', `${day}T23:59:59.999+05:30`)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      items = data ?? []
    }
    return NextResponse.json({ mode: 'supabase', enabled: cfg.enabled, teams: cfg.teams, employees: mine, items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 502 })
  }
}
