// Runs the REAL supabase/schema.sql in an in-process Postgres (PGlite) behind a tiny PostgREST-style
// /rest/v1/rpc/<fn> endpoint, then drives the agent core against it as the anon role.
const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { makeCore } = require('./helpers')

const SIGS = {
  agent_login: [['p_email', 'text'], ['p_password', 'text'], ['p_machine', 'text']],
  agent_sync: [['p_token', 'text'], ['p_payload', 'jsonb']],
  agent_history: [['p_token', 'text'], ['p_days', 'int']],
  agent_logout: [['p_token', 'text']],
}

let db, server, url, offline = false
const MIN = 60000

test.before(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`)
  await db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'schema.sql'), 'utf8'))
  await db.exec(`insert into employees (email, name, department, role) values ('deena.s@barm.in','Deena Selvakumar','Engineering','Dev');
                 select set_employee_password('deena.s@barm.in', 'secret-pw');`)

  server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      if (offline) return req.socket.destroy()
      const fn = req.url.split('/rpc/')[1]
      const sig = SIGS[fn]
      if (!sig) { res.writeHead(404); return res.end('{}') }
      const args = JSON.parse(body || '{}')
      const params = sig.map(([n, t], i) => `$${i + 1}::${t}`).join(', ')
      const values = sig.map(([n, t]) => (t === 'jsonb' ? JSON.stringify(args[n]) : args[n]))
      try {
        await db.exec('set role anon')
        const r = await db.query(`select ${fn}(${params}) as r`, values)
        res.writeHead(r.rows[0].r === null ? 204 : 200, { 'content-type': 'application/json' })
        res.end(r.rows[0].r === null ? '' : JSON.stringify(r.rows[0].r))
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ message: e.message }))
      } finally {
        await db.exec('reset role')
      }
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  url = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => { server.close(); await db.close() })

const live = (o = {}) => makeCore({ ...o, settings: { supabaseUrl: url, supabaseAnonKey: 'anon-key', ...o.settings } })
const q = async (sql, p) => (await db.query(sql, p)).rows

test('wrong password is rejected; right password syncs the full day to Supabase', async () => {
  const { core, source, now } = live()
  await assert.rejects(core.login('deena.s@barm.in', 'nope'), /Invalid email or password/)
  await core.login('deena.s@barm.in', 'secret-pw')
  assert.equal((await q(`select count(*)::int c from agent_tokens where token_hash = $1`, [core.store.session.token]))[0].c, 0, 'token is stored hashed')

  core.punch('in')
  await core.monitor.tick(); now.advance(20 * MIN)
  await core.monitor.tick()
  core.startBreak(); now.advance(5 * MIN); core.endBreak()
  await core.monitor.tick(); now.advance(10 * MIN)
  core.logTime({ date: '2026-10-29', hours: 1, description: 'client call' })
  core.punch('out')
  const r = await core.syncNow()
  assert.ok(r.ok, JSON.stringify(r))
  assert.equal(core.store.pendingCount(), 0)

  assert.deepEqual((await q(`select punch_type from attendance_punches order by punch_time`)).map((x) => x.punch_type), ['in', 'out'])
  assert.equal((await q(`select count(*)::int c from breaks`))[0].c, 1)
  assert.equal((await q(`select count(*)::int c from timesheet_entries`))[0].c, 1)
  assert.ok((await q(`select count(*)::int c from activity_sessions`))[0].c >= 1)
  assert.equal((await q(`select count(*)::int c from daily_stats`))[0].c, 1)

  await core.syncNow()
  assert.equal((await q(`select count(*)::int c from attendance_punches`))[0].c, 2, 're-sync is idempotent')
})

test('offline: data queues locally and flushes when the network returns; logout refuses to drop it', async () => {
  const { core, now } = live()
  await core.login('deena.s@barm.in', 'secret-pw')
  const before = (await q(`select count(*)::int c from timesheet_entries`))[0].c
  offline = true
  core.logTime({ date: '2026-10-29', hours: 2, description: 'offline work' })
  const r = await core.syncNow()
  assert.ok(r.error)
  assert.ok(core.store.pendingCount() >= 1)
  await assert.rejects(core.logout(), /have not synced/)
  offline = false
  await core.syncNow()
  assert.equal(core.store.pendingCount(), 0)
  assert.equal((await q(`select count(*)::int c from timesheet_entries`))[0].c, before + 1)
  await core.logout()
  assert.equal(core.state().employee, null)
})

test('a second PC gets today\'s history from Supabase at login', async () => {
  const { core } = live()
  await core.login('deena.s@barm.in', 'secret-pw')
  assert.ok(core.history(30).some((d) => d.manual.length > 0), 'manual entries restored from the server')
  assert.ok(core.store.data.punches.length >= 2)
})

test('invalid token is refused and marks the session expired', async () => {
  const { core } = live()
  await core.login('deena.s@barm.in', 'secret-pw')
  await db.exec('delete from agent_tokens')
  core.logTime({ date: '2026-10-29', hours: 1, description: 'x' })
  const r = await core.syncNow()
  assert.equal(r.error.code, 'unauthorized')
  assert.equal(core.state().sync.expired, true)
})

test('anon sees no rows (RLS) and cannot call privileged functions directly', async () => {
  await db.exec('set role anon')
  try {
    assert.equal((await db.query('select * from employees')).rows.length, 0, 'RLS hides every row from anon')
    assert.equal((await db.query('select * from agent_tokens')).rows.length, 0)
    await assert.rejects(db.query(`select * from verify_employee_login('deena.s@barm.in','secret-pw')`), /permission denied/)
    await assert.rejects(db.query(`select agent_employee('x')`), /permission denied/)
  } finally {
    await db.exec('reset role')
  }
})
