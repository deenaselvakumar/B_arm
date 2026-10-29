// End-to-end: real schema.sql/seed.sql (PGlite) + built Next portal (`next start`) + real desktop-agent core.
// Run `npm run build` first, then `npm run e2e`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { startShim, SERVICE_KEY, ANON_KEY } from './pg-shim.mjs'

const require = createRequire(import.meta.url)
const { makeCore } = require('../desktop-agent/test/helpers.js')

const PORTAL = 'http://127.0.0.1:3200'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const MIN = 60000

let shim, next
const sql = async (q) => (await fetch(`${shim.url}/__sql`, { method: 'POST', body: q }).then((r) => r.json()))

async function portalLogin(email, password) {
  const res = await fetch(`${PORTAL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0]
  return { status: res.status, cookie }
}
const get = (path, cookie) => fetch(`${PORTAL}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' })
const post = (path, body, cookie) => fetch(`${PORTAL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })

function agent(extra = {}) {
  return makeCore({ now: () => Date.now(), settings: { supabaseUrl: shim.url, supabaseAnonKey: ANON_KEY, portalUrl: PORTAL, ...extra } })
}

test.before(async () => {
  shim = await startShim({ port: 4020 })
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3200'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: shim.url, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SESSION_SECRET: 'e2e-secret', LOGIN_RATE_LIMIT: '1000' },
    stdio: 'ignore',
  })
  for (let i = 0; i < 60; i++) {
    try { await fetch(PORTAL); break } catch { await new Promise((r) => setTimeout(r, 500)) }
  }
})
test.after(async () => { next?.kill(); await shim?.close() })

test('manager login: only managers, and only with the right password', async () => {
  assert.equal((await portalLogin('manager@barm.in', 'wrong')).status, 401)
  assert.equal((await portalLogin('deena.s@barm.in', 'myzen123')).status, 401, 'employees cannot log in to the portal')
  const ok = await portalLogin('manager@barm.in', 'myzen123')
  assert.equal(ok.status, 200)
  assert.ok(ok.cookie.startsWith('myzen_session='))
})

test('portal pages and APIs require a session', async () => {
  for (const p of ['/dashboard', '/screenshots', '/employees']) assert.equal((await get(p)).status, 307, p)
  for (const p of ['/api/snapshot', '/api/screenshots', '/api/screenshots/00000000-0000-4000-8000-000000000001/image']) assert.equal((await get(p)).status, 401, p)
  assert.equal((await post('/api/employees', {})).status, 401)
})

test('managers see only the employees mapped to them', async () => {
  const m1 = await portalLogin('manager@barm.in', 'myzen123')
  const s1 = await (await get('/api/snapshot', m1.cookie)).json()
  assert.equal(s1.mode, 'supabase')
  assert.equal(s1.manager.email, 'manager@barm.in')
  const names1 = s1.employees.map((e) => e.name).sort()
  assert.deepEqual(names1, ['Arun Kumar', 'Chandru P', 'Deena Selvakumar', 'Meera Nair', 'Priya Sharma', 'Riya Menon'])
  const vikram = (await sql(`select id from employees where email = 'vikram.s@barm.in'`))[0].id
  const mine = new Set(s1.employees.map((e) => e.id))
  for (const k of ['dailyStats', 'punches', 'breaks', 'timesheet', 'sessions']) {
    assert.ok(s1[k].length > 0 || k === 'sessions', k)
    assert.ok(s1[k].every((r) => mine.has(r.employee_id)), `${k} only contains mapped employees`)
    assert.ok(!s1[k].some((r) => r.employee_id === vikram), `${k} excludes Vikram`)
  }
  const m2 = await portalLogin('manager2@barm.in', 'myzen123')
  const s2 = await (await get('/api/snapshot', m2.cookie)).json()
  assert.deepEqual(s2.employees.map((e) => e.name), ['Vikram Singh'])
  assert.ok(s2.dailyStats.every((r) => r.employee_id === vikram))
})

test('manager can add an employee; validation and duplicates are enforced', async () => {
  const m1 = (await portalLogin('manager@barm.in', 'myzen123')).cookie
  const good = { name: 'Test Hire', email: 'Test.Hire@barm.in', department: 'AI/ML', role: 'Intern', password: 'Passw0rd!x' }
  const r = await post('/api/employees', good, m1)
  assert.equal(r.status, 200, await r.clone().text())
  assert.equal((await post('/api/employees', good, m1)).status, 409)
  assert.equal((await post('/api/employees', { ...good, email: 'x@barm.in', password: 'short' }, m1)).status, 400)
  assert.equal((await post('/api/employees', { ...good, email: 'not-an-email' }, m1)).status, 400)
  const row = (await sql(`select email, is_manager, manager_id is not null as mapped, password_hash <> 'Passw0rd!x' as hashed from employees where email = 'test.hire@barm.in'`))[0]
  assert.deepEqual(row, { email: 'test.hire@barm.in', is_manager: false, mapped: true, hashed: true })
  const snap = await (await get('/api/snapshot', m1)).json()
  assert.ok(snap.employees.some((e) => e.email === 'test.hire@barm.in'), 'appears on the adding manager\'s portal')
  const m2 = (await portalLogin('manager2@barm.in', 'myzen123')).cookie
  assert.ok(!(await (await get('/api/snapshot', m2)).json()).employees.some((e) => e.email === 'test.hire@barm.in'), 'not on the other manager\'s portal')
})

test('new employee logs into the agent; everything they record shows up on their manager\'s portal', async () => {
  const { core, source, now } = agent()
  await assert.rejects(core.login('test.hire@barm.in', 'wrong-pass'), /Invalid email or password/)
  await core.login('test.hire@barm.in', 'Passw0rd!x')
  core.punch('in')
  source.win = { app: 'Visual Studio Code', url: null }
  await core.monitor.tick()
  await new Promise((r) => setTimeout(r, 1200))
  await core.monitor.tick()
  core.startBreak(); core.endBreak()
  core.logTime({ date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), hours: 1.5, description: 'Onboarding workshop' })
  core.monitor.closeCurrent()
  const r = await core.syncNow()
  assert.ok(r.ok, JSON.stringify(r))

  const m1 = (await portalLogin('manager@barm.in', 'myzen123')).cookie
  const snap = await (await get('/api/snapshot', m1)).json()
  const emp = snap.employees.find((e) => e.email === 'test.hire@barm.in')
  assert.ok(emp)
  assert.ok(snap.punches.some((p) => p.employee_id === emp.id && p.punch_type === 'in'), 'punch visible')
  assert.ok(snap.breaks.some((b) => b.employee_id === emp.id), 'break visible')
  assert.ok(snap.timesheet.some((t) => t.employee_id === emp.id && t.description === 'Onboarding workshop'), 'timesheet visible')
  assert.ok(snap.sessions.some((s) => s.employee_id === emp.id && s.app_name === 'Visual Studio Code'), 'app activity visible')
  assert.ok(snap.dailyStats.some((s) => s.employee_id === emp.id), 'daily stats visible')
  assert.equal(snap.presence[emp.id], 'online')

  const m2 = (await portalLogin('manager2@barm.in', 'myzen123')).cookie
  assert.ok(!(await (await get('/api/snapshot', m2)).json()).punches.some((p) => p.employee_id === emp.id), 'other manager cannot see it')
})

test('demo new hire Riya Menon (Welcome@123) can log in on a fresh PC', async () => {
  const { core } = agent()
  await assert.rejects(core.login('riya.menon@barm.in', 'myzen123'), /Invalid email or password/)
  const e = await core.login('riya.menon@barm.in', 'Welcome@123')
  assert.equal(e.name, 'Riya Menon')
  assert.equal(core.state().stats.online, 0)
  const m1 = (await portalLogin('manager@barm.in', 'myzen123')).cookie
  const snap = await (await get('/api/snapshot', m1)).json()
  assert.ok(snap.employees.some((x) => x.email === 'riya.menon@barm.in'))
})

test('screenshots: off by default; when enabled the agent uploads and only the mapped manager can view', async () => {
  const riya = agent({ screenshots: { enabled: true, teams: [], intervalMinutes: 10 } })
  riya.core.screenshots.capturer = async () => PNG
  await riya.core.login('riya.menon@barm.in', 'Welcome@123')
  riya.core.punch('in')

  // default: org switch off -> agent will not capture, server refuses uploads
  assert.equal(await riya.core.screenshots.maybeCapture(), null)
  const token = riya.core.store.session.token
  const direct = (body, headers = {}) => fetch(`${PORTAL}/api/agent/screenshot`, {
    method: 'POST', body, headers: { Authorization: `Bearer ${token}`, 'X-Shot-Id': '11111111-1111-4111-8111-111111111111', 'X-Captured-At': new Date().toISOString(), ...headers },
  })
  assert.equal((await direct(PNG)).status, 403, 'server refuses while disabled')

  // org enables screenshots for Engineering only
  await sql(`update system_config set config_value = 'true' where config_key = 'screenshots_enabled'`)
  await sql(`update system_config set config_value = '["Engineering"]' where config_key = 'screenshot_teams'`)
  await riya.core.login('riya.menon@barm.in', 'Welcome@123')
  const file = await riya.core.screenshots.maybeCapture()
  assert.ok(file, 'agent captures once enabled')
  assert.ok((await riya.core.syncNow()).ok)
  const shot = (await sql(`select id, uploaded, storage_path, blurred from screenshots`))[0]
  assert.equal(shot.uploaded, true)
  assert.match(shot.storage_path, /\.png$/)
  assert.ok(shim.objects.has(`screenshots/${shot.storage_path}`), 'bytes are in the (private) bucket')

  // server-side validation
  assert.equal((await direct(Buffer.from('not an image'))).status, 415)
  assert.equal((await direct(PNG, { 'X-Shot-Id': 'nope' })).status, 400)
  assert.equal((await fetch(`${PORTAL}/api/agent/screenshot`, { method: 'POST', body: PNG, headers: { Authorization: 'Bearer bogus', 'X-Shot-Id': '11111111-1111-4111-8111-111111111112', 'X-Captured-At': new Date().toISOString() } })).status, 401)

  // a team that is not allowed is refused by the server even with a valid token
  const priya = agent({ screenshots: { enabled: true, teams: [], intervalMinutes: 10 } })
  await priya.core.login('priya.s@barm.in', 'myzen123')
  const pr = await fetch(`${PORTAL}/api/agent/screenshot`, { method: 'POST', body: PNG, headers: { Authorization: `Bearer ${priya.core.store.session.token}`, 'X-Shot-Id': '22222222-2222-4222-8222-222222222222', 'X-Captured-At': new Date().toISOString() } })
  assert.equal(pr.status, 403)

  // manager 1 (Riya's manager) sees it; manager 2 does not
  const riyaId = (await sql(`select id from employees where email = 'riya.menon@barm.in'`))[0].id
  const m1 = (await portalLogin('manager@barm.in', 'myzen123')).cookie
  const list = await (await get(`/api/screenshots?employee=${riyaId}`, m1)).json()
  assert.equal(list.items.length, 1)
  assert.equal(list.items[0].id, shot.id)
  assert.equal(list.enabled, true)
  const img = await get(`/api/screenshots/${shot.id}/image`, m1)
  assert.equal(img.status, 200)
  assert.equal(img.headers.get('content-type'), 'image/png')
  assert.match(img.headers.get('cache-control'), /no-store/)
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG)
  const all = await (await get('/api/screenshots', m1)).json()
  assert.ok(all.items.every((i) => all.employees.some((e) => e.id === i.employee_id)))

  const m2 = (await portalLogin('manager2@barm.in', 'myzen123')).cookie
  assert.equal((await get(`/api/screenshots?employee=${riyaId}`, m2)).status, 403)
  assert.equal((await (await get('/api/screenshots', m2)).json()).items.length, 0)
  assert.equal((await get(`/api/screenshots/${shot.id}/image`, m2)).status, 404, 'other manager gets 404, not the image')
})

test('portal starts on Node 18/20 without a native WebSocket (supabase-js realtime stubbed)', async () => {
  assert.equal((await get('/api/snapshot', (await portalLogin('manager@barm.in', 'myzen123')).cookie)).status, 200)
})
