import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session'
import { demoManagerFor, serviceClient, supabaseConfigured } from '@/lib/data.server'

export const dynamic = 'force-dynamic'

const attempts = new Map<string, { n: number; reset: number }>()
const tooMany = (ip: string) => {
  const now = Date.now()
  const a = attempts.get(ip)
  if (!a || a.reset < now) { attempts.set(ip, { n: 1, reset: now + 60_000 }); return false }
  a.n += 1
  return a.n > Number(process.env.LOGIN_RATE_LIMIT || 8)
}

export async function GET() {
  return NextResponse.json({ mode: supabaseConfigured() ? 'supabase' : 'demo' })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (tooMany(ip)) return NextResponse.json({ error: 'Too many attempts. Wait a minute and retry.' }, { status: 429 })

  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

  let user: { sub: string; email: string; name: string }
  if (supabaseConfigured()) {
    const { data, error } = await serviceClient().rpc('verify_employee_login', { p_email: email, p_password: password })
    if (error) return NextResponse.json({ error: `Login service error: ${error.message}` }, { status: 502 })
    const row = Array.isArray(data) ? data[0] : null
    if (!row || !row.is_manager) {
      return NextResponse.json({ error: 'Invalid credentials, or this account is not a manager.' }, { status: 401 })
    }
    user = { sub: row.id, email: row.email, name: row.name }
  } else {
    const m = demoManagerFor(String(email))
    user = { sub: m.id, email: m.email, name: m.name }
  }

  const secure = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')) === 'https'
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions(secure))
  return res
}
