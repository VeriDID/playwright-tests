import { test, expect, type Page } from '@playwright/test'
import { signIn, shot } from './support/app'

// Section 9b — Add the "Developer" role to the operator's OWN profile
// (chris@verid.id). Non-destructive: Users → find own row → Manage roles → add
// Developer. Deliberately NOT part of Section 9 (which archives + deletes the
// user it targets). Idempotent: skips the add if Developer is already present.
const EMAIL = process.env.DEMO_USER ?? 'chris@verid.id'

async function openManageRoles(page: Page) {
  const kebab = page.getByRole('row', { name: new RegExp(EMAIL) }).first().getByRole('button').last()
  const manage = page.getByRole('menuitem', { name: /Manage roles/i })
  for (let i = 0; i < 3; i++) {
    await kebab.click()
    if (await manage.isVisible({ timeout: 4000 }).catch(() => false)) { await manage.click(); return }
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  }
  throw new Error('Manage roles not available for own account')
}

test('Section 9b — Add Developer role to own profile', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await test.step('Find own profile', async () => {
    const s = page.getByPlaceholder(/Search users/i)
    if (await s.count()) { await s.fill(EMAIL); await page.waitForTimeout(1000) }
    await expect(page.getByText(EMAIL, { exact: true })).toBeVisible()
    await shot(page, '09b', '1', 'found-profile')
  })

  await test.step('Manage roles → add Developer (keep existing roles)', async () => {
    await openManageRoles(page)
    const dialog = page.getByRole('dialog')
    const already = await dialog.getByText('Developer', { exact: true }).count()
    if (!already) {
      await page.getByText('Select a role', { exact: false }).click()
      await page.getByRole('option', { name: 'Developer', exact: true }).click()
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      await page.waitForTimeout(700)
    }
    await expect(dialog.getByText('Developer', { exact: true }).first()).toBeVisible()
    await shot(page, '09b', '2', 'developer-added')
  })
})
