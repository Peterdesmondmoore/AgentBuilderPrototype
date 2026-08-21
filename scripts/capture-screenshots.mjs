import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'demo/package.json'))
const { chromium } = require('playwright')
const output = resolve(root, 'prototypes/laptop-sample/screenshots')
await mkdir(output, { recursive: true })

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(resolve(root, 'capture/laptop-sample.html')).href)
  await page.screenshot({ path: resolve(output, 'overview.png'), animations: 'disabled' })
  await page.locator('[data-capture-review]').click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: resolve(output, 'outcome-detail.png'), animations: 'disabled' })
} finally {
  await browser.close()
}
