import { NextResponse } from 'next/server'
import { getManager } from '@/lib/auth.server'
import { serviceClient, supabaseConfigured } from '@/lib/data.server'
import { BUCKET, UUID_RE } from '@/lib/shots.server'

export const dynamic = 'force-dynamic'

// Streams one image, only if its owner is mapped to the logged-in manager. The bucket is private and the
// bytes are fetched server-side with the service role, so there is no URL that can be shared or guessed.
// Anything the manager may not see answers 404 (not 403) so ids cannot be probed.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const manager = await getManager()
  if (!manager) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!supabaseConfigured() || !UUID_RE.test(params.id)) return notFound()

  const sb = serviceClient()
  const { data: shot } = await sb.from('screenshots').select('id,employee_id,storage_path,uploaded').eq('id', params.id).maybeSingle()
  if (!shot || !shot.uploaded || !shot.storage_path) return notFound()
  const { data: owner } = await sb.from('employees').select('id').eq('id', shot.employee_id).eq('manager_id', manager.id).maybeSingle()
  if (!owner) return notFound()

  const dl = await sb.storage.from(BUCKET).download(shot.storage_path)
  if (dl.error || !dl.data) return notFound()
  return new NextResponse(await dl.data.arrayBuffer(), {
    headers: {
      'Content-Type': shot.storage_path.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
