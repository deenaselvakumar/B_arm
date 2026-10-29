const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { makeCore } = require('./helpers')

const MIN = 60000
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

const withShots = (extra = {}) => {
  const ctx = makeCore({ settings: { screenshots: { enabled: true, teams: ['Engineering'], intervalMinutes: 10 }, ...extra } })
  let n = 0
  ctx.core.screenshots.capturer = async () => { n++; return PNG }
  ctx.shots = () => n
  return ctx
}

test('default config: nothing is ever captured', async () => {
  const { core, now } = makeCore()
  let called = false
  core.screenshots.capturer = async () => { called = true; return PNG }
  await core.login('deena.s@barm.in', 'x')
  core.punch('in')
  now.advance(60 * MIN)
  assert.equal(await core.screenshots.maybeCapture(), null)
  assert.equal(called, false)
  assert.equal(core.state().screenshots.enabled, false)
})

test('enabled: captures on interval only while punched in and not on break; stores locally; counts', async () => {
  const { core, now, dir, shots } = withShots()
  await core.login('deena.s@barm.in', 'x')
  assert.equal(await core.screenshots.maybeCapture(), null, 'not punched in')
  core.punch('in')
  assert.ok(await core.screenshots.maybeCapture(), 'first capture')
  now.advance(5 * MIN)
  assert.equal(await core.screenshots.maybeCapture(), null, 'interval not elapsed')
  core.startBreak(); now.advance(10 * MIN)
  assert.equal(await core.screenshots.maybeCapture(), null, 'on break')
  core.endBreak()
  assert.ok(await core.screenshots.maybeCapture(), 'after break')
  assert.equal(shots(), 2)
  const files = fs.readdirSync(path.join(dir, 'screenshots'))
  assert.equal(files.length, 2)
  const s = core.state()
  assert.equal(s.screenshots.todayCount, 2)
  assert.equal(core.store.pending().screenshots.length, 2, 'metadata queued for sync')
})

test('team allowlist is enforced (demo mode)', async () => {
  const { core } = withShots({ screenshots: { enabled: true, teams: ['Design'], intervalMinutes: 10 } })
  await core.login('deena.s@barm.in', 'x')
  core.punch('in')
  assert.match(core.screenshots.policy().reason, /SCREENSHOT_TEAMS/)
  assert.equal(await core.screenshots.maybeCapture(), null)
})

const http = require('http')

function fakePortal(handler) {
  const calls = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const call = { url: req.url, headers: req.headers, body: Buffer.concat(chunks) }
      calls.push(call)
      const out = handler(call, calls.length)
      res.writeHead(out.status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(out.body || {}))
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ calls, server, url: `http://127.0.0.1:${server.address().port}` })))
}

// Live mode is needed for upload (token). Use a stub Cloud so no Supabase is required.
function liveWithPortal(portalUrl) {
  const ctx = makeCore({ settings: { portalUrl, screenshots: { enabled: true, teams: ['*'], intervalMinutes: 10 } } })
  ctx.core.cloud.enabled = true
  ctx.core.cloud.login = async () => ({ data: { token: 'tok-123', employee: { id: 'e1', name: 'Deena', email: 'd@x.in', department: 'Engineering' }, rules: [], config: { screenshots_enabled: 'true', screenshot_teams: '["*"]' } } })
  ctx.core.cloud.history = async () => ({ data: {} })
  ctx.core.cloud.sync = async () => ({ data: { ok: true } })
  ctx.core.cloud.logout = async () => ({ data: null })
  ctx.core.screenshots.capturer = async () => PNG
  return ctx
}

test('upload: sends the PNG with the agent token, then deletes the local copy', async () => {
  const portal = await fakePortal(() => ({ status: 200, body: { ok: true } }))
  try {
    const { core, dir } = liveWithPortal(portal.url)
    await core.login('d@x.in', 'pw')
    core.punch('in')
    await core.screenshots.maybeCapture()
    const before = fs.readdirSync(path.join(dir, 'screenshots'))
    assert.equal(before.length, 1)
    assert.equal((await core.syncNow()).ok, true)
    assert.equal(portal.calls.length, 1)
    const c = portal.calls[0]
    assert.equal(c.url, '/api/agent/screenshot')
    assert.equal(c.headers.authorization, 'Bearer tok-123')
    assert.equal(c.headers['x-shot-id'], core.store.data.screenshots[0].id)
    assert.deepEqual(c.body, PNG)
    assert.equal(fs.readdirSync(path.join(dir, 'screenshots')).length, 0, 'local copy removed after upload')
    assert.equal(core.state().screenshots.upload.uploaded, 1)
  } finally { portal.server.close() }
})

test('upload: retries on 5xx, gives up on 403, never uploads without a portal URL', async () => {
  let mode = 500
  const portal = await fakePortal(() => ({ status: mode }))
  try {
    const { core } = liveWithPortal(portal.url)
    await core.login('d@x.in', 'pw')
    core.punch('in')
    await core.screenshots.maybeCapture()
    await core.syncNow()
    assert.equal(core.state().screenshots.upload.waiting, 1, '5xx keeps it queued')
    assert.equal(core.state().pending >= 1, true)
    mode = 403
    await core.syncNow()
    const u = core.state().screenshots.upload
    assert.equal(u.failed, 1, '403 is permanent')
    assert.equal(u.waiting, 0)
  } finally { portal.server.close() }

  const none = liveWithPortal('')
  await none.core.login('d@x.in', 'pw')
  none.core.punch('in')
  await none.core.screenshots.maybeCapture()
  await none.core.syncNow()
  assert.equal(none.core.state().screenshots.upload.configured, false)
  assert.equal(fs.readdirSync(path.join(none.dir, 'screenshots')).length, 1, 'stays local')
})
