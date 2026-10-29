#!/usr/bin/env node
// Runs the agent without Electron (servers, CI, demos). Flags: --simulate (fake activity), --fast (short phases).
const { dataDir, loadEnv, settings } = require('./paths')
process.on('unhandledRejection', (e) => console.error('[agent] unhandled rejection:', e))
const dir = dataDir(null)
loadEnv(dir)

const { createCore } = require('./core')
const { listen } = require('./server')
const { RealSource, SimulatedSource } = require('./sources')

const args = new Set(process.argv.slice(2))
const cfg = settings()
const source = args.has('--simulate') ? new SimulatedSource({ fast: args.has('--fast') }) : new RealSource()
const core = createCore({ dir, settings: cfg, source })

listen(core)
  .then((server) => {
    core.start()
    console.log(`[agent] ${core.cloud.enabled ? 'Supabase' : 'demo'} mode, ${args.has('--simulate') ? 'simulated' : 'real'} activity`)
    console.log(`[agent] open http://127.0.0.1:${cfg.port}/ui`)
    const quit = async () => { await core.stop(); server.close(); process.exit(0) }
    process.on('SIGINT', quit)
    process.on('SIGTERM', quit)
  })
  .catch((e) => {
    console.error('[agent] could not start:', e.code === 'EADDRINUSE' ? `port ${cfg.port} is in use (set AGENT_PORT)` : e.message)
    process.exit(1)
  })
