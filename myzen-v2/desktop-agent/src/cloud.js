const { createClient } = require('@supabase/supabase-js')

// Thin wrapper over the agent_* SQL functions (see supabase/schema.sql). Uses only the PUBLIC anon key;
// authority comes from the per-employee token returned by agent_login.
class Cloud {
  constructor({ url, key }) {
    this.enabled = !!(url && key)
    this.client = this.enabled ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
  }

  async _rpc(fn, args) {
    try {
      const { data, error } = await this.client.rpc(fn, args)
      if (error) return { error: { code: 'rpc', message: error.message } }
      if (data && data.error) return { error: { code: data.error, message: data.error } }
      return { data }
    } catch (e) {
      return { error: { code: 'network', message: e.message } }
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
