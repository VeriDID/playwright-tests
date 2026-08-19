import { test, expect, type Page } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 7 — CASE Frameworks (+ Issuer Profiles on staging).
// Staging (5 Aug PDF): open a Draft framework (Wyoming Employers and
// Apprenticeships), switch to the Published filter, open "World History: 1500
// to Present", expand a Module, then create an Issuer Profile via the 3-step
// wizard (Identity → Contact → Keys). Demo: the original simple browse.
const PROFILE_NAME = 'DigiCred Staging One'

// Create the issuer profile only if it doesn't already exist (idempotent — the
// PDF leaves it in place, so re-runs must not duplicate or fail).
async function ensureProfile(page: Page) {
  await page.getByRole('link', { name: 'Profiles' }).first().click()
  await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, '07', '6', 'profiles')
  if (await page.getByText(PROFILE_NAME, { exact: true }).count()) {
    console.log(`Section 7 (staging): profile "${PROFILE_NAME}" already exists — leaving it.`)
    await shot(page, '07', '12', 'profile-exists')
    return
  }
  await page.getByRole('button', { name: /New Profile/i }).click()
  const d = page.getByRole('dialog')
  await expect(d.getByText(/Create Profile/i)).toBeVisible()
  // 1. Identity
  await d.getByRole('textbox', { name: 'Name' }).first().fill(PROFILE_NAME)
  await d.getByRole('textbox', { name: /Description/i }).fill('Testing Staging Profile schema')
  await shot(page, '07', '8', 'profile-identity')
  await d.getByRole('button', { name: 'Next' }).click()
  // 2. Contact
  await d.getByRole('textbox', { name: /Website URL/i })
    .or(d.getByPlaceholder(/example\.org$/i)).first().fill('https://test.com')
  await d.getByRole('textbox', { name: /Contact email/i }).fill('chris@verid.id')
  await d.getByRole('textbox', { name: /Icon URL/i }).fill('https://images.squarespace-cdn.com/content/v1/67bc7581e3aeec063c6ed1ce/5faf6e10-129a-4bc9-a122-93b12036a156/DigiCred+LOGO+full+2025_white_00000.png')
  await d.getByRole('textbox', { name: /Image URL/i }).fill('https://images.squarespace-cdn.com/content/v1/67bc7581e3aeec063c6ed1ce/5faf6e10-129a-4bc9-a122-93b12036a156/DigiCred+LOGO+full+2025_white_00000.png')
  await shot(page, '07', '10', 'profile-contact')
  await d.getByRole('button', { name: 'Next' }).click()
  // 3. Keys — leave EdDSA (Ed25519) checked → Create
  //await expect(d.getByText(/EdDSA (Ed25519)/i)).toBeVisible({ timeout: 15_000 })
  await shot(page, '07', '11', 'profile-keys')
  await d.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText(PROFILE_NAME, { exact: true })).toBeVisible({ timeout: 15_000 })
  await shot(page, '07', '12', 'profile-created')
}

test('Section 7 — CASE Frameworks', async ({ page }) => {
  await signIn(page)

  if (IS_STAGING) {
    await test.step('1–2. CASE Frameworks → open Wyoming Employers and Apprenticeships (Draft)', async () => {
      await page.getByRole('link', { name: 'CASE Frameworks' }).first().click()
      await expect(page.getByRole('heading', { name: 'CASE Frameworks' })).toBeVisible()
      await shot(page, '07', '1', 'case-frameworks')
      await page.getByText('Wyoming Employers and Apprenticeships', { exact: true }).first().click()
      await expect(page.getByRole('heading', { name: /Wyoming Employers and Apprenticeships/i })).toBeVisible({ timeout: 15_000 })
      await shot(page, '07', '2', 'wyoming-framework')
    })

    await test.step('3–5. Published filter → World History: 1500 to Present → expand a Module', async () => {
      await page.getByRole('link', { name: 'CASE Frameworks' }).first().click()
      await expect(page.getByRole('heading', { name: 'CASE Frameworks' })).toBeVisible()
      await page.getByRole('button', { name: 'Published', exact: true })
        .or(page.getByText('Published', { exact: true })).first().click()
      await page.waitForTimeout(800)
      await page.getByText('World History: 1500 to Present', { exact: true }).first().click()
      await expect(page.getByRole('heading', { name: /World History: 1500 to Present/i })).toBeVisible({ timeout: 15_000 })
      await shot(page, '07', '4', 'world-history')
      // Expand a Module row to reveal its Learning Outcomes (best-effort, short
      // timeout so a missing label never dead-waits the 25s action timeout).
      await page.getByText(/Age of Exploration|Module|HIST/i).first().click({ timeout: 3500 }).catch(() => {})
      await page.waitForTimeout(600)
      await shot(page, '07', '5', 'module-expanded')
    })

    await test.step('6–12. Profiles → create Issuer Profile (Identity → Contact → Keys)', async () => {
      await ensureProfile(page)
    })
    return
  }

  await test.step('Open CASE Frameworks', async () => {
    await page.getByRole('link', { name: 'CASE Frameworks' }).first().click()
    await page.waitForTimeout(800)
    await shot(page, '07', '1', 'case-frameworks')
  })

  await test.step('Open a framework and search items', async () => {
    await page.getByText('Wyoming Social Studies').first().click()
    await page.waitForTimeout(800)
    await shot(page, '07', '2', 'framework-open')
    const search = page.getByRole('textbox', { name: /Search items/i })
    if (await search.count()) {
      await search.fill('content standard')
      await search.press('Enter')
      await page.waitForTimeout(600)
      await expect(page.getByText(/Content Standard/i).first()).toBeVisible()
      await shot(page, '07', '3', 'search-results')
    }
  })
})
