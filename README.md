# playwright-tests — DigiCred CrMS operator-UI walkthrough

End-to-end Playwright walkthrough of the DigiCred **CrMS** operator UI. One run
produces:

- a **live pass/fail** test result across ~14 stakeholder sections,
- step **screenshots**, a **video + trace** per section,
- editable **Word** + self-contained **HTML** reports, and
- a **narrated MP4** walkthrough video.

It runs against a live environment (demo or staging) — it **auto-detects** which
from the target URL and tags every output `DEMO` or `STAGING` so they never
collide.

> 📄 **Full instructions: [`ui/HOW-TO-RUN.md`](ui/HOW-TO-RUN.md)** — start there.

---

## Quick start

```bash
# 1) install
npm install                 # also installs the Chromium browser
brew install ffmpeg         # needed for the MP4 (macOS narration uses the `say` voice)

# 2) run tests + build reports (no Slack) against staging
cd ui
DEMO_URL='https://staging.digicred.services' \
DEMO_USER='<operator email>' \
DEMO_PASS='<operator password>' \
./run-walkthrough.sh --no-slack

# 3) build the narrated MP4
cd walkthrough
DEMO_URL='https://staging.digicred.services' node make-demo-video.mjs
```

For **demo**, omit `DEMO_URL` (it defaults to the demo URL).

## What you need

| Requirement | Notes |
|---|---|
| Node.js 20+ | run the tests / scripts |
| `npm install` | installs Playwright + Chromium + `docx` |
| **ffmpeg** (`brew install ffmpeg`) | stitches the MP4 |
| **macOS** | the MP4 narration uses the built-in `say` voice (video still builds silently elsewhere) |
| Operator password | passed at runtime via `DEMO_PASS` — **never stored** |
| *(optional)* `SLACK_BOT_TOKEN` + `SLACK_CHANNEL` | only if you want the Slack post |

You do **not** need any AI tool to run this — the commands above are all it takes.

## Layout

```
ui/
  playwright.walkthrough.config.ts   # Playwright config (viewport, video, trace)
  run-walkthrough.sh                 # one command: tests → reports → (Slack)
  HOW-TO-RUN.md                      # detailed guide
  walkthrough/
    *.spec.ts                        # the sections (sign-in … issue credential)
    support/app.ts                   # sign-in + screenshot helpers
    build-report.mjs                 # HTML report
    make-demo-video.mjs              # narrated MP4
    assets/                          # logo fixtures used by the credential designer
scripts/
    env-label.mjs                    # DEMO/STAGING tagging
    walkthrough-results.mjs          # live pass/fail parser
    build-walkthrough-word.mjs       # Word report
    slack-walkthrough-live.mjs       # Slack post (token via env)
```

## Notes

- **Secrets & live data are never committed** (see `.gitignore`): no `.env`, no
  screenshots/videos/reports — you generate those locally when you run it.
- The credential-designer **demo** section expects a photo at
  `ui/walkthrough/assets/IMG_1326.jpg` (not committed — it's a personal image).
  The **staging** walkthrough does not need it.
- Some staging steps document features that are **not yet implemented**
  (Open Badge issuance, OID4VCI credential type) — those open the dialog and
  cancel; that's expected, not a test failure.
