import { NextResponse } from 'next/server'
import { getSnapshot } from '@/lib/data.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getSnapshot(), { headers: { 'Cache-Control': 'no-store' } })
}
