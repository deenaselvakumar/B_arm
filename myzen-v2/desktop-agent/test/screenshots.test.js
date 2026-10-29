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

test('team allowlist is enforced', async () => {
  const { core } = withShots({ screenshots: { enabled: true, teams: ['Design'], intervalMinutes: 10 } })
  await core.login('deena.s@barm.in', 'x')
  core.punch('in')
  assert.match(core.screenshots.policy().reason, /allowlist/)
  assert.equal(await core.screenshots.maybeCapture(), null)
})
