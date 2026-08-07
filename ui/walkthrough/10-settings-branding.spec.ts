import { test, expect } from '@playwright/test'
import { signIn, shot } from './support/app'

// Section 10 — Settings → Branding: toggle the accent color, then set it back
// (self-cleaning). (PDF pg34). Integration/config not tested per the meeting.
test('Section 10 — Settings branding (toggle accent color)', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await shot(page, '10', '17', 'settings')

  await test.step('18. Toggle accent colors, then restore Green', async () => {
    // Branding accents are 7 radio swatches: Terracotta, Blue, Green, Purple, Crimson, Teal, Gold.
    const COLORS = ['Terracotta', 'Blue', 'Green', 'Purple', 'Crimson', 'Teal', 'Gold']
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(7)
    for (const i of [0, 1, 3]) {
      await radios.nth(i).click()
      await page.waitForTimeout(600)
      await shot(page, '10', `18.${i}`, `accent-${COLORS[i].toLowerCase()}`)
    }
    // restore the demo's default accent (Green = index 2)
    await radios.nth(2).click()
    await page.waitForTimeout(600)
    await shot(page, '10', '18.restore', 'accent-green-restored')
  })
})
