// The website shows each example twice: a live preview and copyable files
// (site/examples.ts) that load the browser bundle. These tests run the copyable
// files against the built bundle, so the code people copy keeps working.
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import scrollSpyExamples from '../../site/examples'

const bundle = (pkg: string) =>
  fileURLToPath(new URL(`../../dist/browser/${pkg}.global.js`, import.meta.url))

type Example = { id: string; files: { html: string; css?: string; js: string } }

const open = async (page: import('@playwright/test').Page, pkg: string, example: Example) => {
  await page.setContent(
    `<!doctype html><html><head><style>${example.files.css ?? ''}</style></head><body><main>${example.files.html}</main></body></html>`
  )
  await page.addScriptTag({ path: bundle(pkg) })
  await page.addScriptTag({ content: example.files.js })
}

const find = <T extends Example>(list: readonly T[], id: string) =>
  list.find(item => item.id === id)!

test.describe('scroll-spy copyable examples', () => {
  const openDocument = async (page: import('@playwright/test').Page, example: Example) => {
    const script = readFileSync(bundle('scroll-spy'), 'utf8')
    await page.setContent(
      `<!doctype html><html lang="en"><head><style>${example.files.css ?? ''}</style></head><body><main>${example.files.html}</main><script>${script}</script><script>${example.files.js}</script></body></html>`
    )
  }
  const current = (page: import('@playwright/test').Page) =>
    page.locator('nav [aria-current]').evaluateAll(links => links.map(l => l.textContent))
  /** Put the section's top just below the top of the scrolling box. */
  const reach = (page: import('@playwright/test').Page, box: string, id: string) =>
    page.evaluate(
      ([box, id]) => {
        const root = document.querySelector(box)!
        const top = document.getElementById(id)!.getBoundingClientRect().top
        root.scrollTo({
          top: root.scrollTop + top - root.getBoundingClientRect().top - 10,
          behavior: 'instant',
        })
      },
      [box, id] as const
    )

  test('the table of contents follows the article and holds a clicked link', async ({ page }) => {
    await openDocument(page, find(scrollSpyExamples, 'toc'))
    await expect.poll(() => current(page)).toEqual(['Overview'])
    await reach(page, '#article', 'install')
    await expect.poll(() => current(page)).toEqual(['Install'])
    await page.getByRole('link', { name: 'FAQ' }).click()
    await expect.poll(() => current(page)).toEqual(['FAQ'])
    await page.waitForTimeout(800)
    expect(await current(page)).toEqual(['FAQ'])
  })

  test('the one-page menu sets its class and the hash without history entries', async ({
    page,
  }) => {
    await openDocument(page, find(scrollSpyExamples, 'menu'))
    const length = await page.evaluate(() => history.length)
    await reach(page, '#page', 'work')
    await expect(page.locator('.menu a.is-active')).toHaveText('Work')
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#work')
    expect(await page.evaluate(() => history.length)).toBe(length)
  })

  test('a long navigation scrolls itself, never the page', async ({ page }) => {
    await openDocument(page, find(scrollSpyExamples, 'long'))
    await page.locator('#book').evaluate(box => box.scrollTo({ top: 1e5, behavior: 'instant' }))
    await expect.poll(() => current(page)).toEqual(['Chapter 12'])
    await expect.poll(() => page.locator('nav').evaluate(nav => nav.scrollTop)).toBeGreaterThan(0)
    await expect(page.locator('nav [aria-current]')).toBeInViewport()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
})
