import { test, expect, type Page } from '@playwright/test'
import { signIn, shot } from './support/app'

// Section 9 — Users lifecycle: create → Onboarding Staff → archive → delete →
// confirm gone. Self-cleaning + self-healing (loop-deletes any leftover). (PDF pg26–33)
const NAME = 'test'
const EMAIL = 'test@test.com'

async function search(page: Page) {
  const s = page.getByPlaceholder(/Search users/i)
  if (await s.count()) { await s.fill(''); await s.fill(EMAIL); await page.waitForTimeout(1000) }
}
async function exists(page: Page) {
  await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  await search(page)
  return (await page.getByText(EMAIL, { exact: true }).count()) > 0
}
async function closeDialogs(page: Page) {
  for (let i = 0; i < 3 && (await page.getByRole('dialog').count()); i++) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  }
}
async function openRowMenu(page: Page) {
  await closeDialogs(page)
  await search(page)
  const kebab = page.getByRole('row', { name: new RegExp(EMAIL) }).first().getByRole('button').last()
  const menuItem = page.getByRole('menuitem', { name: /Change status|Manage roles/ }).first()
  for (let attempt = 0; attempt < 3; attempt++) {
    await kebab.click()
    if (await menuItem.isVisible({ timeout: 4000 }).catch(() => false)) return
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  }
  throw new Error('row action menu did not open')
}
async function deleteUser(page: Page) {
  await openRowMenu(page)
  await page.getByRole('menuitem', { name: /Change status/i }).click()
  await page.getByRole('button', { name: 'Delete user permanently' }).click()
  await page.waitForTimeout(800) // dialog transitions to the confirm step
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await page.waitForTimeout(1200)
}
async function createUser(page: Page): Promise<boolean> {
  await page.getByRole('button', { name: 'Create user' }).click()
  await page.getByRole('textbox', { name: /Name/ }).fill(NAME)
  await page.getByRole('textbox', { name: /Email/ }).fill(EMAIL)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  return page.getByText(/User created successfully/i).isVisible({ timeout: 9000 }).catch(() => false)
}

test('Section 9 — Users (create → onboarding-staff → archive → delete)', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await test.step('Pre-clean any leftover test user', async () => {
    for (let i = 0; i < 3 && (await exists(page)); i++) { await deleteUser(page); await page.reload(); await page.waitForTimeout(800) }
  })

  await test.step('2–5. Create user', async () => {
    let ok = await createUser(page)
    if (!ok) { await closeDialogs(page); if (await exists(page)) await deleteUser(page); ok = await createUser(page) }
    expect(ok, 'user created').toBeTruthy()
    await shot(page, '09', '5', 'user-created')
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click()
  })

  await test.step('8–10. Manage roles → add Onboarding Staff', async () => {
    await openRowMenu(page)
    await page.getByRole('menuitem', { name: /Manage roles/i }).click()
    await page.getByText('Select a role', { exact: false }).click()
    await page.getByRole('option', { name: 'Onboarding Staff' }).click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(500)
    await shot(page, '09', '10', 'role-onboarding-staff')
    await closeDialogs(page)
  })

  await test.step('11–12. Change status → Archived', async () => {
    await openRowMenu(page)
    await page.getByRole('menuitem', { name: /Change status/i }).click()
    await page.getByRole('dialog').getByText('Active', { exact: true }).first().click()
    await page.getByRole('option', { name: 'Archived' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(800)
    await shot(page, '09', '12', 'archived')
  })

  await test.step('13–15. Delete permanently', async () => {
    await deleteUser(page)
    await shot(page, '09', '15', 'deleted')
  })

  await test.step('16. Confirm the user is gone', async () => {
    await search(page)
    await expect(page.getByText(EMAIL, { exact: true })).toHaveCount(0)
    await shot(page, '09', '16', 'confirmed-gone')
  })
})
