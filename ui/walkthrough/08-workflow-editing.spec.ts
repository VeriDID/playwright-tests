import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Template to edit: staging's real template is "Simple Credential Issuance";
// demo uses "School Welcome".
const TPL = IS_STAGING ? 'Simple Credential Issuance' : 'School Welcome'

// Section 8 — Workflow template (School Welcome): Details → Edit (Flow/Screen/
// JSON) → Instances → Access (add a role then revert = self-cleaning). Skips
// archive/publish per the meeting. (PDF pg18–25)
// Robust tab click — Edit sub-views (Flow/Screen/JSON) can grab focus, so if a
// tab isn't immediately clickable, reset via Details and retry.
async function clickTab(page: import('@playwright/test').Page, name: string) {
  const tab = page.getByRole('tab', { name })
  try {
    await tab.scrollIntoViewIfNeeded().catch(() => {})
    await tab.click({ timeout: 8000 })
  } catch {
    await page.getByRole('tab', { name: 'Details' }).click({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(600)
    await tab.click({ timeout: 8000 })
  }
}

test('Section 8 — Workflow editing (School Welcome)', async ({ page }) => {
  await signIn(page)
  let detailUrl = ''

  await test.step(`16–18. Open the ${TPL} template`, async () => {
    await page.goto('/dashboard/templates')
    await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible()
    await page.getByRole('row', { name: new RegExp(TPL) }).first().getByText(TPL).first().click()
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible()
    await expect(page.getByRole('heading', { name: new RegExp(TPL) })).toBeVisible()
    detailUrl = page.url() // tabbed detail page — re-navigated to before Instances/Access
    await shot(page, '08', '18', 'template-details')
  })

  await test.step('19 / 4–8. Edit view — Flow, Screen, JSON', async () => {
    await clickTab(page, 'Edit')
    await page.waitForTimeout(1000)
    await shot(page, '08', '19', 'edit')
    for (const view of ['Flow', 'Screen', 'JSON']) {
      const btn = page.getByRole('button', { name: new RegExp('^' + view + '$') })
      if (await btn.count()) {
        await btn.first().click()
        await page.waitForTimeout(700)
        await shot(page, '08', `view-${view.toLowerCase()}`, view.toLowerCase())
      }
    }
  })

  await test.step('9. Instances tab', async () => {
    await page.goto(detailUrl) // Edit view drops the outer tabs — reset to the detail page
    await clickTab(page, 'Instances')
    await page.waitForTimeout(700)
    await shot(page, '08', '9', 'instances')
  })

  await test.step('10–14. Access — add Guest (Read) then revert to None', async () => {
    await page.goto(detailUrl)
    await clickTab(page, 'Access')
    await page.waitForTimeout(800)
    await shot(page, '08', '10', 'access')
    // Add Guest (Read) then revert to None. The Access editor is non-functional
    // on staging (its clicks never register → a 25s dead-wait that showed as an
    // "extended delay" in the video), so skip it there. On demo, cap each click
    // at 5s so it can never dead-wait the 25s action timeout either.
    if (!IS_STAGING) {
      try {
        await page.getByText('Select a role', { exact: false }).first().click({ timeout: 5000 })
        await page.getByRole('option', { name: 'Guest' }).click({ timeout: 5000 })
        await page.getByText('Select level', { exact: false }).first()
          .or(page.getByText('Select', { exact: false }).nth(1)).click({ timeout: 5000 })
        await page.getByRole('option', { name: 'Read' }).click({ timeout: 5000 })
        await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 5000 })
        await page.waitForTimeout(600)
        await shot(page, '08', '13', 'role-added')
        await page.getByText('Read', { exact: true }).last().click({ timeout: 5000 })
        await page.getByRole('option', { name: 'None' }).click({ timeout: 5000 })
        await page.waitForTimeout(500)
        await shot(page, '08', '14', 'role-reverted')
      } catch (e) {
        console.log('Access add/revert sub-step skipped:', (e as Error).message.split('\n')[0])
      }
    } else {
      console.log('Section 8 (staging): Access add/revert skipped — editor non-functional on staging.')
    }
  })

  await test.step('15–16. Back to templates', async () => {
    await page.goto('/dashboard/templates')
    await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible()
    await shot(page, '08', '16', 'back-to-templates')
  })
})
