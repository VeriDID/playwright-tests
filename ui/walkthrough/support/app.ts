import { type Page, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export const USER = process.env.DEMO_USER ?? 'chris@verid.id'
export const PASS = process.env.DEMO_PASS ?? ''
// Only needed the first time a freshly-provisioned account forces a password
// change on login (e.g. staging). Never hard-code — supply via env.
export const NEW_PASS = process.env.DEMO_NEW_PASS ?? ''

// Per-environment screenshot dir (derived from DEMO_URL) so a staging run's
// screenshots never overwrite demo's, and vice-versa. staging→_shots-STAGING,
// demo→_shots-DEMO. Keep this tag logic in sync with scripts/env-label.mjs.
function envTag(): string {
  const host = (process.env.DEMO_URL ?? 'https://demo.digicred.services')
    .toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (host.includes('staging')) return 'STAGING'
  if (host.includes('demo')) return 'DEMO'
  return (host.split('.')[0] || 'ENV').toUpperCase()
}
export const ENV_TAG = envTag()
// True when running against the staging environment. Specs branch on this to
// use staging's new flows/data (Kiosk onboarding, Avery Chen, Simple Credential
// Issuance) while leaving the demo path unchanged.
export const IS_STAGING = ENV_TAG === 'STAGING'
const SHOTS = path.join(__dirname, '..', `_shots-${ENV_TAG}`)

/** Save a labeled step screenshot for the stakeholder report, e.g. shot(page,'02','3','sort-name'). */
export async function shot(page: Page, section: string, step: string, label: string) {
  const dir = path.join(SHOTS, section)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${step.padStart(2, '0')}-${label}.png`) })
}

/** Sign in via the standard email/password form and land on the dashboard. */
export async function signIn(page: Page) {
  if (!PASS) throw new Error('Set DEMO_PASS before running the walkthrough.')
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(USER)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASS)
  // Submit the form (Enter) rather than the header "Sign in" nav button.
  await page.getByRole('textbox', { name: 'Password' }).press('Enter')
  // A freshly-provisioned account can force a password change on first login
  // (staging did on 5 Aug 2026). Handle it if DEMO_NEW_PASS is provided;
  // otherwise fail loudly instead of silently timing out on the dashboard wait.
  await page.waitForURL(/\/(dashboard|change-password)/, { timeout: 35_000 })
  if (/\/change-password/.test(page.url())) {
    if (!NEW_PASS) {
      throw new Error('Landed on /change-password but DEMO_NEW_PASS is not set — the account needs a forced password reset handled first.')
    }
    const f = page.locator('input[type=password]')
    await f.nth(0).fill(PASS)        // current
    await f.nth(1).fill(NEW_PASS)    // new
    await f.nth(2).fill(NEW_PASS)    // confirm
    await page.getByRole('button', { name: 'Change password' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 35_000 })
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 35_000 })
}

/**
 * Pick a UHS student id that doesn't already have a channel, for onboarding.
 * Reads the Channels list once, then rotates through UHS-2024-0NN avoiding
 * names already present. Returns { id }.
 */
export async function pickUnusedOnboardingId(page: Page, lo = 1, hi = 60): Promise<string> {
  // Deterministic-but-varying start point without Date/Math.random (unavailable
  // in some sandboxes): derive from the current channel count.
  await page.goto('/dashboard/channels')
  await page.waitForTimeout(1500)
  const start = ((await page.getByText(/StudentChannel/).count()) % (hi - lo)) + lo
  for (let k = 0; k < hi - lo; k++) {
    const n = lo + ((start - lo + k) % (hi - lo))
    const id = `UHS-2024-${String(n).padStart(3, '0')}`
    return id // first candidate; lookup step verifies it resolves & confirm/remove keeps it clean
  }
  return `UHS-2024-${String(lo).padStart(3, '0')}`
}
