import 'server-only'
import { serviceClient, supabaseConfigured } from './data.server'
import type { Manager } from './auth.server'

export const BUCKET = 'screenshots'
export const MAX_BYTES = 3 * 1024 * 1024
export const MAX_PER_DAY = 500
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface MappedEmployee { id: string; name: string; email: string; department: string | null }

export async function mappedEmployees(manager: Manager): Promise<MappedEmployee[]> {
  if (!supabaseConfigured()) return []
  const { data, error } = await serviceClient()
    .from('employees').select('id,name,email,department').eq('manager_id', manager.id).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export function imageKind(b: Uint8Array): { ext: 'png' | 'jpg'; type: string } | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', type: 'image/png' }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' }
  return null
}

export async function orgConfig() {
  const { data } = await serviceClient().from('system_config').select('config_key,config_value').in('config_key', ['screenshots_enabled', 'screenshot_teams'])
  const c = Object.fromEntries((data ?? []).map((r: { config_key: string; config_value: string }) => [r.config_key, r.config_value]))
  let teams: string[] = []
  try { teams = JSON.parse(c.screenshot_teams || '[]') } catch { /* treated as empty */ }
  return { enabled: c.screenshots_enabled === 'true', teams }
}
