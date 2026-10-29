// Fallback classification rules, mirroring supabase/schema.sql. With Supabase configured the agent
// uses the app_category_rules table (returned at login) so managers can change them centrally.
const DEFAULT_RULES = [
  ['app', 'Visual Studio Code', 'productive'], ['app', 'IntelliJ', 'productive'], ['app', 'PyCharm', 'productive'],
  ['app', 'Terminal', 'productive'], ['app', 'Postman', 'productive'], ['app', 'Figma', 'productive'],
  ['app', 'Jupyter', 'productive'], ['app', 'Excel', 'productive'],
  ['app', 'Slack', 'neutral'], ['app', 'Teams', 'neutral'], ['app', 'Zoom', 'neutral'], ['app', 'Outlook', 'neutral'],
  ['domain', 'github.com', 'productive'], ['domain', 'gitlab.com', 'productive'], ['domain', 'stackoverflow.com', 'productive'],
  ['domain', 'developer.mozilla.org', 'productive'], ['domain', 'supabase.com', 'productive'], ['domain', 'arxiv.org', 'productive'],
  ['domain', 'youtube.com', 'unproductive'], ['domain', 'facebook.com', 'unproductive'], ['domain', 'instagram.com', 'unproductive'],
  ['domain', 'reddit.com', 'unproductive'], ['domain', 'netflix.com', 'unproductive'], ['domain', 'x.com', 'unproductive'],
].map(([type, pattern, category]) => ({ type, pattern, category }))

function categorize(rules, app, host) {
  const list = rules && rules.length ? rules : DEFAULT_RULES
  if (host) {
    const h = host.toLowerCase()
    const hit = list.find((r) => r.type === 'domain' && (h === r.pattern || h.endsWith('.' + r.pattern)))
    if (hit) return hit.category
  }
  const a = (app || '').toLowerCase()
  const hit = list.find((r) => r.type === 'app' && a.includes(r.pattern.toLowerCase()))
  return hit ? hit.category : 'neutral'
}

// Only the host is ever stored: paths and query strings can contain personal data.
function toHost(url) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

module.exports = { DEFAULT_RULES, categorize, toHost }
