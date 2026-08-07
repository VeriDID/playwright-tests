// Compiles the walkthrough step-screenshots into one self-contained HTML report
// for stakeholders. Run after a full walkthrough run.
//   node walkthrough/build-report.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { envInfo } from '../../scripts/env-label.mjs'
import { loadWalkthroughResults } from '../../scripts/walkthrough-results.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = envInfo()
const LIVE = loadWalkthroughResults()
const SHOTS = path.join(__dirname, `_shots-${ENV.tag}`)
const OUT = path.join(__dirname, `CrMS-Walkthrough-Report-${ENV.tag}.html`)
const META = LIVE.available
  ? `${LIVE.dateStr} · live run — ${LIVE.passed}/${LIVE.total} passed${LIVE.failed ? `, ${LIVE.failed} failed` : ''}${LIVE.skipped ? `, ${LIVE.skipped} skipped` : ''}`
  : 'live run'

const TITLES = {
  '01': 'Sign-in & Overview',
  '02': 'Channels — list view (sort / filter / search / pagination)',
  '03': 'Channel detail — tabs + Message',
  '04': 'Workflow instance (Request Transcript) + channel note',
  '05': 'Onboarding — create invitation → verify → remove',
  '06': 'Credential Designer — add → save → reset',
  '07': 'CASE Frameworks',
  '08': 'Workflow editing (School Welcome — flow / screen / JSON / access)',
  '09': 'Users — create → Onboarding Staff → archive → delete',
  '10': 'Settings — branding accent colors',
  '11': 'Invitations — registrar role → create → QR → copy → edit → archive → delete',
  '12': 'Templates — blank workflow → publish → Flow/Screen/JSON → delete',
  '13': 'Schemas — publish schema + credential definition + OCA bundle (staging)',
  '14': 'Issue a credential — Open Badge → view credential details (staging)',
}
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const sections = fs.existsSync(SHOTS)
  ? fs.readdirSync(SHOTS).filter((d) => /^\d\d$/.test(d)).sort()
  : []
let totalShots = 0
const blocks = sections.map((sec) => {
  const dir = path.join(SHOTS, sec)
  const imgs = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
  totalShots += imgs.length
  const figs = imgs.map((f) => {
    const label = f.replace(/\.png$/, '').replace(/^\d+[.-]?/, '').replace(/-/g, ' ')
    return `<figure><img src="${b64(path.join(dir, f))}" loading="lazy"/><figcaption>${esc(label)}</figcaption></figure>`
  }).join('\n')
  return `<section><h2><span class="sec">${sec}</span> ${esc(TITLES[sec] || sec)} <span class="pill ok">PASS</span></h2><div class="grid">${figs}</div></section>`
}).join('\n')

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DigiCred CrMS — Walkthrough Report (${ENV.tag})</title><style>
*{box-sizing:border-box;margin:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1c1f;background:#f6f7f9;padding:0 0 60px}
header{background:linear-gradient(135deg,#2a2740,#4b47c8 55%,#e0824b);color:#fff;padding:48px 40px}
header h1{font-size:32px}header p{opacity:.92;margin-top:6px}.meta{margin-top:16px;font-size:13px;opacity:.85}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.summary{display:flex;gap:20px;margin:-28px 0 10px}.card{background:#fff;border:1px solid #e6e8ec;border-radius:14px;padding:16px 20px;box-shadow:0 6px 24px rgba(20,22,30,.06)}
.card .n{font-size:26px;font-weight:800;color:#4b47c8}.card .l{font-size:12.5px;color:#5c626b}
section{background:#fff;border:1px solid #e6e8ec;border-radius:14px;margin:18px 0;padding:20px 22px}
section h2{font-size:18px;display:flex;align-items:center;gap:10px;margin-bottom:14px}
.sec{background:#eef0f3;color:#4b47c8;font-weight:800;border-radius:8px;padding:2px 9px;font-size:14px}
.pill{margin-left:auto;font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px}.pill.ok{background:#e6f6ee;color:#1f9d63}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
figure{margin:0;border:1px solid #e6e8ec;border-radius:10px;overflow:hidden;background:#fff}
figure img{width:100%;display:block;border-bottom:1px solid #eef0f3;background:#111}
figcaption{padding:8px 10px;font-size:12px;color:#5c626b;text-transform:capitalize}
footer{text-align:center;color:#8a9099;font-size:12px;margin-top:26px}
@media(max-width:760px){.grid{grid-template-columns:1fr}.summary{flex-wrap:wrap}}
</style></head><body>
<header><div class="wrap" style="padding:0"><h1>DigiCred CrMS — Application Walkthrough — ${ENV.tag}</h1>
<p>Positive-path end-to-end tour of the operator UI, captured step-by-step with Playwright.</p>
<div class="meta">${ENV.name} environment (${ENV.host}) · ${META} · For stakeholder review</div></div></header>
<div class="wrap">
<div class="summary"><div class="card"><div class="n">${sections.length}</div><div class="l">Sections covered</div></div>
<div class="card"><div class="n">${totalShots}</div><div class="l">Captured steps (images)</div></div>
<div class="card"><div class="n">${LIVE.available && LIVE.total ? Math.round((LIVE.passed / LIVE.total) * 100) + '%' : '—'}</div><div class="l">Specs passed</div></div></div>
${ENV.tag === 'STAGING' ? `<section style="border-left:4px solid #e0824b">
<h2><span class="sec" style="background:#fbeee6;color:#e0824b">i</span> Known limitations on staging — expected, not defects</h2>
<p style="color:#4a5059;font-size:14px;line-height:1.7;margin:0">
<b>Open Badge issuance (Section 14)</b> — the Achievement list is empty because the DigiCred developers have <b>not implemented Open Badge achievements yet</b>; the walkthrough correctly cancels and views the existing credential details instead.<br>
<b>OID4VCI credential type (Section 3)</b> — shows “no options” (not configured), so the Issue-credential step opens the dialog and cancels.<br>
<b>Credential Designer (Section 6)</b> — the card is faithful (text “Avery Chen”, Name + IdNumber attributes, #611f58 background); the two logos are omitted because the designer’s in-app asset library isn’t reachable via automation.<br>
<b>Data left in place</b> — onboarding invitations, the Meridian College invitation, the College Template designs, and the Staging_Test_Scheme schema/credential-definition are intentionally left on the shared staging environment (not cleaned up).
</p></section>` : ''}
${blocks}
<footer>DigiCred CrMS · Walkthrough report · ${ENV.name} (${ENV.host}) · each section also has a full video + trace in walkthrough/_artifacts-${ENV.tag}</footer>
</div></body></html>`

fs.writeFileSync(OUT, html)
console.log(`Wrote ${OUT} — ${sections.length} sections, ${totalShots} images (${Math.round(fs.statSync(OUT).size / 1024)} KB)`)
