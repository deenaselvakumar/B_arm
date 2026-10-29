// Signed-cookie session. Uses Web Crypto so it runs in both middleware (edge) and route handlers (node).
export const SESSION_COOKIE = 'myzen_session'
const MAX_AGE_SECONDS = 60 * 60 * 8

const secret = () =>
  process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'myzen-demo-secret-not-for-production'

const enc = new TextEncoder()
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function sign(payload: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
}

export async function createSessionToken(email: string) {
  const payload = b64url(enc.encode(JSON.stringify({ email, exp: Date.now() + MAX_AGE_SECONDS * 1000 })))
  return `${payload}.${await sign(payload)}`
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || (await sign(payload)) !== sig) return null
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return json.exp > Date.now() ? (json as { email: string; exp: number }) : null
  } catch {
    return null
  }
}

export const sessionCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure,
  path: '/',
  maxAge: MAX_AGE_SECONDS,
})
