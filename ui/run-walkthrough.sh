#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# The "1 Aug 2026" walkthrough run — reproducible.
# Runs the CrMS operator-UI walkthrough (13 specs incl. the Section-5
# channel-less-subject onboarding logic) live against the demo, then rebuilds
# the HTML + Word reports and posts the result to Slack (#digicred-Test).
#
# Usage:
#   DEMO_PASS='<operator password>' ./run-walkthrough.sh          # full: test + reports + slack
#   DEMO_PASS='...' ./run-walkthrough.sh --no-slack               # test + reports only
#   DEMO_PASS='...' ./run-walkthrough.sh --tests-only             # just the Playwright run
#
# The password is provided per session and is NEVER stored — it comes in via the
# DEMO_PASS env var only. Target defaults to the live demo; override with DEMO_URL.
# No git operations are performed (per standing instruction).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"     # tests/e2e/ui
E2E_DIR="$(cd "$UI_DIR/.." && pwd)"                        # tests/e2e

export DEMO_URL="${DEMO_URL:-https://demo.digicred.services}"
export DEMO_USER="${DEMO_USER:-chris@verid.id}"
if [ -z "${DEMO_PASS:-}" ]; then
  echo "ERROR: set DEMO_PASS (operator password) in the environment before running." >&2
  echo "  DEMO_PASS='...' $0" >&2
  exit 1
fi

MODE="${1:-full}"

# Environment tag (keep in sync with scripts/env-label.mjs): staging→STAGING,
# demo→DEMO, else first hostname label upper-cased. Everything downstream
# (results JSON, screenshots, reports, Slack, video) is stamped with it so
# demo and staging artifacts never collide.
HOST="$(printf '%s' "$DEMO_URL" | tr 'A-Z' 'a-z' | sed -E 's#^https?://##; s#/.*$##')"
case "$HOST" in
  *staging*) TAG=STAGING ;;
  *demo*)    TAG=DEMO ;;
  *)         TAG="$(printf '%s' "$HOST" | cut -d. -f1 | tr 'a-z' 'A-Z')" ;;
esac
export TAG

echo "▶ Walkthrough suite → $DEMO_URL  [$TAG]  (user: $DEMO_USER)"
cd "$UI_DIR"
export PLAYWRIGHT_JSON_OUTPUT_NAME="$UI_DIR/walkthrough/_results-${TAG}.json"
# list output for humans + json for the report/slack builders (honest live counts).
npx playwright test --config playwright.walkthrough.config.ts --reporter=list,json || true --ui

if [ "$MODE" = "--tests-only" ]; then
  echo "✔ Tests done (--tests-only)."; exit 0
fi

echo "▶ Building HTML report"
node "$UI_DIR/walkthrough/build-report.mjs"

echo "▶ Building Word report"
cd "$E2E_DIR"
node scripts/build-walkthrough-word.mjs

if [ "$MODE" = "--no-slack" ]; then
  echo "✔ Reports built (--no-slack)."; exit 0
fi

echo "▶ Posting to Slack (#digicred-Test) [$TAG]"
node scripts/slack-walkthrough-live.mjs

echo "✔ Done [$TAG] — tests + HTML + Word + Slack."
