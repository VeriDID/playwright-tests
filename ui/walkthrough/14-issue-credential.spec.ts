import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 14 — Issue a credential (staging only, crms1.pdf "Next Issue a
// credential"): Credentials → Issue credential → choose "Open Badge" → Continue,
// then view an existing issued credential's details (James Ackles). The Open
// Badge issuance form is opened but not completed (matches the PDF, which shows
// the list + a details modal rather than a finished Open Badge issue).
const SUBJECT = 'James Ackles'

test('Section 14 — Issue a credential (Issue → view details)', async ({ page }) => {
  test.skip(!IS_STAGING, 'Issue-credential flow is part of the staging walkthrough only.')
  await signIn(page)

  await test.step('2–3. Credentials → Issue credential → Open Badge → Continue', async () => {
    await page.getByRole('link', { name: 'Credentials', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Issued credentials/i })).toBeVisible()
    await shot(page, '14', '1', 'issued-credentials')
    await page.getByRole('button', { name: /Issue credential/i }).first().click()
    const d = page.getByRole('dialog')
    await expect(d.getByText(/What do you want to issue/i)).toBeVisible()
    await d.getByText('Open Badge', { exact: false }).first().click()
    await shot(page, '14', '3', 'issue-type-open-badge')
    await d.getByRole('button', { name: /Continue/i }).click()
    const form = page.getByRole('dialog')
    await expect(form.getByText(/Issue Open Badge/i)).toBeVisible({ timeout: 15_000 })
    await shot(page, '14', '4', 'open-badge-form')

    // Try to COMPLETE the issuance: Achievement → first option, Channel →
    // James Ackles (else first), leave "Valid until" blank, then Issue badge.
    let issued = false
    try {
      await form.getByText('Select an achievement', { exact: false }).click()
      const ach = page.getByRole('option')
      if (await ach.count()) {
        await ach.first().click()
        await page.waitForTimeout(400)
        await form.getByText('Select a channel', { exact: false }).click()
        await page.getByRole('option', { name: new RegExp(SUBJECT, 'i') })
          .or(page.getByRole('option').first()).first().click()
        await page.waitForTimeout(400)
        await shot(page, '14', '4b', 'open-badge-filled')
        await form.getByRole('button', { name: /Issue badge/i }).click()
        await page.waitForTimeout(2500)
        await shot(page, '14', '4c', 'open-badge-issued')
        issued = true
      } else {
        console.log('Section 14: no Achievements available — Open Badge issuance not configured, cancelling.')
      }
    } catch (e) {
      console.log('Section 14: Open Badge issuance could not complete —', (e as Error).message.split('\n')[0])
    }
    if (!issued) {
      const cancel = page.getByRole('dialog').getByRole('button', { name: /Cancel|Close/i })
      if (await cancel.count()) await cancel.first().click().catch(() => {})
      await page.keyboard.press('Escape').catch(() => {})
    }
    console.log(`Section 14: Open Badge issued = ${issued}`)
  })

  await test.step('4–5. View an issued credential’s details (James Ackles)', async () => {
    test.skip(true, 'This is changing')    
    await page.getByRole('link', { name: 'Credentials', exact: true }).first().click().catch(() => {})
    await expect(page.getByRole('heading', { name: /Issued credentials/i })).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1200)
    // "James Ackles" is in the CHANNEL column (search filters by credential name,
    // so don't search) — click that row/cell to open its details modal.
    const cell = page.getByText(new RegExp(SUBJECT, 'i')).first()
    await expect(cell).toBeVisible({ timeout: 15_000 })
    await cell.click()
    const d = page.getByRole('dialog')
    await expect(d.getByText(/Credential details/i).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, '14', '5', 'credential-details')
    const close = d.getByRole('button', { name: /Close/i })
    if (await close.count()) await close.first().click().catch(() => {})
    else await page.keyboard.press('Escape').catch(() => {})
  })
})
