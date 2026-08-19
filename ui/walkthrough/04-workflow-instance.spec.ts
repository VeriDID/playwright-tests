import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 4 — Workflow instance + channel note.
// Demo: open a channel with existing runs (Finley Brooks) → open a Request
// Transcript instance → expand panels → note. (PDF steps 15–26)
// Staging: the channel has no pre-existing run, so we START one from the
// channel — Start workflow → Simple Credential Issuance → land on the instance
// page — then expand panels and add a note on Avery Chen.
const CHANNEL = process.env.WT_WF_CHANNEL ?? (IS_STAGING ? 'Avery Chen' : 'Finley Brooks')
const NOTE = 'This is for End to End Testing'

test('Section 4 — Workflow instance + channel note', async ({ page }) => {
  // test.skip(IS_STAGING, 'Merged into Section 3 (Channels + Workflow) on staging per Crms1b.')
  await signIn(page)

  if (IS_STAGING) {
    await test.step('Open the channel → Start workflow (Simple Credential Issuance)', async () => {
      await page.goto('/dashboard/channels')
      await page.getByPlaceholder(/Search by name/i).fill(CHANNEL)
      await page.waitForTimeout(600)
      await page.getByText(CHANNEL, { exact: true }).first().click()
      await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible()
      await shot(page, '04', '15', 'channel-overview')
      await page.getByRole('button', { name: /Start workflow/i }).first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText(/Start a workflow/i)).toBeVisible()
      await dialog.getByText(/Select a template/i).first().click()
      await page.getByRole('option', { name: /Simple Credential Issuance/i }).first().click()
      await shot(page, '04', '16', 'start-workflow-dialog')
      await dialog.getByRole('button', { name: /Start workflow/i }).click()
      await expect(page.getByRole('heading', { name: /Simple Credential Issuance/i })).toBeVisible({ timeout: 20_000 })
      await shot(page, '04', '17', 'workflow-instance')
    })

    await test.step('Expand Channel Info / History / Instance Data', async () => {
      for (const [i, sec] of ['CHANNEL INFO', 'HISTORY', 'INSTANCE DATA'].entries()) {
        const el = page.getByText(new RegExp('^' + sec + '$', 'i')).first()
        if (await el.count()) {
          await el.click().catch(() => {})
          await page.waitForTimeout(400)
          await shot(page, '04', `19.${i + 1}`, sec.toLowerCase().replace(/ /g, '-'))
        }
      }
    })

    await test.step('Back to channel → Settings → add + verify note', async () => {
      await page.getByRole('button', { name: /Back to channel/i })
        .or(page.getByText(/Back to channel/i)).first().click().catch(() => {})
      await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible({ timeout: 15_000 })
      await page.getByRole('tab', { name: 'Settings' }).click()
      const note = page.getByRole('textbox', { name: /Add a note for this channel/i })
      await note.fill(NOTE)
      await shot(page, '04', '25', 'note-typed')
      await page.getByRole('button', { name: 'Save note' }).click()
      await page.waitForTimeout(800)
      await page.getByRole('tab', { name: 'Activity' }).click()
      await page.waitForTimeout(300)
      await page.getByRole('tab', { name: 'Settings' }).click()
      await expect(page.getByText(NOTE)).toBeVisible()
      await shot(page, '04', '26', 'note-persisted')
    })
    return
  }

  await test.step('15. Open the channel and its Workflows tab', async () => {
    await page.goto('/dashboard/channels')
    await page.getByText(CHANNEL, { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible()
    await page.getByRole('tab', { name: 'Workflows' }).click()
    await page.waitForTimeout(500)
    await shot(page, '04', '15', 'workflows-tab')
  })

  await test.step('16–17. Open a Request Transcript run', async () => {
    // Scope to the tab panel — a "Request Transcript" also exists pinned in the sidebar.
    await page.getByRole('tabpanel').getByRole('link', { name: 'Request Transcript' }).first().click()
    await expect(page.getByRole('heading', { name: 'Request Transcript' })).toBeVisible()
    await shot(page, '04', '17', 'request-transcript')
  })

  await test.step('18–21. Expand Channel Info, History, Instance Data', async () => {
    for (const [i, sec] of ['CHANNEL INFO', 'HISTORY', 'INSTANCE DATA'].entries()) {
      await page.getByText(new RegExp('^' + sec + '$', 'i')).first().click()
      await page.waitForTimeout(400)
      await shot(page, '04', `19.${i + 1}`, sec.toLowerCase().replace(/ /g, '-'))
    }
  })

  await test.step('22. Back to channel', async () => {
    await page.getByRole('button', { name: /Back to channel/i })
      .or(page.getByText(/Back to channel/i)).first().click()
    await expect(page.getByRole('heading', { name: CHANNEL })).toBeVisible()
    await shot(page, '04', '22', 'back-to-channel')
  })

  await test.step('23–25. Activity → Settings → add note → save', async () => {
    await page.getByRole('tab', { name: 'Activity' }).click()
    await page.waitForTimeout(400)
    await shot(page, '04', '23', 'activity')
    await page.getByRole('tab', { name: 'Settings' }).click()
    const note = page.getByRole('textbox', { name: /Add a note for this channel/i })
    await note.fill(NOTE)
    await shot(page, '04', '25', 'note-typed')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.waitForTimeout(800)
  })

  await test.step('26. Re-verify the note persisted (Activity → Settings)', async () => {
    await page.getByRole('tab', { name: 'Activity' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('tab', { name: 'Settings' }).click()
    await expect(page.getByText(NOTE)).toBeVisible()
    await shot(page, '04', '26', 'note-persisted')
  })
})
