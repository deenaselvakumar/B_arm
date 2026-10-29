const fs = require('fs')
const os = require('os')
const path = require('path')
const { createCore } = require('../src/core')

// Scripted stand-in for the OS: the test decides which app is in front and whether the user is idle.
class FakeSource {
  constructor() { this.idle = 0; this.win = { app: 'Visual Studio Code', url: null } }
  getIdleSeconds() { return this.idle }
  async getActiveWindow() { return this.win }
}

function makeClock(startIso = '2026-10-29T04:00:00Z') {
  let t = Date.parse(startIso)
  const clock = () => t
  clock.advance = (ms) => { t += ms }
  return clock
}

function makeCore(overrides = {}) {
  const dir = overrides.dir || fs.mkdtempSync(path.join(os.tmpdir(), 'myzen-agent-'))
  const source = new FakeSource()
  const now = overrides.now || makeClock()
  const settings = {
    supabaseUrl: '', supabaseAnonKey: '', port: 0, timezone: 'Asia/Kolkata', idleThresholdSeconds: 120,
    checkIntervalSeconds: 5, syncIntervalSeconds: 30, machine: 'test-pc',
    screenshots: { enabled: false, teams: [], intervalMinutes: 10 }, ...overrides.settings,
  }
  const core = createCore({ dir, settings, source, now })
  return { core, source, now, dir }
}

module.exports = { FakeSource, makeClock, makeCore }
