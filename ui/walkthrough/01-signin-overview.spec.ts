import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 1 — Sign in and arrive at the Overview page. On staging the overview
// is a new page ("Welcome to DigiCred Staging's CrMS") with a new Quick actions
// panel — we exercise each quick action and browser-back to Overview.
test('Section 1 — Sign in & Overview', async ({ page }) => {
  await test.step('1. Sign in (email & password)', async () => {
    await page.goto('/login')
    await shot(page, '01', '1', 'login-page')
    await signIn(page)
  })

  await test.step('2. Arrive at the Overview page', async () => {
    await page.goto('/dashboard/overview')
    await expect(page.getByRole('heading', { name: /Welcome to/i })).toBeVisible()
    if (IS_STAGING) {
      // New staging overview copy — flag it as a new entry in the walkthrough.
      await expect(page.getByText(/DigiCred Staging/i).first()).toBeVisible()
    }
    await shot(page, '01', '2', 'overview')
  })

  if (IS_STAGING) {
    await test.step('e–f. Quick actions — View channels / Create invitation / Open settings (each → back)', async () => {
      const actions = [
        { name: /View channels/i, url: /\/dashboard\/channels/, label: 'view-channels' },
        { name: /Create invitation/i, url: /\/dashboard\/(onboarding|invitations)/, label: 'create-invitation' },
        { name: /Open settings/i, url: /\/dashboard\/settings/, label: 'open-settings' },
      ]
      for (const [i, a] of actions.entries()) {
        await page.goto('/dashboard/overview')
        await expect(page.getByText('Quick actions', { exact: false }).first()).toBeVisible()
        await page.getByText(a.name, { exact: false }).first().click()
        await expect(page).toHaveURL(a.url, { timeout: 15_000 })
        await shot(page, '01', `2.${i + 1}`, a.label)
        await page.goBack()
        await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 15_000 })
      }
    })
  }
})
