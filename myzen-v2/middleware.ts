import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export async function middleware(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/', req.url))
}

export const config = {
  matcher: ['/dashboard/:path*', '/real-time/:path*', '/analytics/:path*', '/reports/:path*', '/user-detail/:path*', '/api/snapshot'],
}
