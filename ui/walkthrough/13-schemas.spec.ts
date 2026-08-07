import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 13 — Schemas (staging only). Full flow from crms1.pdf:
// Schemas → Publish schema (Staging_Test_Scheme + attributes Phase/name/date) →
// + Publish credential definition (Policy 1, College Template design, tag test1)
// → open the cred-def → Exchanges/Details/OCA Bundle → Form→JSON → text/tree/table
// → Back to credentials. Uses a UNIQUE schema name per run so re-runs don't
// collide (leaves data behind, per Chris's decision).
test('Section 13 — Schemas (publish schema + credential definition + OCA)', async ({ page }) => {
  test.skip(!IS_STAGING, 'Schemas create-flow is part of the staging walkthrough only.')
  await signIn(page)
  const SCHEMA = `Staging_Test_Scheme_${String(Date.now()).slice(-6)}`
  const TAG = 'test1'

  await test.step('3–4. Schemas → Publish schema', async () => {
    await page.getByRole('link', { name: 'Schemas', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Schemas' })).toBeVisible()
    await shot(page, '13', '1', 'schemas')
    await page.getByRole('button', { name: /Publish schema/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/Start from a preset/i)).toBeVisible()
  })

  await test.step('5–6. Name + attributes (Phase / name / date) → Publish', async () => {
    const d = page.getByRole('dialog')
    await d.getByRole('textbox', { name: /Schema name/i })
      .or(d.getByPlaceholder(/Schema name/i)).first().fill(SCHEMA)
    // Add each attribute: type into "Add attribute name", then click the add
    // button (labelled "+ common.add" — an untranslated key on staging).
    const attrInput = d.getByRole('textbox', { name: /attribute/i }).or(d.getByPlaceholder(/Add attribute name/i)).first()
    const addBtn = d.getByRole('button', { name: /common\.add|add field|^\+?\s*add$/i }).first()
    for (const attr of ['Phase', 'name', 'date']) {
      await attrInput.fill(attr)
      if (await addBtn.count()) await addBtn.click()
      else await attrInput.press('Enter')
      await page.waitForTimeout(400)
    }
    await shot(page, '13', '6', 'schema-form')
    await d.getByRole('button', { name: /^Publish$/i }).click()
    await expect(page.getByRole('heading', { name: new RegExp(SCHEMA) })).toBeVisible({ timeout: 20_000 })
    await shot(page, '13', '7', 'schema-page')
  })

  await test.step('8–12. Publish credential definition (Policy 1 · College Template · tag test1)', async () => {
    await page.getByRole('button', { name: /Publish credential definition/i }).first().click()
    const d = page.getByRole('dialog')
    await expect(d.getByText(/Publish credential definition/i)).toBeVisible()
    // Tag: default → test1 (first textbox in the dialog).
    await d.getByRole('textbox').first().fill(TAG)
    // Kanon revocation tier → Policy 1 (native select if possible, else dropdown).
    const tier = d.getByRole('combobox').first()
    try { await tier.selectOption({ label: 'Policy 1' }) }
    catch {
      await tier.click()
      await page.getByRole('option', { name: 'Policy 1' })
        .or(page.getByText('Policy 1', { exact: true })).first().click()
    }
    await page.waitForTimeout(400)
    // Credential design: the cards are RADIOs — nth(0) is "No design", so the
    // first College Template is nth(1). Selecting it attaches the design so the
    // published cred-def's OCA bundle carries the branding.
    await d.getByRole('radio').nth(1).click()
    await page.waitForTimeout(400)
    await shot(page, '13', '11', 'cred-def-form')
    await d.getByRole('button', { name: /^Publish$/i }).click()
    await expect(page.getByText(new RegExp(TAG, 'i')).first()).toBeVisible({ timeout: 20_000 })
    await shot(page, '13', '12', 'cred-def-created')
  })

  await test.step('13–14. Open the cred-def → Exchanges / Details / OCA Bundle', async () => {
    await page.getByText(new RegExp('^' + TAG + '$', 'i')).first().click()
    await expect(page.getByRole('tab', { name: /OCA Bundle/i })).toBeVisible({ timeout: 15_000 })
    for (const t of ['Exchanges', 'Details', 'OCA Bundle']) {
      await page.getByRole('tab', { name: t }).click().catch(() => {})
      await page.waitForTimeout(500)
      await shot(page, '13', `14-${t.toLowerCase().replace(/ /g, '-')}`, t.toLowerCase())
    }
  })

  await test.step('15–16. OCA Bundle → Form→JSON → text / tree / table', async () => {
    await page.getByRole('button', { name: 'JSON', exact: true })
      .or(page.getByText('JSON', { exact: true })).first().click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, '13', '15', 'oca-json')
    for (const mode of ['text', 'tree', 'table']) {
      const b = page.getByRole('button', { name: new RegExp('^' + mode + '$', 'i') })
      if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(800) }
    }
    await shot(page, '13', '16', 'oca-json-views')
  })

  await test.step('17–18. Back to credentials', async () => {
    await page.getByRole('link', { name: /Back to credentials/i })
      .or(page.getByText(/Back to credentials/i)).first().click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, '13', '18', 'back-to-credentials')
  })
})
