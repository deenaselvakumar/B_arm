import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from './session'

export interface Manager { id: string; email: string; name: string }

export async function getManager(): Promise<Manager | null> {
  const s = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value)
  return s ? { id: s.sub, email: s.email, name: s.name } : null
}
