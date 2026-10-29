import { NextRequest, NextResponse } from 'next/server'
import { getManager } from '@/lib/auth.server'
import { serviceClient, supabaseConfigured } from '@/lib/data.server'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, [string, number]> = {
  invalid_email: ['Enter a valid email address.', 400],
  name_required: ['Name is required.', 400],
  password_too_short: ['Password must be at least 8 characters.', 400],
  employee_exists: ['An employee with that email already exists.', 409],
  manager_not_found: ['Your manager account could not be found.', 500],
}

// Manager-only: add an employee who is mapped to the logged-in manager. Passwords are hashed in Postgres.
export async function POST(req: NextRequest) {
  const manager = await getManager()
  if (!manager) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Demo mode cannot save employees. Connect Supabase (see README) to add real ones.' }, { status: 501 })
  }
  const b = await req.json().catch(() => ({}))
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const { data, error } = await serviceClient().rpc('add_employee', {
    p_email: str(b.email, 200), p_name: str(b.name, 120), p_department: str(b.department, 80), p_role: str(b.role, 80),
    p_password: typeof b.password === 'string' ? b.password.slice(0, 200) : '', p_manager_email: manager.email, p_is_manager: false,
  })
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    if (key) return NextResponse.json({ error: MESSAGES[key][0] }, { status: MESSAGES[key][1] })
    return NextResponse.json({ error: `Could not add employee: ${error.message}` }, { status: 502 })
  }
  return NextResponse.json({ ok: true, id: data })
}
