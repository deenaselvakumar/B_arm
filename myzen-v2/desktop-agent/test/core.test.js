const test = require('node:test')
const assert = require('node:assert/strict')
const { makeCore } = require('./helpers')

const MIN = 60000

test('demo mode: login rejects unknown accounts', async () => {
  const { core } = makeCore()
  await assert.rejects(core.login('nobody@example.com', 'x'), /Demo mode/)
  await assert.rejects(core.login('', ''), /Enter your email/)
})

test('punch / break / log-time rules', async () => {
  const { core } = makeCore()
  assert.throws(() => core.punch('in'), /log in/)
  await core.login('deena.s@barm.in', 'x')
  assert.throws(() => core.startBreak(), /Punch in/)
  core.punch('in')
  assert.throws(() => core.punch('in'), /already punched in/)
  core.startBreak()
  assert.throws(() => core.startBreak(), /already in progress/)
  core.endBreak()
  assert.throws(() => core.endBreak(), /No break/)
  assert.throws(() => core.logTime({ date: '2099-01-01', hours: 1, description: 'x' }), /future/)
  assert.throws(() => core.logTime({ date: '2026-10-29', hours: 30, description: 'x' }), /between 0 and 24/)
  assert.throws(() => core.logTime({ date: '2026-10-29', start: '10:00', end: '09:00', description: 'x' }), /after start/)
  assert.throws(() => core.logTime({ date: '2026-10-29', hours: 1, description: ' ' }), /description/)
  const e = core.logTime({ date: '2026-10-29', start: '10:00', end: '11:30', description: 'workshop' })
  assert.equal(e.hours, 1.5)
  core.punch('out')
  assert.throws(() => core.punch('out'), /not punched in/)
})

test('monitor only records while punched in and off break; classifies and computes productivity', async () => {
  const { core, source, now } = makeCore()
  await core.login('chandru.p@barm.in', 'x')
  await core.monitor.tick()
  now.advance(10 * MIN)
  await core.monitor.tick()
  assert.equal(core.monitor.getStats().online, 0, 'nothing recorded before punch in')

  core.punch('in')
  const rules = [
    { type: 'app', pattern: 'visual studio code', category: 'productive' },
    { type: 'domain', pattern: 'youtube.com', category: 'unproductive' },
  ]
  core.store.session.rules = rules
  await core.monitor.tick()                         // starts a VS Code session
  now.advance(30 * MIN); await core.monitor.tick()
  source.win = { app: 'Google Chrome', url: 'https://www.youtube.com/watch?v=abc&token=secret' }
  await core.monitor.tick()                         // closes VS Code, opens YouTube
  now.advance(10 * MIN); await core.monitor.tick()
  source.idle = 600                                 // idle
  await core.monitor.tick()
  now.advance(10 * MIN); await core.monitor.tick()
  core.startBreak()                                 // break: monitor must stop
  now.advance(15 * MIN); await core.monitor.tick()
  core.endBreak()

  const s = core.monitor.getStats()
  assert.equal(s.online, 50)
  assert.equal(s.productive, 30)
  assert.equal(s.unproductive, 10)
  assert.equal(s.idle, 10)
  assert.equal(s.breaks, 15)
  assert.equal(s.pct, 60)

  const sessions = core.store.data.sessions
  assert.ok(sessions.every((x) => !('title' in x)), 'window titles are never stored')
  const yt = sessions.find((x) => x.url)
  assert.equal(yt.url, 'youtube.com', 'only the host is stored, not path or query')
})

test('punch out auto-ends an open break and survives restart', async () => {
  const a = makeCore()
  await a.core.login('arun.k@barm.in', 'x')
  a.core.punch('in'); a.core.startBreak(); a.core.punch('out')
  assert.equal(a.core.state().onBreak, false)
  const b = makeCore({ dir: a.dir, now: a.now })
  const st = b.core.state()
  assert.equal(st.employee.name, 'Arun Kumar')
  assert.equal(st.punchedIn, false)
  assert.equal(b.core.history(7)[0].breakMin >= 0, true)
})

test('live counters: working time excludes breaks; log summary counts today\'s sessions', async () => {
  const { core, source, now } = makeCore()
  await core.login('deena.s@barm.in', 'x')
  core.punch('in')
  await core.monitor.tick()
  now.advance(30 * MIN); await core.monitor.tick()
  core.startBreak(); now.advance(10 * MIN)
  let s = core.state()
  assert.equal(s.totals.workedMs, 30 * MIN)
  assert.equal(s.totals.breakMs, 10 * MIN, 'open break counts up')
  core.endBreak()
  await core.monitor.tick(); now.advance(20 * MIN)
  s = core.state()
  assert.equal(s.totals.workedMs, 50 * MIN)
  assert.equal(s.totals.breakMs, 10 * MIN)
  const logs = core.logs()
  assert.equal(logs.count, s.logCount)
  assert.ok(logs.count >= 2)
  assert.equal(logs.logs.filter((l) => l.live).length, 1)
  assert.ok(logs.topApps[0].app)
})
