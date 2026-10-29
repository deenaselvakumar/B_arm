const fs = require('fs')
const os = require('os')
const path = require('path')

// Packaged apps live in a read-only folder, so mutable state goes to a per-user data dir.
function dataDir(electronApp) {
  const dir =
    process.env.MYZEN_DATA_DIR ||
    (electronApp ? path.join(electronApp.getPath('userData'), 'data') : path.join(__dirname, '..', 'data'))
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function loadEnv(dir) {
  const dotenv = require('dotenv')
  for (const p of [path.join(process.cwd(), '.env'), path.join(dir, '..', '.env'), path.join(dir, '.env')]) {
    if (fs.existsSync(p)) dotenv.config({ path: p })
  }
}

const env = (...names) => names.map((n) => process.env[n]).find(Boolean) || ''

function settings() {
  return {
    supabaseUrl: env('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    portalUrl: (process.env.MYZEN_PORTAL_URL || '').replace(/\/+$/, ''),
    port: Number(process.env.AGENT_PORT || 3001),
    timezone: process.env.AGENT_TIMEZONE || 'Asia/Kolkata',
    idleThresholdSeconds: Number(process.env.IDLE_THRESHOLD_SECONDS || 120),
    checkIntervalSeconds: Number(process.env.CHECK_INTERVAL_SECONDS || 5),
    syncIntervalSeconds: Number(process.env.SYNC_INTERVAL_SECONDS || 30),
    screenshots: {
      enabled: process.env.ENABLE_SCREENSHOTS === 'true',
      teams: (process.env.SCREENSHOT_TEAMS || '').split(',').map((s) => s.trim()).filter(Boolean),
      intervalMinutes: Number(process.env.SCREENSHOT_INTERVAL_MINUTES) || null,
    },
    machine: os.hostname(),
  }
}

module.exports = { dataDir, loadEnv, settings }
