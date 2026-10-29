import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, supabaseConfigured } from '@/lib/data.server'
import { BUCKET, MAX_BYTES, MAX_PER_DAY, UUID_RE, imageKind, orgConfig } from '@/lib/shots.server'

export const dynamic = 'force-dynamic'

function appName(h: string | null) {
  try { return decodeURIComponent(h || '').slice(0, 200) || null } catch { return null }
}

// Upload endpoint for the desktop agent. The agent proves who it is with its per-employee token (the same one it
// uses for sync); the service-role key never leaves the server. The server is the authority on whether screenshots
// are allowed at all: org switch + team allowlist are re-checked here, not trusted from the agent.
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase is not configured on the portal.' }, { status: 503 })

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const shotId = req.headers.get('x-shot-id') || ''
  const capturedAt = new Date(req.headers.get('x-captured-at') || '')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  if (!UUID_RE.test(shotId) || Number.isNaN(capturedAt.getTime())) return NextResponse.json({ error: 'Bad headers' }, { status: 400 })
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return NextResponse.json({ error: 'Image too large' }, { status: 413 })

  const sb = serviceClient()
  const { data: empId, error: authErr } = await sb.rpc('agent_employee', { p_token: token })
  if (authErr) return NextResponse.json({ error: 'Auth service error' }, { status: 502 })
  if (!empId) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

  const { data: emp } = await sb.from('employees').select('id,department').eq('id', empId).single()
  const cfg = await orgConfig()
  if (!cfg.enabled || !emp || !(cfg.teams.includes('*') || (emp.department && cfg.teams.includes(emp.department)))) {
    return NextResponse.json({ error: 'Screenshots are not enabled for this employee.' }, { status: 403 })
  }

  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return NextResponse.json({ error: 'Image too large or empty' }, { status: 413 })
  const kind = imageKind(bytes)
  if (!kind) return NextResponse.json({ error: 'Only PNG or JPEG images are accepted' }, { status: 415 })

  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const { count } = await sb.from('screenshots').select('id', { count: 'exact', head: true }).eq('employee_id', empId).gte('created_at', dayAgo)
  if ((count ?? 0) >= MAX_PER_DAY) return NextResponse.json({ error: 'Daily screenshot limit reached' }, { status: 429 })

  const { data: existing } = await sb.from('screenshots').select('id,employee_id').eq('id', shotId).maybeSingle()
  if (existing && existing.employee_id !== empId) return NextResponse.json({ error: 'Conflict' }, { status: 409 })

  // Path is chosen by the server, never by the client.
  const path = `${empId}/${shotId}.${kind.ext}`
  const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: true })
  if (up.error) return NextResponse.json({ error: `Storage error: ${up.error.message}` }, { status: 502 })

  const row = {
    id: shotId, employee_id: empId, storage_path: path, captured_at: capturedAt.toISOString(),
    app_name: appName(req.headers.get('x-app')), uploaded: true, blurred: false,
  }
  const { error } = await sb.from('screenshots').upsert(row, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 502 })
  return NextResponse.json({ ok: true, id: shotId })
}
