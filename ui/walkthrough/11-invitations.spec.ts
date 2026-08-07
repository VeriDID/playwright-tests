import { test, expect, type Page } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 11 — Invitations (from invitations.pdf). Ensure the operator has the
// Registrar role, then create a multi-use CrMS invitation, view its QR, copy the
// URL, edit, archive and delete it. Self-cleaning. Requires the Registrar role
// (the invitation UI is gated on it) — added idempotently if missing.
const OPERATOR = process.env.DEMO_USER ?? 'chris@verid.id'
// Staging PDF: Name "Meridian College", GenericChannel, Simple Credential
// Issuance. Demo: Student Invite / StudentChannel / School Welcome.
const INV_NAME = IS_STAGING ? 'Meridian College' : 'Student Invite'
const INV_CHANNEL_TYPE = IS_STAGING ? 'GenericChannel' : 'StudentChannel'
const INV_WORKFLOW = IS_STAGING ? 'Simple Credential Issuance' : 'School Welcome'

async function closeDialogs(page: Page) {
  for (let i = 0; i < 3 && (await page.getByRole('dialog').count()); i++) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  }
}

// Open the row-action (kebab) menu for the operator on the Users page.
async function openOperatorMenu(page: Page) {
  const s = page.getByPlaceholder(/Search users/i)
  if (await s.count()) { await s.fill(''); await s.fill(OPERATOR); await page.waitForTimeout(1000) }
  const kebab = page.getByRole('row', { name: new RegExp(OPERATOR) }).first().getByRole('button').last()
  const menuItem = page.getByRole('menuitem', { name: /Manage roles/ }).first()
  for (let attempt = 0; attempt < 3; attempt++) {
    await kebab.click()
    if (await menuItem.isVisible({ timeout: 4000 }).catch(() => false)) return
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  }
  throw new Error('operator row action menu did not open')
}

// Locate a specific invitation row by its Name.
const invRow = (page: Page) => page.getByRole('row', { name: new RegExp(INV_NAME) }).first()

// Delete any existing invitation of this name (idempotent pre/post clean).
async function deleteInvitationIfPresent(page: Page) {
  await page.goto('/dashboard/invitations')
  await page.waitForTimeout(1000)
  const search = page.getByPlaceholder(/Search invitations/i)
  if (await search.count()) { await search.fill(INV_NAME); await page.waitForTimeout(800) }
  for (let i = 0; i < 4 && (await invRow(page).count()); i++) {
    await invRow(page).getByRole('button', { name: /Delete/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Delete/i }).click()
    await page.waitForTimeout(1000)
  }
}

test('Section 11 — Invitations (registrar → create → QR → copy → edit → archive → delete)', async ({ page }) => {
  await signIn(page)

  await test.step('3. Ensure the operator has the Registrar role', async () => {
    await page.goto('/dashboard/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await openOperatorMenu(page)
    await page.getByRole('menuitem', { name: /Manage roles/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await shot(page, '11', '3a', 'manage-roles')
    // "Registrar" text present before opening the dropdown = it's a current-role chip.
    const alreadyRegistrar = (await dialog.getByText('Registrar', { exact: true }).count()) > 0
    if (!alreadyRegistrar) {
      await dialog.getByText('Select a role', { exact: false }).click()
      await page.getByRole('option', { name: 'Registrar' }).click()
      await dialog.getByRole('button', { name: 'Add', exact: true }).click()
      await page.waitForTimeout(600)
      await shot(page, '11', '3b', 'registrar-added')
    } else {
      console.log('Operator already has the Registrar role — skipping add.')
    }
    await closeDialogs(page)
  })

  if (!IS_STAGING) {
    await test.step('Pre-clean any leftover invitation', async () => {
      await deleteInvitationIfPresent(page)
    })
  }

  await test.step('2 / 4. Go to Invitations → Create invitation', async () => {
    await page.goto('/dashboard/invitations')
    await expect(page.getByRole('heading', { name: 'Invitations' })).toBeVisible()
    await shot(page, '11', '2', 'invitations')
    await page.getByRole('button', { name: /Create invitation/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  await test.step('5. Fill the New CrMS Invitation form', async () => {
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: /Name/i }).first().fill(INV_NAME)
    // Channel type + Default workflow are custom comboboxes (options render in a portal).
    await dialog.getByRole('combobox', { name: 'Channel type' }).click()
    await page.getByRole('option', { name: INV_CHANNEL_TYPE, exact: true }).click()
    await dialog.getByRole('combobox', { name: 'Default workflow' }).click()
    await page.getByRole('option', { name: INV_WORKFLOW, exact: true }).click()
    // Issuer DID: left blank. Multi-use: leave default (on).
    // Expires at: today (best-effort — masked textbox; the field is optional, so a
    // mask quirk must not fail the section).
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const val = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T23:59`
    try {
      const exp = dialog.getByRole('textbox', { name: 'Expires at' })
      await exp.fill(val, { timeout: 4000 })
    } catch { console.log('Expires-at fill skipped (optional field / mask) — leaving permanent.') }
    await shot(page, '11', '5', 'invitation-form')
    await dialog.getByRole('button', { name: /Create invitation/i }).click()
  })

  await test.step('QR shown → Done', async () => {
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/Share the URL below|Scan to connect/i).first()).toBeVisible({ timeout: 20_000 })
    await shot(page, '11', '5b', 'qr-created')
    await dialog.getByRole('button', { name: /Done/i }).click()
    await page.waitForTimeout(800)
  })

  await test.step('6. View QR code from the row', async () => {
    const search = page.getByPlaceholder(/Search invitations/i)
    if (await search.count()) { await search.fill(INV_NAME); await page.waitForTimeout(800) }
    await expect(invRow(page)).toBeVisible()
    await invRow(page).getByRole('button', { name: /View QR code/i }).click()
    await expect(page.getByRole('dialog').getByText(/Scan to connect|Invitation QR Code/i).first()).toBeVisible()
    await shot(page, '11', '6', 'view-qr')
    await closeDialogs(page)
  })

  await test.step('7. Copy invitation URL', async () => {
    await invRow(page).getByRole('button', { name: /Copy invitation URL/i }).click()
    await page.waitForTimeout(400)
    await shot(page, '11', '7', 'copy-url')
  })

  await test.step('8. Edit invitation', async () => {
    await invRow(page).getByRole('button', { name: /^Edit/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/Edit Invitation/i)).toBeVisible()
    await shot(page, '11', '8', 'edit')
    await dialog.getByRole('button', { name: /Cancel/i }).click().catch(() => closeDialogs(page))
  })

  // Staging: per Chris's decision, follow the PDF and LEAVE the invitation
  // (no archive/delete). Demo: full lifecycle incl. self-cleaning delete.
  if (IS_STAGING) {
    await test.step('Leave the invitation in place (staging)', async () => {
      await shot(page, '11', '10', 'invitation-left')
      console.log(`Section 11 (staging): left "${INV_NAME}" in place per the PDF (no delete).`)
    })
  } else {
    await test.step('9. Archive invitation', async () => {
      // Archive is only offered on active invitations; tolerate its absence.
      const archive = invRow(page).getByRole('button', { name: /Archive/i })
      if (await archive.count()) {
        await archive.click()
        await page.waitForTimeout(800)
        await shot(page, '11', '9', 'archived')
      } else {
        console.log('Archive button not present on this row — skipping.')
      }
    })

    await test.step('10. Delete invitation (cleanup) + verify gone', async () => {
      await deleteInvitationIfPresent(page)
      await shot(page, '11', '10', 'deleted')
      const search = page.getByPlaceholder(/Search invitations/i)
      if (await search.count()) { await search.fill(INV_NAME); await page.waitForTimeout(800) }
      await expect(page.getByText(INV_NAME, { exact: true })).toHaveCount(0)
    })
  }
})
