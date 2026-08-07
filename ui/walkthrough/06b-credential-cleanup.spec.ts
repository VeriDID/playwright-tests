import { test, expect } from '@playwright/test'
import { signIn, IS_STAGING } from './support/app'

// Section 6 (cleanup) — resets the shared Test Design back to empty after the
// compose spec (06-credential-designer) has saved the finished card. Kept as a
// SEPARATE test so the demo video's Section 6 clip ends on the finished card
// (videoFor('06') matches only the '06-' compose dir, not '06b-'). This leaves
// the shared demo environment clean for the next person / next run.
test('Section 6 cleanup — reset Test Design to empty', async ({ page }) => {
  test.skip(IS_STAGING, 'No "Test Design" on staging; Section 6 is skipped there.')
  await signIn(page)
  await page.goto('/dashboard/credentials/designer')
  await page.getByRole('button', { name: /Test Design/ }).first().click()
  await expect(page.getByRole('tab', { name: 'Components' })).toBeVisible()

  const card = page.locator('.credential-card-container')
  const cardImgs = card.locator('img')
  const del = page.getByRole('button', { name: /Delete element/i })
  const NAME = 'Joshua Oladimeji'

  // Select each element and delete it until the card is empty.
  for (let i = 0; i < 12; i++) {
    const placeholders = page.getByText(/New text|\{\{student_id\}\}|\{\{student_name\}\}/)
    let target = null
    if (await cardImgs.count()) target = cardImgs.first()
    else if (await page.getByText(NAME).count()) target = page.getByText(NAME).first()
    else if (await placeholders.count()) target = placeholders.first()
    if (!target) break
    const b = await target.boundingBox().catch(() => null)
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    else await target.click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
    if (await del.isVisible().catch(() => false)) { await del.click(); await page.waitForTimeout(400) }
    else break
  }

  await page.getByRole('button', { name: /^Save$/ }).click()
  await page.waitForTimeout(1500)
})
