// Activity sources. The monitor only ever asks two questions: "which app (and site) is in front?"
// and "how long since the last mouse/keyboard input?". Neither answer contains any typed content.

class RealSource {
  // getIdleSeconds comes from Electron's powerMonitor.getSystemIdleTime(): an OS idle timer, not a key logger.
  constructor({ getIdleSeconds } = {}) {
    this.idleFn = getIdleSeconds
    this.activeWin = null
    this.failed = false
  }

  getIdleSeconds() {
    return this.idleFn ? this.idleFn() : 0
  }

  async getActiveWindow() {
    if (this.failed) return null
    try {
      this.activeWin ??= require('active-win')
      const w = await this.activeWin()
      // Window titles are deliberately dropped. `url` is only provided by active-win on macOS.
      return w ? { app: w.owner?.name || 'Unknown', url: w.url || null } : null
    } catch (e) {
      this.failed = true
      console.warn('[agent] active-win unavailable, falling back to no window info:', e.message)
      return null
    }
  }
}

// Generates plausible work patterns so the agent can be demoed on any OS (including headless Linux).
class SimulatedSource {
  constructor({ fast = false, rand = Math.random } = {}) {
    this.fast = fast
    this.rand = rand
    this.phase = null
    this.until = 0
  }

  static PHASES = [
    { w: 0.34, app: 'Visual Studio Code', url: null },
    { w: 0.1, app: 'Terminal', url: null },
    { w: 0.1, app: 'Google Chrome', url: 'https://github.com/barm/myzen' },
    { w: 0.07, app: 'Google Chrome', url: 'https://stackoverflow.com/questions/1' },
    { w: 0.12, app: 'Slack', url: null },
    { w: 0.05, app: 'Microsoft Teams', url: null },
    { w: 0.06, app: 'Google Chrome', url: 'https://www.youtube.com/watch?v=x' },
    { w: 0.16, app: null, url: null, idle: true },
  ]

  _advance() {
    const now = Date.now()
    if (this.phase && now < this.until) return
    let r = this.rand()
    this.phase = SimulatedSource.PHASES.find((p) => (r -= p.w) < 0) || SimulatedSource.PHASES[0]
    const [lo, hi] = this.fast ? [6, 20] : [3 * 60, 18 * 60]
    this.until = now + (lo + this.rand() * (hi - lo)) * 1000
  }

  // 1x1 placeholder image so the screenshot pipeline can be demoed without a display.
  async captureScreen() {
    return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
  }

  getIdleSeconds() {
    this._advance()
    return this.phase.idle ? 9999 : 1
  }

  async getActiveWindow() {
    this._advance()
    return this.phase.idle ? { app: 'Visual Studio Code', url: null } : { app: this.phase.app, url: this.phase.url }
  }
}

module.exports = { RealSource, SimulatedSource }
