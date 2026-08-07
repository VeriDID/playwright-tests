import { test, expect, type Page } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 3 — Channel detail.
// Demo (PDF 7–14): open a channel (Alex DigiCred), tour each tab, open Message.
// Staging (Crms1b, 6 Aug 2026): the full Channels + Workflow journey on Casey
// Reed — search → open → Start workflow (High School Transcript) → instance →
// Back → Credentials (Issue credential → OID4VCI "no options" → Cancel) →
// Workflows → Activity → Settings (add note "Staging testing") → Back to
// channels → Active → Invitation filters. Sections 3 & 4 are MERGED on staging
// (Section 4 skips there).
const CHANNEL = process.env.WT_CHANNEL ?? (IS_STAGING ? 'Casey Reed' : 'Alex DigiCred')
const NOTE = 'Staging testing'

async function stagingChannelsWorkflow(page: Page) {
  await test.step('1–3. Channels → search Casey Reed → open', async () => {
    await page.goto('/dashboard/channels')
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible()
    await page.getByPlaceholder(/Search by name/i).fill(CHANNEL)
    await page.waitForTimeout(700)
    await shot(page, '03', '1', 'search-casey')
    await page.getByText(CHANNEL, { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible()
    await shot(page, '03', '2', 'channel-overview')
  })

  await test.step('4–5. Start workflow → High School Transcript → instance', async () => {
    await page.getByRole('button', { name: /Start workflow/i }).first().click()
    const d = page.getByRole('dialog')
    await expect(d.getByText(/Start a workflow/i)).toBeVisible()
    await d.getByText(/Select a template/i).first().click()
    await page.getByRole('option', { name: 'High School Transcript' })
      .or(page.getByText('High School Transcript', { exact: true })).first().click()
    await shot(page, '03', '5a', 'start-workflow-dialog')
    await d.getByRole('button', { name: /Start workflow/i }).click()
    await expect(page.getByRole('heading', { name: /High School Transcript/i })).toBeVisible({ timeout: 20_000 })
    await shot(page, '03', '5', 'workflow-instance')
  })

  await test.step('7. Back to channel', async () => {
    await page.getByRole('button', { name: /Back to channel/i })
      .or(page.getByText(/Back to channel/i)).first().click()
    await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible({ timeout: 15_000 })
  })

  await test.step('8–9. Credentials tab → Issue credential (OID4VCI, not configured → Cancel)', async () => {
    await page.getByRole('tab', { name: 'Credentials' }).click()
    await page.waitForTimeout(500)
    await shot(page, '03', '8', 'credentials-tab')
    await page.getByRole('button', { name: /Issue credential/i }).first().click()
    const d = page.getByRole('dialog')
    await expect(d).toBeVisible()
    await shot(page, '03', '9', 'issue-credential-dialog')
    // Credential type has no options (not configured on staging) — cancel out.
    await d.getByRole('button', { name: /^Cancel$/i }).click()
    await page.waitForTimeout(400)
  })

  await test.step('10–11. Workflows tab → Activity tab', async () => {
    await page.getByRole('tab', { name: 'Workflows' }).click()
    await page.waitForTimeout(500)
    await shot(page, '03', '10', 'workflows-tab')
    await page.getByRole('tab', { name: 'Activity' }).click()
    await page.waitForTimeout(500)
    await shot(page, '03', '11', 'activity-tab')
  })

  await test.step('12–13. Settings tab → add note "Staging testing" → save', async () => {
    await page.getByRole('tab', { name: 'Settings' }).click()
    await page.waitForTimeout(500)
    const note = page.getByRole('textbox', { name: /Add a note|note/i }).first()
    await note.fill(NOTE)
    await shot(page, '03', '12', 'note-typed')
    await page.getByRole('button', { name: /Save note/i }).click()
    await page.waitForTimeout(800)
    await shot(page, '03', '13', 'note-saved')
  })

  await test.step('14–16. Back to channels → Active → Invitation filters', async () => {
    await page.getByRole('button', { name: /Back to channels/i })
      .or(page.getByText(/Back to channels/i)).first().click()
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Active', exact: true })
      .or(page.getByText('Active', { exact: true })).first().click()
    await page.waitForTimeout(500)
    await shot(page, '03', '15', 'filter-active')
    await page.getByRole('button', { name: 'Invitation', exact: true })
      .or(page.getByText('Invitation', { exact: true })).first().click()
    await page.waitForTimeout(500)
    await shot(page, '03', '16', 'filter-invitation')
  })
}

test('Section 3 — Channel detail tabs + Message', async ({ page }) => {
  await signIn(page)

  if (IS_STAGING) {
    await stagingChannelsWorkflow(page)
    return
  }

  await test.step('7. Open the channel record', async () => {
    await page.goto('/dashboard/channels')
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible()
    await page.getByText(CHANNEL, { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible()
    await shot(page, '03', '8', 'channel-overview')
  })

  await test.step('9–13. View each tab: Credentials, Workflows, Activity, Settings', async () => {
    for (const [i, tab] of ['Overview', 'Credentials', 'Workflows', 'Activity', 'Settings'].entries()) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
      await page.waitForTimeout(400)
      await shot(page, '03', `9.${i + 1}`, `tab-${tab.toLowerCase()}`)
    }
  })

  await test.step('14. Open the Message panel (view only, do not send)', async () => {
    await page.getByRole('button', { name: 'Message' }).first().click()
    await page.waitForTimeout(800)
    await shot(page, '03', '14', 'message-open')
    // Back out without sending: Escape, then a Cancel/Close/Back if present.
    await page.keyboard.press('Escape').catch(() => {})
    const back = page.getByRole('button', { name: /Cancel|Close|Back/ })
    if (await back.first().isVisible().catch(() => false)) await back.first().click()
  })
})
