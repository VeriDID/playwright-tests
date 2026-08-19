import { test, expect } from '@playwright/test'
import { signIn, shot, IS_STAGING } from './support/app'

// A channel name that exists in each environment, for the search demo.
const SEARCH_NAME = IS_STAGING ? 'Avery' : 'Alex'

// Section 2 — Channels list view: demonstrate sort (every column), filter
// (type + status tabs), search, and pagination count. (PDF steps 3–6)
test('Section 2 — Channels list (sort / filter / search / pagination)', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard/channels')
  await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible()
  await page.waitForTimeout(500)
  await shot(page, '02', '0', 'channels')

  await test.step('3. Sort each column one by one', async () => {
    for (const [i, col] of ['STATE', 'TYPE', 'NAME', 'CREATED AT', 'UPDATED AT'].entries()) {
      await page.waitForTimeout(400)
      await page.getByRole('columnheader', { name: new RegExp(col, 'i') }).click()
      await page.waitForTimeout(400)
      await shot(page, '02', `3.${i + 1}`, `sort-${col.toLowerCase().replace(/ /g, '-')}`)
    }
  })

  await test.step('4. Filter by type (All types → StudentChannel)', async () => {
    await page.getByText('All types', { exact: true }).first().click()
    await page.waitForTimeout(500)
    await shot(page, '02', '4.1', 'type-dropdown-open')
    await page.getByRole('option', { name: 'StudentChannel', exact: true }).click()
    await expect(page.getByText(/StudentChannel/).first()).toBeVisible()
    await shot(page, '02', '4.2', 'type-studentchannel')
  })

  await test.step('5. Filter → Active', async () => {
    await page.getByRole('button', { name: 'Active', exact: true })
      .or(page.getByText('Active', { exact: true })).first().click()
    await page.waitForTimeout(500)
    await shot(page, '02', '5', 'filter-active')
  })

  await test.step('6. Filter → Invitation', async () => {
    await page.getByRole('button', { name: 'Invitation', exact: true })
      .or(page.getByText('Invitation', { exact: true })).first().click()
    await page.waitForTimeout(500)
    await shot(page, '02', '6', 'filter-invitation')
    // reset to All
    await page.getByRole('button', { name: 'All', exact: true })
      .or(page.getByText('All', { exact: true })).first().click()
    await page.waitForTimeout(300)
  })

  await test.step('Search + pagination count', async () => {
    const search = page.getByPlaceholder(/Search by name/i)
    await search.fill(SEARCH_NAME)
    await page.waitForTimeout(600)
    await shot(page, '02', '7', `search-${SEARCH_NAME.toLowerCase()}`)
    await search.clear()
    await page.waitForTimeout(400)
    const count = await page.getByText(/of \d+ channels/i).innerText().catch(() => '')
    console.log('Channels pagination count:', count)
    await shot(page, '02', '8', 'pagination-count')
  })
})
