// Test double for Supabase: runs the REAL supabase/schema.sql + seed.sql in an in-process Postgres (PGlite) and
// speaks just enough PostgREST + Storage HTTP for the portal and the agent. Used only by `npm run e2e`.
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SERVICE_KEY = 'service-key'
export const ANON_KEY = 'anon-key'

const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw new Error(`bad identifier ${s}`)
  return `"${s}"`
}

function filterSql(key, val, params) {
  const m = /^(eq|neq|gte|gt|lte|lt|in|is)\.(.*)$/.exec(val)
  if (!m) throw new Error(`unsupported filter ${key}=${val}`)
  const [, op, v] = m
  const col = ident(key)
  if (op === 'in') {
    const items = v.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, ''))
    params.push(items)
    return `${col}::text = any($${params.length}::text[])`
  }
  if (op === 'is') return `${col} is ${v === 'null' ? 'null' : v}`
  params.push(v)
  const sym = { eq: '=', neq: '<>', gte: '>=', gt: '>', lte: '<=', lt: '<' }[op]
  return `${col} ${sym} $${params.length}`
}

export async function startShim({ port = 4020 } = {}) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`)
  await db.exec(readFileSync(join(root, 'supabase/schema.sql'), 'utf8'))
  await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'))
  const objects = new Map()
  let queue = Promise.resolve()
  const serial = (fn) => (queue = queue.then(fn, fn))

  const roleOf = (req) => ((req.headers.apikey === SERVICE_KEY || (req.headers.authorization || '') === `Bearer ${SERVICE_KEY}`) ? 'service_role' : 'anon')
  const json = (res, status, body, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...extra }); res.end(body === undefined ? '' : JSON.stringify(body)) }

  async function asRole(role, fn) {
    await db.exec(`set role ${role}`)
    try { return await fn() } finally { await db.exec('reset role') }
  }

  async function handleRpc(req, res, name, body) {
    const args = JSON.parse(body || '{}')
    const keys = Object.keys(args)
    const params = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
    const call = `${ident(name)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ')})`
    try {
      const r = await asRole(roleOf(req), () => db.query(`select * from ${call}`, params))
      const cols = r.fields.map((f) => f.name)
      if (cols.length === 1 && cols[0] === name) return json(res, 200, r.rows[0][name] ?? null)
      return json(res, 200, r.rows)
    } catch (e) {
      return json(res, 400, { message: e.message })
    }
  }

  async function handleTable(req, res, table, u, body) {
    const role = roleOf(req)
    const params = []
    const where = []
    let order = '', limit = '', offset = '', select = '*'
    for (const [k, v] of u.searchParams) {
      if (k === 'select') select = v
      else if (k === 'order') order = ' order by ' + v.split(',').map((o) => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}` }).join(', ')
      else if (k === 'limit') limit = ` limit ${Number(v)}`
      else if (k === 'offset') offset = ` offset ${Number(v)}`
      else if (k === 'on_conflict' || k === 'columns') continue
      else where.push(filterSql(k, v, params))
    }
    const cols = select === '*' ? '*' : select.split(',').map((c) => ident(c.trim())).join(', ')
    const w = where.length ? ` where ${where.join(' and ')}` : ''
    try {
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (req.method === 'HEAD') {
          const c = await asRole(role, () => db.query(`select count(*)::int n from ${ident(table)}${w}`, params))
          return json(res, 200, undefined, { 'content-range': `*/${c.rows[0].n}` })
        }
        const r = await asRole(role, () => db.query(`select ${cols} from ${ident(table)}${w}${order}${limit}${offset}`, params))
        if ((req.headers.accept || '').includes('vnd.pgrst.object')) {
          if (r.rows.length !== 1) return json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
          return json(res, 200, r.rows[0])
        }
        return json(res, 200, r.rows)
      }
      if (req.method === 'POST') {
        const rows = [].concat(JSON.parse(body))
        const keys = Object.keys(rows[0])
        const vals = []
        const tuples = rows.map((row) => `(${keys.map((k) => { vals.push(row[k]); return `$${vals.length}` }).join(', ')})`)
        const conflict = u.searchParams.get('on_conflict')
        const merge = (req.headers.prefer || '').includes('merge-duplicates')
        const tail = conflict && merge ? ` on conflict (${ident(conflict)}) do update set ${keys.filter((k) => k !== conflict).map((k) => `${ident(k)} = excluded.${ident(k)}`).join(', ')}` : ''
        await asRole(role, () => db.query(`insert into ${ident(table)} (${keys.map(ident).join(', ')}) values ${tuples.join(', ')}${tail}`, vals))
        return json(res, 201, undefined)
      }
    } catch (e) {
      return json(res, 400, { message: e.message })
    }
    return json(res, 405, { message: 'method' })
  }

  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => serial(async () => {
      const raw = Buffer.concat(chunks)
      const u = new URL(req.url, 'http://x')
      if (u.pathname === '/__sql') return json(res, 200, (await db.query(raw.toString())).rows)
      const rpc = /^\/rest\/v1\/rpc\/(\w+)$/.exec(u.pathname)
      if (rpc) return handleRpc(req, res, rpc[1], raw.toString())
      const tbl = /^\/rest\/v1\/(\w+)$/.exec(u.pathname)
      if (tbl) return handleTable(req, res, tbl[1], u, raw.toString())
      const obj = /^\/storage\/v1\/object\/(?:authenticated\/)?([\w-]+)\/(.+)$/.exec(u.pathname)
      if (obj) {
        if (roleOf(req) !== 'service_role') return json(res, 403, { message: 'storage requires service role' })
        const key = `${obj[1]}/${decodeURIComponent(obj[2])}`
        if (req.method === 'POST' || req.method === 'PUT') {
          objects.set(key, { bytes: raw, type: req.headers['content-type'] })
          return json(res, 200, { Key: key })
        }
        if (req.method === 'GET') {
          const o = objects.get(key)
          if (!o) return json(res, 404, { message: 'Object not found' })
          res.writeHead(200, { 'content-type': o.type || 'application/octet-stream' })
          return res.end(o.bytes)
        }
      }
      return json(res, 404, { message: `no route ${req.method} ${u.pathname}` })
    }))
  })
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${port}`, db, objects, close: async () => { server.close(); await db.close() } }
}
