import { defineConfig, devices } from '@playwright/test'

/**
 * Positive-path stakeholder walkthrough of the CrMS operator UI, run against
 * the LIVE demo. Built from the boss-approved script (Walkthrough_Scripts_Playwright.pdf)
 * and the 2026-07-29 meeting decisions: positive path only; self-cleaning;
 * every list view shows search/filter/sort/pagination; PDF signing, vaults,
 * integrations, credential issuance excluded.
 *
 * Records everything: video + trace + per-step screenshots, so the run can be
 * shown to stakeholders as a step-by-step tour.
 *
 * Env: DEMO_URL (default demo), DEMO_USER, DEMO_PASS (required).
 */
const BASE = process.env.DEMO_URL ?? 'https://demo.digicred.services'
// Per-environment artifact dirs so demo and staging videos/traces/reports coexist.
const HOST = BASE.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
const TAG = HOST.includes('staging') ? 'STAGING' : HOST.includes('demo') ? 'DEMO' : (HOST.split('.')[0] || 'ENV').toUpperCase()

export default defineConfig({
  testDir: './walkthrough',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `walkthrough/_report-${TAG}` }]],
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: `./walkthrough/_artifacts-${TAG}`,
  use: {
    baseURL: BASE,
    viewport: { width: 1440, height: 900 },
    video: 'on',
    trace: 'on',
    screenshot: 'only-on-failure',
    actionTimeout: 25_000,
    navigationTimeout: 35_000,
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 350) },
  },
  projects: [{ name: 'walkthrough', use: { ...devices['Desktop Chrome'] } }],
})
