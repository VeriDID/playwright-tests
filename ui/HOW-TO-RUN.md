# CrMS Walkthrough — How to run the tests, reports & video

A self-contained guide to regenerate the walkthrough **test run**, the **Word + HTML
reports**, the **narrated MP4**, and (optionally) the **Slack post** — for either
the **demo** or **staging** environment. No prior context needed.

---

## 0. One-time setup (do once per machine)

```bash
# from the repo root: digicred-crms
cd tests/e2e/ui
npm install                         # if node_modules is missing
npx playwright install chromium     # test browser
```

Also required on the machine:
- **Node.js** (v20+).
- **ffmpeg** — for the MP4. Install with `brew install ffmpeg`.
- **macOS** — the MP4 narration uses the built-in `say` voice. (On non-mac the
  video still builds, just with silent title cards.)

---

## 1. The password (read this)

The operator password is **passed in per run via the `DEMO_PASS` environment
variable and is never stored in any file.** Replace `<PASSWORD>` below with the
current password each time.

---

## 2. Run everything (tests → reports → Slack) — ONE command

Always run from **`tests/e2e/ui`**.

**Staging:**
```bash
cd tests/e2e/ui
DEMO_URL='https://staging.digicred.services' \
DEMO_USER='chris@verid.id' \
DEMO_PASS='<PASSWORD>' \
./run-walkthrough.sh
```

**Demo** (URL defaults to demo, so just omit `DEMO_URL`):
```bash
cd tests/e2e/ui
DEMO_PASS='<PASSWORD>' ./run-walkthrough.sh
```

### Modes (add one flag at the end)
| Command | Does |
|---|---|
| `./run-walkthrough.sh` | tests → HTML report → Word report → **posts to Slack** |
| `./run-walkthrough.sh --no-slack` | tests → HTML + Word reports (no Slack) |
| `./run-walkthrough.sh --tests-only` | just the Playwright run (no reports/Slack) |

The script auto-detects the environment from `DEMO_URL` and tags every output
**DEMO** or **STAGING**, so demo and staging files never overwrite each other.

---

## 3. Build the narrated MP4 (run AFTER a test run)

The MP4 stitches the per-section videos recorded during the test run, so run
step 2 first. Then:

```bash
cd tests/e2e/ui/walkthrough
DEMO_URL='https://staging.digicred.services' \
OUT_NAME='DigiCred-CrMS-Staging-Walkthrough.mp4' \
node make-demo-video.mjs
```

- `OUT_NAME` is optional — omit it and it writes `CrMS-Demo-STAGING.mp4`.
- For demo, drop `DEMO_URL` (defaults to demo).
- Takes ~1–2 min; it prints `Wrote <path> (<size>, <seconds>, <segments>)` when done.

---

## 4. Post to Slack on its own (optional)

If you ran with `--no-slack` and later want to post:

```bash
cd tests/e2e
DEMO_URL='https://staging.digicred.services' node scripts/slack-walkthrough-live.mjs
```

It reads the Slack bot token from `services/crms-ui/.env` and posts to
**#digicred-Test** with the live tally + 4 screenshots.

---

## 5. Where the outputs land (STAGING example — swap STAGING→DEMO for demo)

| Output | Path (from repo root) |
|---|---|
| Word report | `tests/e2e/DigiCred-CrMS-Walkthrough-Report-STAGING.docx` |
| HTML report | `tests/e2e/ui/walkthrough/CrMS-Walkthrough-Report-STAGING.html` |
| MP4 | `tests/e2e/ui/walkthrough/<OUT_NAME or CrMS-Demo-STAGING.mp4>` |
| Screenshots | `tests/e2e/ui/walkthrough/_shots-STAGING/` |
| Videos + traces | `tests/e2e/ui/walkthrough/_artifacts-STAGING/` |
| Live results (JSON) | `tests/e2e/ui/walkthrough/_results-STAGING.json` |

---

## 6. Typical full refresh (copy-paste)

```bash
# 1) tests + reports (no Slack yet)
cd tests/e2e/ui
DEMO_URL='https://staging.digicred.services' DEMO_USER='chris@verid.id' DEMO_PASS='<PASSWORD>' \
  ./run-walkthrough.sh --no-slack

# 2) narrated MP4
cd walkthrough
DEMO_URL='https://staging.digicred.services' OUT_NAME='DigiCred-CrMS-Staging-Walkthrough.mp4' \
  node make-demo-video.mjs

# 3) (optional) post to Slack
cd ..                      # back to tests/e2e/ui
cd ..                      # back to tests/e2e
DEMO_URL='https://staging.digicred.services' node scripts/slack-walkthrough-live.mjs
```

---

## 7. Troubleshooting

- **`no such file: ./node_modules/.bin/playwright`** — you're not in
  `tests/e2e/ui`. `cd` there first.
- **`ERROR: set DEMO_PASS ...`** — you didn't pass the password. Prefix the
  command with `DEMO_PASS='<PASSWORD>'`.
- **A brand-new account forces a password change on first login** — add
  `DEMO_NEW_PASS='<new password>'` to the command; the sign-in helper will set it
  and continue. (Only needed once, on a freshly provisioned account.)
- **MP4 has silent title cards** — macOS `say` timed out (it's guarded so the
  build still completes). Just re-run step 3.
- **A section looks blank in the MP4** — that section was skipped on this
  environment; the builder now drops skipped sections entirely (no blank card).
- **Slack didn't post** — check `services/crms-ui/.env` has `SLACK_BOT_TOKEN`.

---

## 8. What's demo-only vs staging-only

Specs branch on the environment automatically. A few sections differ:
- **Staging** merges the workflow-instance section into the channel-detail
  section, adds the full **Schemas** create-flow, an **Issue-a-credential**
  section, and skips the credential-designer cleanup variants.
- **Open Badge issuance** and the **OID4VCI credential type** are *not yet
  implemented on staging* — those steps document the gap (open dialog → cancel),
  which is expected, not a test failure.

You don't need to do anything for this — it's automatic based on `DEMO_URL`.
