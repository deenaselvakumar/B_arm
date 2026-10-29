const TIMEOUT_MS = 15000

// Thin wrapper over the agent_* SQL functions (see supabase/schema.sql). Uses only the PUBLIC anon key;
// authority comes from the per-employee token returned by agent_login.
//
// This talks to PostgREST with plain fetch instead of @supabase/supabase-js: the agent only needs RPC calls,
// and supabase-js constructs a Realtime client that requires a native WebSocket (Node 22+), which crashes on
// Electron 27 (Node 18) and Node 20. Global fetch exists from Node 18, so nothing extra is required.
class Cloud {
  constructor({ url, key }) {
    this.enabled = !!(url && key)
    this.base = this.enabled ? `${String(url).replace(/\/+$/, '')}/rest/v1/rpc/` : null
    this.key = key
  }

  async _rpc(fn, args) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(this.base + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.key, Authorization: `Bearer ${this.key}` },
        body: JSON.stringify(args),
        signal: ctrl.signal,
      })
      const text = await res.text()
      let body = null
      if (text) {
        try { body = JSON.parse(text) } catch { body = null }
      }
      if (!res.ok) return { error: { code: 'rpc', message: body?.message || `HTTP ${res.status}` } }
      if (body && body.error) return { error: { code: body.error, message: body.error } }
      return { data: body }
    } catch (e) {
      return { error: { code: 'network', message: e.name === 'AbortError' ? 'Request timed out' : e.message } }
    } finally {
      clearTimeout(timer)
    }
  }

  login(email, password, machine) {
    return this._rpc('agent_login', { p_email: email, p_password: password, p_machine: machine })
  }
  sync(token, payload) {
    return this._rpc('agent_sync', { p_token: token, p_payload: payload })
  }
  history(token, days = 30) {
    return this._rpc('agent_history', { p_token: token, p_days: days })
  }
  logout(token) {
    return this._rpc('agent_logout', { p_token: token })
  }
}

module.exports = { Cloud }
