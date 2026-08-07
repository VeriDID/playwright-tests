import { test, expect } from '@playwright/test'
import path from 'path'
import { signIn, shot, IS_STAGING } from './support/app'

// Section 6 (variant) — Credential Designer: compose the college card on the
// Test Design — a Text ("Chris Oladimeji", white, size 24) centered, the
// Cape Fear Community College logo (cape-fear.png) top-right, and the DigiCred
// College logo (digicred-college.png) top-left. Ends holding on the finished
// card (no Save — an image-composed design does not survive an automated Save).
// Uses the same drag/select/upload technique proven in 06-credential-designer.
const IMG = path.join(__dirname, 'assets', 'cape-fear.png')
const LOGO = path.join(__dirname, 'assets', 'digicred-college.png')
const NAME = 'Chris Oladimeji'

test('Section 6 variant — Credential Designer (college card)', async ({ page }) => {
  test.skip(IS_STAGING, 'Staging has no saved credential design; Section 6 variant is skipped there.')
  await signIn(page)
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
      if (await cardEls.count() > before) return
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
  async function selectEl(loc: import('@playwright/test').Locator) {
    const b = await loc.boundingBox()
    if (!b) throw new Error('cannot select element — no bounding box')
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForTimeout(300)
  }
  // Select the card itself (click an empty part of it) and set its gradient
  // background colours (matches the tester's saved college card: #03089b→#0f1f33).
  async function setCardBackground(hex1: string, hex2: string) {
    const b = await card.boundingBox()
    if (!b) throw new Error('card not found')
    await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5)
    await page.waitForTimeout(400)
    const setHex = async (name: string, hex: string, fallbackIndex: number) => {
      const named = page.getByRole('textbox', { name })
      if (await named.count()) {
        await named.first().fill(hex); await named.first().press('Enter')
      } else {
        // fallback: hex-valued textboxes appear in panel order (bg, then gradient)
        const all = page.locator('input')
        await all.nth(fallbackIndex).fill(hex); await all.nth(fallbackIndex).press('Enter')
      }
      await page.waitForTimeout(300)
    }
    await setHex('Background color', hex1, 0)
    await setHex('Gradient second color', hex2, 1)
  }
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
  async function uploadTo(file: string) {
    const btn = page.getByRole('button', { name: /change image|upload image|upload/i }).first()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      btn.click(),
    ])
    await chooser.setFiles(file)
    await page.waitForTimeout(1500)
  }
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
    await shot(page, '06c', '0', 'cleared')
  })

  await test.step('0b. Set card background (solid lighter blue #03089b)', async () => {
    // Both gradient stops = #03089b → a uniform solid bright blue so the dark
    // Cape Fear logo stands out across the whole card.
    await setCardBackground('#03089b', '#03089b')
    await shot(page, '06c', '0b', 'background')
  })

  await test.step('1a. Add Text → "Chris Oladimeji"', async () => {
    await addEl('Text', P(0.5, 0.5))
    await page.getByText('New text', { exact: false }).first().click()
    await page.getByRole('textbox', { name: 'Text content' }).fill(NAME)
    await expect(page.getByText(NAME)).toBeVisible()
    await shot(page, '06c', '1a', 'text-renamed')
  })

  await test.step('1b. Style text — white, size 24, centered', async () => {
    await setColor('#ffffff')
    await setFontSize(24)
    await setXY(70, 120)
    await shot(page, '06c', '1b', 'text-styled')
  })

  await test.step('1c. Add Image → cape-fear.png → top-right', async () => {
    await addEl('Image', P(0.62, 0.4))
    await selectEmptyEl()
    await uploadTo(IMG)
    await expect(cardImgs).toHaveCount(1)
    await setXY(255, 20)
    await shot(page, '06c', '1c', 'cape-fear-top-right')
  })

  await test.step('1d. Add Logo → digicred-college.png → top-left', async () => {
    await addEl('Logo', P(0.38, 0.4))
    await selectEmptyEl()
    await uploadTo(LOGO)
    await expect(cardImgs).toHaveCount(2)
    await setXY(0, 3)
    await shot(page, '06c', '1d', 'digicred-college-top-left')
  })

  await test.step('1e. Composed college card', async () => {
    await expect(page.getByText(NAME)).toBeVisible()
    await expect(cardImgs).toHaveCount(2)
    await page.waitForTimeout(2000)
    await shot(page, '06c', '1e', 'composed-college-card')
  })
})
