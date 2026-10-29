const express = require('express')
const fs = require('fs')
const path = require('path')
const { RuleError } = require('./store')

// Loopback-only UI/API for the agent window. No CORS: only the app's own window talks to it.
function createServer(core) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '50kb' }))

  const allowedHosts = new Set([`127.0.0.1:${core.settings.port}`, `localhost:${core.settings.port}`])
  app.use((req, res, next) => {
    if (!allowedHosts.has(req.headers.host)) return res.status(403).json({ error: 'Forbidden host' })
    if (req.method !== 'GET' && req.headers.origin && !allowedHosts.has(new URL(req.headers.origin).host)) {
      return res.status(403).json({ error: 'Forbidden origin' })
    }
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })

  const html = () => fs.readFileSync(path.join(__dirname, 'ui', 'index.html'), 'utf8')
  const page = (_req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'")
    res.type('html').send(html())
  }
  app.get('/', page)
  app.get('/ui', page)

  const wrap = (fn) => async (req, res) => {
    try {
      const out = await fn(req, res)
      res.json(out ?? { ok: true })
    } catch (e) {
      if (e instanceof RuleError) return res.status(e.code).json({ error: e.message, pending: e.pending })
      console.error('[agent]', e)
      res.status(500).json({ error: 'Something went wrong in the agent.' })
    }
  }

  app.post('/api/login', wrap(async (req) => ({ employee: await core.login(req.body?.email, req.body?.password) })))
  app.post('/api/logout', wrap(async (req) => core.logout({ force: !!req.body?.force })))
  app.get('/api/state', wrap(() => core.state()))
  app.post('/api/punch', wrap((req) => { core.punch(req.body?.type); return core.state() }))
  app.post('/api/break', wrap((req) => {
    if (req.body?.action === 'start') core.startBreak()
    else if (req.body?.action === 'end') core.endBreak()
    else throw new RuleError('Invalid break action.', 400)
    return core.state()
  }))
  app.post('/api/log-time', wrap((req) => ({ entry: core.logTime(req.body || {}) })))
  app.get('/api/history', wrap((req) => ({ days: core.history(Math.min(60, Number(req.query.days) || 14)) })))
  app.get('/api/stats', wrap(() => core.state().stats))
  app.get('/api/status', wrap(() => {
    const s = core.state()
    return { mode: s.mode, pending: s.pending, sync: s.sync, screenshots: s.screenshots }
  }))
  app.get('/api/sessions', wrap((req) => {
    if (!core.store.employee) throw new RuleError('Please log in first.', 401)
    const limit = Math.min(200, Number(req.query.limit) || 50)
    return { sessions: core.store.data.sessions.slice(-limit).reverse() }
  }))

  return app
}

function listen(core) {
  return new Promise((resolve, reject) => {
    const server = createServer(core).listen(core.settings.port, '127.0.0.1', () => resolve(server))
    server.on('error', reject)
  })
}

module.exports = { createServer, listen }
