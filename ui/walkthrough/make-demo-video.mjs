// Reusable demo-video builder. Stitches the 10 walkthrough section videos into
// one narrated MP4 with a branded, spoken title card before each section.
// Run AFTER a full walkthrough run (needs walkthrough/_artifacts/*/video.webm):
//   node walkthrough/make-demo-video.mjs
// Requires: ffmpeg, ffprobe, say (macOS TTS), chromium (Playwright).
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'
import { envInfo } from '../../scripts/env-label.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = envInfo()
const IS_STAGING = ENV.tag === 'STAGING'
const ART = path.join(__dirname, `_artifacts-${ENV.tag}`)
const TMP = path.join(__dirname, `_video-${ENV.tag}`)
// Output name: override with OUT_NAME=... ; otherwise CrMS-Demo-<TAG>.mp4.
const OUT = path.join(__dirname, process.env.OUT_NAME || `CrMS-Demo-${ENV.tag}.mp4`)
const VOICE = process.env.DEMO_VOICE || 'Samantha'
// Section 6 is shown from tester-supplied screenshots (manual build → save → reset).
const S6_SHOTS = process.env.S6_SHOTS || path.join(process.env.HOME, 'Downloads', 'section6-shots')
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true })
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args])
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) || 2.5

const SECTIONS = [
  { n: 'intro', num: '', title: 'DigiCred CrMS', sub: 'Automated end-to-end walkthrough', say: 'DigiCred CrMS. An automated end to end walkthrough of the operator platform.' },
  { n: '01', num: '01', title: 'Sign-in & Overview', sub: 'Operator console login', say: 'Section one. Signing in to the operator console and arriving at the overview dashboard.' },
  { n: '02', num: '02', title: 'Channels list', sub: 'Sort · filter · search · pagination', say: 'Section two. The channels list. Sorting every column, filtering by type and status, searching, and pagination.' },
  { n: '03', num: '03', title: 'Channel detail', sub: 'Tabs + Message', say: 'Section three. Opening a channel and viewing its overview, credentials, workflows, activity, and settings tabs.' },
  { n: '04', num: '04', title: 'Workflow instance', sub: 'Channel info · history · note', say: 'Section four. Opening a workflow run, reviewing channel info, history and instance data, and adding a channel note.' },
  { n: '05', num: '05', title: 'Onboarding', sub: 'Invitation → verify → remove', say: 'Section five. Onboarding a student. Creating an invitation, confirming it appears in channels, then removing it.' },
  { n: '06', num: '06', title: 'Credential Designer', sub: 'Build · save · reset', say: 'Section six. The credential designer. Building the card with a styled name, a photo, and a logo, saving the finished design, then resetting it for reuse.' },
  { n: '06c', num: '6B', vid: '06c', title: 'Designer — College Card', sub: 'DigiCred College · Cape Fear', say: 'Section six B. A second card design. The DigiCred College logo, the Cape Fear Community College logo, and the holder name on a solid blue card.' },
  { n: '07', num: '07', title: 'CASE Frameworks', sub: 'Academic standards', say: 'Section seven. Browsing the case academic standards frameworks.' },
  { n: '08', num: '08', title: 'Workflow editing', sub: 'Flow · screen · JSON · access', say: 'Section eight. Editing a workflow template. Its flow, screens, json, and access permissions.' },
  { n: '09', num: '09', title: 'User management', sub: 'Create → role → archive → delete', say: 'Section nine. The full user lifecycle. Create a user, assign the onboarding staff role, archive, then delete.' },
  { n: '10', num: '10', title: 'Settings — Branding', sub: 'Accent colors', say: 'Section ten. Settings. Switching the tenant branding accent colors.' },
  { n: '11', num: '11', title: 'Invitations', sub: 'Registrar · create · QR · edit · archive · delete', say: 'Section eleven. Invitations. Confirming the registrar role, creating a student invitation, viewing its QR code, copying the link, editing, archiving, then deleting it.' },
  { n: '12', num: '12', title: 'Templates', sub: 'Blank workflow · Flow / Screen / JSON · publish · delete', say: 'Section twelve. Templates. Creating a blank workflow, publishing it, then editing its flow, screen and json views, and finally deleting the template.' },
  { n: '13', num: '13', title: 'Schemas', sub: 'Publish schema · credential definition · OCA bundle', say: 'Section thirteen. Schemas. Publishing a schema with attributes, adding a credential definition with the college template design, and inspecting its o c a bundle.' },
  { n: '14', num: '14', title: 'Issue a credential', sub: 'Open Badge · credential details', say: 'Section fourteen. Issuing a credential. Choosing the open badge type, then viewing an issued credential\'s details.' },
]

// locate ALL of a section's recorded videos (a test that opens a second page —
// e.g. Section 12's fresh-page delete — records a video.webm plus video-1.webm;
// we stitch them in order so every step, including the delete, is shown).
function videosFor(n) {
  if (!fs.existsSync(ART)) return []
  const dir = fs.readdirSync(ART).find((d) => d.startsWith(`${n}-`))
  if (!dir) return []
  const webms = fs.readdirSync(path.join(ART, dir)).filter((f) => /\.webm$/.test(f))
  const main = webms.filter((f) => f === 'video.webm')
  const extra = webms.filter((f) => f !== 'video.webm').sort() // video-1.webm, video-2.webm, …
  // Ignore sub-2s stubs: a test skipped via test.skip() inside the body still
  // records a ~1s empty video; those must NOT keep an otherwise-blank section.
  return [...main, ...extra].map((f) => path.join(ART, dir, f)).filter((p) => dur(p) >= 2)
}

const cardHtml = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:1280px;height:720px;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;padding:0 90px;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
background:${s.num ? 'radial-gradient(1200px 600px at 50% 40%,#1e2230,#14161a)' : 'linear-gradient(135deg,#2a2740,#4b47c8 55%,#e0824b 130%)'}}
.num{font-size:24px;font-weight:800;letter-spacing:.35em;color:#e0a06b;margin-bottom:20px}
.title{font-size:${s.num ? '58' : '72'}px;font-weight:800;line-height:1.1}
.sub{font-size:26px;color:${s.num ? '#9aa1ac' : 'rgba(255,255,255,.9)'};margin-top:18px}
.bar{width:64px;height:5px;border-radius:3px;background:#e0a06b;margin-top:26px}
.brand{position:absolute;bottom:42px;font-size:14px;letter-spacing:.2em;color:rgba(255,255,255,.55);text-transform:uppercase}
</style></head><body>${s.num ? `<div class="num">SECTION ${s.num}</div>` : ''}
<div class="title">${s.title}</div><div class="sub">${s.sub}</div><div class="bar"></div>
${s.num ? '<div class="brand">DigiCred CrMS · Walkthrough</div>' : ''}</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })

const segments = []
for (const s of SECTIONS) {
  // Decide the section's body FIRST. If a numbered section has no footage on
  // this environment (skipped/merged spec), drop it ENTIRELY — no blank title
  // card. The intro (no num) always shows.
  let stills = []
  let vids = []
  if (s.num) {
    if (s.num === '06' && !IS_STAGING && fs.existsSync(S6_SHOTS)) {
      // Demo Section 6 = narrated slideshow of the tester's supplied screenshots
      // (a design with uploaded images doesn't survive an automated Save).
      stills = fs.readdirSync(S6_SHOTS).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => path.join(S6_SHOTS, f))
      const cleared = path.join(__dirname, `_shots-${ENV.tag}`, '06', '00-cleared.png')
      if (fs.existsSync(cleared)) stills.push(cleared) // ends on the reset (cleaned) card
    } else {
      vids = videosFor(s.vid || s.num)
    }
    if (!stills.length && !vids.length) {
      console.log(`! section ${s.num} has no footage on ${ENV.tag} — dropping section (no title card)`)
      continue
    }
  }

  // 1) title card PNG
  const png = path.join(TMP, `card-${s.n}.png`)
  await page.setContent(cardHtml(s), { waitUntil: 'networkidle' })
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1280, height: 720 } })
  // 2) narration audio — macOS `say` can hang indefinitely in a headless shell,
  // so guard it with a timeout and fall back to a silent title if it stalls.
  const aiffPath = path.join(TMP, `narr-${s.n}.aiff`)
  let aiff = null
  try {
    execFileSync('say', ['-v', VOICE, '-o', aiffPath, s.say], { timeout: 25000, killSignal: 'SIGKILL' })
    if (fs.existsSync(aiffPath)) aiff = aiffPath
  } catch { console.log(`! say timed out/failed for section ${s.n} — silent title card`) }
  const td = aiff ? dur(aiff) + 0.6 : 4.0
  // 3) title segment (image + narration, or silent if say stalled)
  const titleMp4 = path.join(TMP, `title-${s.n}.mp4`)
  const audioIn = aiff ? ['-i', aiff] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
  ff(['-loop', '1', '-i', png, ...audioIn, '-t', String(td),
    '-vf', 'scale=1280:720,setsar=1,format=yuv420p', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', titleMp4])
  segments.push(titleMp4)
  // 4) section body
  if (stills.length) {
    stills.forEach((img, i) => {
      const seg = path.join(TMP, `sec-06-still-${String(i).padStart(2, '0')}.mp4`)
      ff(['-loop', '1', '-i', img, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '3.2',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1', '-r', '30',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', seg])
      segments.push(seg)
    })
    console.log(`Section 06: ${stills.length} still(s) from ${S6_SHOTS}`)
  } else if (vids.length) {
    for (const [vi, vid] of vids.entries()) {
      const secMp4 = path.join(TMP, `sec-${s.n}-${vi}.mp4`)
      ff(['-i', vid, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1', '-r', '30',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', secMp4])
      segments.push(secMp4)
    }
  }
}
await browser.close()

// 5) concat everything
const list = path.join(TMP, 'list.txt')
fs.writeFileSync(list, segments.map((f) => `file '${f}'`).join('\n'))
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUT])
const mb = (fs.statSync(OUT).size / 1048576).toFixed(1)
console.log(`\nWrote ${OUT} (${mb} MB, ${dur(OUT).toFixed(0)}s, ${segments.length} segments)`)
