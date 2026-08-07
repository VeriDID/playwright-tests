// Single source of truth for the "which environment did we test?" label.
// Derives an UPPERCASE tag + display name + host from DEMO_URL so every
// deliverable (reports, Slack, screenshots, results JSON, video) can be stamped
// per-environment and demo/staging artifacts never overwrite each other.
//   import { envInfo } from './env-label.mjs'
//   const ENV = envInfo()   // { tag:'STAGING', name:'Staging', host:'staging.digicred.services' }
export function envInfo(url = process.env.DEMO_URL) {
  const raw = (url || 'https://demo.digicred.services').toLowerCase()
  const host = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (host.includes('staging')) return { tag: 'STAGING', name: 'Staging', host }
  if (host.includes('demo')) return { tag: 'DEMO', name: 'Demo', host }
  const first = (host.split('.')[0] || 'ENV')
  return { tag: first.toUpperCase(), name: first[0].toUpperCase() + first.slice(1), host }
}
