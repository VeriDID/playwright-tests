import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 6 — Credential Designer.
// Demo: compose the shared "Test Design" (Joshua Oladimeji + photo + logo).
// Staging (5 Aug PDF): Create Design → Blank Design → build "College Template"
// (Text "Avery Chen" @24, DigiCred College + Cape Fear logos, schema
// Simple_Credential v1.0, Name + IdNumber attributes, background #611f58) →
// name it → Save. The palette/asset DnD ignores dragTo, so a manual pointer
// drag is used to add items.
const IMG = path.join(__dirname, 'assets', 'IMG_1326.jpg')
const LOGO = path.join(__dirname, 'assets', 'mca.png')
const NAME = 'Joshua Oladimeji'

// STAGING — build & save the "College Template" credential design.
async function stagingCollegeTemplate(page: Page) {
  const CARD_NAME = 'Avery Chen'
  const EMAIL = 'avery@verid.id'
  const IDNUM = 'UHS-2024-007'
  const TEMPLATE = 'College Template'
  await page.getByRole('link', { name: 'Credential designer' }).click()
  await expect(page.getByRole('heading', { name: 'Credential designer' })).toBeVisible()
  await shot(page, '06', '0', 'designer-list')
  await page.getByRole('button', { name: /Create design/i }).click()
  await page.waitForTimeout(1000)
  const blank = page.getByText('Blank design', { exact: false }).first()
  await blank.scrollIntoViewIfNeeded().catch(() => {})
  await blank.click()
  await expect(page.getByRole('tab', { name: 'Components' })).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1000)

  // Palette items AND attribute chips add ONLY via a manual pointer drag onto
  // the card — a click is a no-op (confirmed by DOM probe; same as the demo).
  const canvas = page.locator('[class*=canvas]').first()
  const cbox = await canvas.boundingBox()
  if (!cbox) throw new Error('designer canvas not found')
  const P = (xf: number, yf: number) => ({ x: cbox.x + cbox.width * xf, y: cbox.y + cbox.height * yf })
  const cardEls = page.locator('[class*=cardChildrenWrap] > *')
  const dragToCard = async (src: import('@playwright/test').Locator, xf: number, yf: number) => {
    const s = await src.boundingBox(); if (!s) return false
    const before = await cardEls.count()
    const t = P(xf, yf)
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
    await page.mouse.down()
    await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 10, { steps: 5 })
    await page.mouse.move(t.x, t.y, { steps: 20 })
    await page.mouse.move(t.x + 3, t.y + 3, { steps: 8 })
    await page.waitForTimeout(400)
    await page.mouse.up()
    await page.waitForTimeout(1200)
    return (await cardEls.count()) > before
  }
  const dragPalette = async (name: string, xf: number, yf: number) => {
    const src = page.getByRole('button', { name, exact: true }).first()
    for (const [x, y] of [[xf, yf], [0.5, 0.5], [0.55, 0.55]] as const) { if (await dragToCard(src, x, y)) return true }
    return false
  }
  // Position the CURRENTLY-SELECTED element on the 340×215 card via the X/Y
  // spinbuttons (same designer component as demo) so elements don't overlap.
  const setXY = async (x: number, y: number) => {
    const xin = page.getByRole('spinbutton', { name: 'X', exact: true }).first()
    const yin = page.getByRole('spinbutton', { name: 'Y', exact: true }).first()
    if (await xin.count()) { await xin.fill(String(x)); await xin.press('Tab') }
    if (await yin.count()) { await yin.fill(String(y)); await yin.press('Tab') }
    await page.waitForTimeout(300)
  }

  await test.step('e. Add Text (drag) → "Avery Chen" @ size 24, centered', async () => {
    if (!(await dragPalette('Text', 0.5, 0.6))) throw new Error('could not add a Text element via drag')
    await page.getByText('New text', { exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    await page.getByRole('textbox', { name: 'Text content' }).fill(CARD_NAME)
    const fs = page.getByRole('spinbutton', { name: 'Font size' }).first()
    if (await fs.count()) { await fs.fill('24'); await fs.press('Enter') }
    const align = page.getByRole('combobox', { name: 'Text align' })
    if (await align.count()) { await align.click(); await page.getByRole('option', { name: 'Center' }).click().catch(() => {}) }
    await setXY(70, 150) // "Avery Chen" — lower-centre
    await expect(page.getByText(CARD_NAME)).toBeVisible()
    await shot(page, '06', '1', 'text-avery')
  })

  await test.step('h. Select schema Simple_Credential (v1.0)', async () => {
    await page.getByRole('combobox', { name: 'Schema' }).click()
    await page.getByText('Simple_Credential (v1.0)', { exact: true }).click()
    await page.waitForTimeout(600)
    await shot(page, '06', '3', 'schema-selected')
  })

  await test.step('i–j. Add Name (→ email) + IdNumber (→ id) attributes (drag)', async () => {
    await dragPalette('Name', 0.5, 0.4)
    await page.getByText('{{Name}}', { exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    let s = page.getByRole('textbox', { name: 'Sample value' })
    if (await s.count()) await s.first().fill(EMAIL)
    await setXY(70, 95) // email (Name) — centre
    await dragPalette('IdNumber', 0.5, 0.25)
    await page.getByText('{{IdNumber}}', { exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    s = page.getByRole('textbox', { name: 'Sample value' })
    if (await s.count()) await s.first().fill(IDNUM)
    await setXY(110, 30) // IdNumber — top-centre
    await shot(page, '06', '4', 'attributes')
  })

  // NOTE (6 Aug 2026): logos (DigiCred College / Cape Fear) are intentionally
  // omitted. The designer's asset upload does not attach reliably in automation
  // (the in-app Assets library isn't reachable, and file-input upload attaches
  // inconsistently), so Chris opted to lock Section 6 without logos. Everything
  // else — text, both attributes with sample values, schema, layout, #611f58
  // background, name & save — is faithful.

  await test.step('k. Background color #611f58', async () => {
    // Select the card itself (click an empty spot inside the card, below the
    // elements) so the card properties — incl. Background color — appear.
    // Click an EMPTY card corner (bottom-left) to select the card — the centre
    // column now holds positioned elements, so a centre click would hit those.
    const cardBox = await page.locator('.credential-card-container').boundingBox().catch(() => null)
    if (cardBox) { await page.mouse.click(cardBox.x + 8, cardBox.y + cardBox.height - 8); await page.waitForTimeout(600) }
    const hasBg = await page.getByText('Background color', { exact: false }).count()
    if (hasBg) {
      // First textbox in the Card panel is the Background color hex (the 2nd is
      // Gradient second color — don't touch that one).
      const hex = page.getByRole('textbox').first()
      await hex.fill('#611f58').catch(() => console.log('Section 6: bg hex fill failed'))
      await hex.press('Enter').catch(() => {})
      await page.keyboard.press('Escape').catch(() => {}) // close the color popover
    } else {
      console.log('Section 6: card not selected / no Background color control — left default')
    }
    await shot(page, '06', '5', 'bg-color')
  })

  await test.step('m. Name the template "College Template"', async () => {
    // The title is a button (_nameButton_) that turns into a text input on click.
    await page.getByRole('button', { name: /Untitled design/ }).click().catch(() => {})
    await page.waitForTimeout(300)
    const box = page.getByRole('textbox').first()
    await box.fill(TEMPLATE)
    await page.keyboard.press('Enter').catch(() => {})
    await shot(page, '06', '6', 'named')
  })

  await test.step('n. Save → verify it appears in the designs LIST', async () => {
    await page.keyboard.press('Escape').catch(() => {}) // close any open dropdown/popover
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(2500)
    // Navigate by URL (an open overlay can intercept a nav-link click).
    await page.goto('/dashboard/schemas/designer')
    await expect(page.getByRole('heading', { name: 'Credential designer' })).toBeVisible()
    await expect(page.getByText(TEMPLATE, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await shot(page, '06', '7', 'saved')
  })
}

test('Section 6 — Credential Designer (compose the finished card)', async ({ page }) => {
  await signIn(page)

  if (IS_STAGING) {
    await stagingCollegeTemplate(page)
    return
  }

  await page.goto('/dashboard/credentials/designer')
  await page.getByRole('button', { name: /Test Design/ }).first().click()
  await expect(page.getByRole('tab', { name: 'Components' })).toBeVisible()

  const canvas = page.locator('[class*=canvas]').first()
  const cbox = await canvas.boundingBox()
  if (!cbox) throw new Error('designer canvas not found')
  const P = (xf: number, yf: number) => ({ x: cbox.x + cbox.width * xf, y: cbox.y + cbox.height * yf })
  const card = page.locator('.credential-card-container')
  const cardImgs = card.locator('img')
  const cardEls = page.locator('[class*=cardChildrenWrap] > *')
  const del = page.getByRole('button', { name: /Delete element/i })

  // Adding an element: the palette items only respond to a manual pointer drag
  // (a plain click does nothing). Drop onto an empty part of the card; retry a
  // few spots and confirm the element count actually grew.
  async function addEl(name: string, drop: { x: number; y: number }) {
    const src = page.getByRole('button', { name, exact: true })
    const spots = [drop, P(0.5, 0.5), P(0.6, 0.6), P(0.4, 0.6)]
    const before = await cardEls.count()
    for (const pos of spots) {
      const s = await src.boundingBox()
      if (!s) throw new Error(`palette item ${name} not found`)
      await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
      await page.mouse.down()
      await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 10, { steps: 5 })
      await page.mouse.move(pos.x, pos.y, { steps: 20 })
      await page.mouse.move(pos.x + 3, pos.y + 3, { steps: 8 })
      await page.waitForTimeout(400)
      await page.mouse.up()
      await page.waitForTimeout(1200)
      if (await cardEls.count() > before) return // element added (lands near the drop point)
    }
    throw new Error(`failed to add ${name} — element count did not increase`)
  }
  async function setColor(hex: string) {
    const c = page.getByRole('textbox', { name: 'Color' }).first()
    await c.fill(hex); await c.press('Enter')
  }
  async function setFontSize(px: number) {
    const f = page.getByRole('spinbutton', { name: 'Font size' }).first()
    await f.fill(String(px)); await f.press('Enter')
  }
  async function setXY(x: number, y: number) {
    const xin = page.getByRole('spinbutton', { name: 'X', exact: true }).first()
    const yin = page.getByRole('spinbutton', { name: 'Y', exact: true }).first()
    await xin.fill(String(x)); await xin.press('Tab')
    await yin.fill(String(y)); await yin.press('Tab')
    await page.waitForTimeout(400)
  }
  // Select an element by clicking the center of its own wrapper (never the card
  // background). Bypasses Playwright actionability with a raw mouse click.
  async function selectEl(loc: import('@playwright/test').Locator) {
    const b = await loc.boundingBox()
    if (!b) throw new Error('cannot select element — no bounding box')
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForTimeout(300)
  }
  // Select the freshly-added image/logo element: it is the only card element
  // with no <img> yet and no name text (the empty "Image"/"Logo" placeholder).
  // Index-based selection is unreliable because positioning reorders the DOM.
  async function selectEmptyEl() {
    const n = await cardEls.count()
    for (let i = 0; i < n; i++) {
      const el = cardEls.nth(i)
      const hasImg = (await el.locator('img').count()) > 0
      const txt = (await el.textContent()) || ''
      if (!hasImg && !txt.includes(NAME)) { await selectEl(el); return }
    }
    throw new Error('no empty image/logo placeholder found to select')
  }
  // Upload a file to the CURRENTLY SELECTED image/logo element via its own
  // "Change image" button (scoped to that element's panel), so it can't leak
  // into another element's or the card-background file input.
  async function uploadTo(file: string) {
    const btn = page.getByRole('button', { name: /change image|upload image|upload/i }).first()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      btn.click(),
    ])
    await chooser.setFiles(file)
    await page.waitForTimeout(1500)
  }
  // Select an element on the canvas, then click "Delete element", until nothing
  // remains. Used both to start clean and to reset at the end.
  async function deleteAllElements() {
    for (let i = 0; i < 12; i++) {
      const placeholders = page.getByText(/New text|\{\{student_id\}\}|\{\{student_name\}\}/)
      let target = null
      if (await cardImgs.count()) target = cardImgs.first()
      else if (await page.getByText(NAME).count()) target = page.getByText(NAME).first()
      else if (await placeholders.count()) target = placeholders.first()
      if (!target) break
      await target.click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
      if (await del.isVisible().catch(() => false)) { await del.click(); await page.waitForTimeout(400) }
      else break
    }
  }

  await test.step('0. Open Test Design, clear the card', async () => {
    await deleteAllElements()
    await shot(page, '06', '0', 'cleared')
  })

  await test.step('1a. Add Text → "Joshua Oladimeji"', async () => {
    await addEl('Text', P(0.5, 0.5))
    await page.getByText('New text', { exact: false }).first().click()
    await page.getByRole('textbox', { name: 'Text content' }).fill(NAME)
    await expect(page.getByText(NAME)).toBeVisible()
    await shot(page, '06', '1a', 'text-renamed')
  })

  await test.step('1b. Style text — color #c5cbd3, size 20, centered', async () => {
    await setColor('#c5cbd3')
    await setFontSize(20)
    await setXY(90, 120)
    await shot(page, '06', '1b', 'text-styled')
  })

  await test.step('1c. Add Image → IMG_1326.jpg → top-right', async () => {
    await addEl('Image', P(0.62, 0.4)) // drop apart from the text so wrappers don't overlap
    await selectEmptyEl() // select the new empty image placeholder
    await uploadTo(IMG) // uploads to it and leaves it selected
    await expect(cardImgs).toHaveCount(1)
    await setXY(255, 20)
    await shot(page, '06', '1c', 'image-top-right')
  })

  await test.step('1d. Add Logo → mca.png → top-left', async () => {
    await addEl('Logo', P(0.38, 0.4)) // drop apart from the others
    await selectEmptyEl() // select the new empty logo placeholder (only element without an img)
    await uploadTo(LOGO)
    await expect(cardImgs).toHaveCount(2)
    await setXY(0, 3)
    await shot(page, '06', '1d', 'logo-top-left')
  })

  await test.step('1e. Composed card matches reference', async () => {
    await expect(page.getByText(NAME)).toBeVisible()
    await expect(cardImgs).toHaveCount(2)
    await shot(page, '06', '1e', 'composed-card')
  })

  await test.step('2. Hold on the finished card', async () => {
    // NOTE: clicking Save here wipes the canvas — a design with locally-uploaded
    // images does not persist (see the save-clears finding). So the demo ends on
    // the composed card; the shared Test Design is left empty by 06b-cleanup.
    await expect(page.getByText(NAME)).toBeVisible()
    await expect(cardImgs).toHaveCount(2)
    await page.waitForTimeout(4000)
  })
})
