// Shared parser for the walkthrough Playwright JSON reporter output.
// Returns honest live counts so the Word + Slack builders never post stale
// numbers. Falls back to a "results unknown" shape if the JSON is missing.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { envInfo } from './env-label.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')                       // tests/e2e
const ENV = envInfo()
// Per-environment results file so a staging run never clobbers demo's tally.
const JSON_PATH = path.join(ROOT, 'ui', 'walkthrough', `_results-${ENV.tag}.json`)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December']

/** Section code from a spec filename, e.g. "05-onboarding.spec.ts" -> "05". */
function sectionOf(file) {
  const m = path.basename(file || '').match(/^(\d\d[a-z]?)/)
  return m ? m[1] : ''
}

function collectSpecs(suite, acc) {
  for (const sp of suite.specs || []) {
    const durations = (sp.tests || []).flatMap(t => (t.results || []).map(r => r.duration || 0))
    acc.push({
      section: sectionOf(sp.file || suite.file || ''),
      title: sp.title,
      ok: !!sp.ok,
      status: sp.tests?.[0]?.results?.slice(-1)?.[0]?.status || (sp.ok ? 'passed' : 'failed'),
      duration: durations.reduce((a, b) => Math.max(a, b), 0),
    })
  }
  for (const c of suite.suites || []) collectSpecs(c, acc)
}

export function loadWalkthroughResults() {
  const now = new Date()
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  if (!fs.existsSync(JSON_PATH)) {
    return { available: false, dateStr, env: ENV, passed: 0, failed: 0, skipped: 0, total: 0, durationMin: '—', specs: [], bySection: {} }
  }
  const r = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
  const specs = []
  for (const s of r.suites || []) collectSpecs(s, specs)
  const skipped = specs.filter(s => s.status === 'skipped').length
  const failed = specs.filter(s => !s.ok && s.status !== 'skipped').length
  const passed = specs.filter(s => s.ok && s.status !== 'skipped').length
  const total = specs.length
  const durMs = (r.stats?.duration) || specs.reduce((a, s) => a + s.duration, 0)
  const durationMin = `${(durMs / 60000).toFixed(1)}m`
  const bySection = {}
  for (const s of specs) if (s.section) bySection[s.section] = s
  return { available: true, dateStr, env: ENV, passed, failed, skipped, total, durationMin, specs, bySection }
}

/** "5.9s" style. */
export function fmtDur(ms) {
  if (!ms) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}
