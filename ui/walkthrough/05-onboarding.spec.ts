import { test, expect, type Page } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 5 — Onboarding: look up a student, create an invitation, verify it
// appears in Channels, then remove it (self-cleaning). Auto-rotates the subject
// id and skips ones that don't resolve OR that already have a channel on the
// shared demo. A student who is already onboarded shows an "active" channel
// (the product refuses to create a duplicate invitation), which would never
// appear under the Invitation filter — and must never be removed by our
// cleanup. So we only ever onboard a genuinely channel-less subject. (PDF 27–36)

// Known-valid subject-id pool (mock High School SIS). Rotated per run.
const POOL = [3, 7, 11, 15, 17, 19, 23, 25, 27, 29]

/** True if a channel with this exact name already exists on the demo. */
async function channelExists(page: Page, name: string): Promise<boolean> {
  await page.goto('/dashboard/channels')
  await page.getByPlaceholder(/Search by name/i).fill(name)
  await page.waitForTimeout(800)
  return (await page.getByText(name, { exact: true }).count()) > 0
}

test('Section 5 — Onboarding → invitation → verify → remove', async ({ page }) => {
  await signIn(page)

  // ── STAGING: Kiosk-mode "Staging HS" onboarding (per the 5 Aug staging PDF).
  // Look up a Student ID → Confirm and Create Invitation → QR → Done. Runs once
  // in Kiosk mode, once outside it. Per Chris's decision we DON'T remove the
  // invitation afterwards, and we tolerate "An invitation already exists".
  if (IS_STAGING) {
    const fillId = async (id: string) => {
      const f = page.getByTestId('onboarding-subject-id').or(page.getByRole('textbox', { name: /Student ID/i }))
      await f.first().waitFor({ timeout: 15_000 })
      await f.first().fill(id)
    }
    const lookUp = async () => {
      await page.getByTestId('onboarding-lookup').or(page.getByRole('button', { name: /Look Up/i })).first().click()
    }
    // Confirm-and-create if offered, else accept an already-existing invitation;
    // either way end on the QR + Done.
    const createOrReuse = async (id: string, tag: string) => {
      await fillId(id)
      await lookUp()
      const confirm = page.getByRole('button', { name: /Confirm and Create Invitation/i })
      if (await confirm.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await shot(page, '05', `${tag}a`, 'confirm-record')
        await confirm.click()
      } else {
        console.log(`Section 5 (${id}): no Confirm button — an invitation already exists for this subject (accepted).`)
      }
      const done = page.getByRole('button', { name: /^Done$/ })
      await done.waitFor({ timeout: 20_000 })
      await shot(page, '05', `${tag}b`, 'invitation-qr')
      await done.click()
      await page.waitForTimeout(800)
    }

    await test.step('a–e. Kiosk mode → Staging HS → Look Up → Confirm & Create → Done → exit', async () => {
      await page.goto('/dashboard/onboarding')
      await expect(page.getByRole('heading', { name: 'Onboarding' })).toBeVisible()
      // Enable the new Kiosk-mode toggle (best-effort — the create flow works
      // either way; don't fail the section if the toggle can't be resolved).
      try {
        const kiosk = page.getByRole('switch', { name: /Kiosk/i })
        if (await kiosk.count()) await kiosk.first().click()
        else await page.getByText('Kiosk mode', { exact: true })
          .locator('xpath=ancestor::*[2]').getByRole('switch').first().click({ timeout: 4000 })
        await page.waitForTimeout(1000)
      } catch { console.log('Section 5: Kiosk-mode toggle not resolved — continuing without full-screen.') }
      await shot(page, '05', '1', 'kiosk-staging-hs')
      await createOrReuse('UHS-2024-008', '28')
      // exit kiosk full-screen via the X (upper-right); fall back to Escape.
      const x = page.getByRole('button', { name: /^(Close|Exit|×|✕|X)$/i })
      if (await x.count()) await x.first().click().catch(() => {})
      else await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(800)
    })

    await test.step('f–l. Non-kiosk → Staging HS → Look Up another ID → Confirm & Create → Done', async () => {
      await page.goto('/dashboard/onboarding')
      await expect(page.getByRole('heading', { name: 'Onboarding' })).toBeVisible()
      await createOrReuse('UHS-2024-012', '33')
      await shot(page, '05', '34', 'invitation-created')
    })
    return
  }

  // vary the starting point without Date/Math.random
  await page.goto('/dashboard/channels')
  await page.waitForTimeout(1200)
  const start = (await page.getByText(/StudentChannel/).count()) % POOL.length

  let chosenId = ''
  let studentName = ''

  await test.step('27–29. Onboardings → find a fresh, channel-less Student ID → Look Up', async () => {
    for (let k = 0; k < POOL.length; k++) {
      const n = POOL[(start + k) % POOL.length]
      const id = `UHS-2024-${String(n).padStart(3, '0')}`
      await page.goto('/dashboard/onboarding')
      await page.getByTestId('onboarding-subject-id').waitFor()
      await page.getByTestId('onboarding-subject-id').fill(id)
      if (k === 0) await shot(page, '05', '28', 'student-id-entered')
      await page.getByTestId('onboarding-lookup').click()
      const ok = await page.getByRole('button', { name: 'Confirm and Create Invitation' })
        .isVisible({ timeout: 15_000 }).catch(() => false)
      if (!ok) continue // id doesn't resolve — try the next one
      const body = await page.locator('body').innerText()
      const name = (body.match(/Name\s*\n\s*([^\n]+)\s*\nSchool/) || [, ''])[1].trim()
      if (!name) continue
      // Skip students who already have a channel: their invitation would be an
      // existing "active" one (not a fresh pending invite), and removing it
      // would delete real demo data.
      if (await channelExists(page, name)) {
        console.log(`Skipping ${id} → ${name} (already has a channel)`)
        continue
      }
      chosenId = id
      studentName = name
      break
    }
    expect(chosenId, 'a channel-less onboarding id resolved').not.toBe('')
    console.log(`Onboarding: ${chosenId} → ${studentName}`)
  })

  await test.step('30–32. Confirm & Create Invitation → QR → Done', async () => {
    // Re-open the lookup (we navigated away to Channels to verify uniqueness).
    await page.goto('/dashboard/onboarding')
    await page.getByTestId('onboarding-subject-id').waitFor()
    await page.getByTestId('onboarding-subject-id').fill(chosenId)
    await page.getByTestId('onboarding-lookup').click()
    await expect(page.getByRole('button', { name: 'Confirm and Create Invitation' }))
      .toBeVisible({ timeout: 15_000 })
    await shot(page, '05', '29', 'confirm-record')
    await page.getByRole('button', { name: 'Confirm and Create Invitation' }).click()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible({ timeout: 20_000 })
    await shot(page, '05', '31', 'qr-invitation')
    await page.getByRole('button', { name: 'Done' }).click()
  })

  await test.step('33. Channels shows the new invitation', async () => {
    await page.goto('/dashboard/channels')
    // Find the freshly-created channel by name (robust to its state), then show
    // it under the Invitation filter for the stakeholder walkthrough.
    await page.getByPlaceholder(/Search by name/i).fill(studentName)
    await expect(page.getByText(studentName, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
    await page.getByPlaceholder(/Search by name/i).clear()
    await page.getByText('Invitation', { exact: true }).first().click() // filter → invitations
    await page.waitForTimeout(800)
    await shot(page, '05', '33', 'invitation-in-channels')
  })

  await test.step('34–36. Open the new channel → Settings → Remove (cleanup)', async () => {
    await page.getByPlaceholder(/Search by name/i).fill(studentName)
    await page.waitForTimeout(600)
    await page.getByText(studentName, { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: studentName })).toBeVisible()
    await page.getByRole('tab', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Remove channel' }).click()
    // confirm dialog "Are you sure?" → Remove channel
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Remove channel' }).click()
    await expect(page).toHaveURL(/\/dashboard\/channels\/?$/, { timeout: 15_000 })
    await shot(page, '05', '36', 'channel-removed')
    // verify gone
    await page.getByPlaceholder(/Search by name/i).fill(studentName)
    await page.waitForTimeout(600)
    await expect(page.getByText(studentName, { exact: true })).toHaveCount(0)
  })
})
