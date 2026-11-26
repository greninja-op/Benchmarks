/* Headless debug: capture console errors + screenshots of the showcase. */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL || 'http://localhost:5173/'

const run = async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1600,900',
      '--no-first-run',
    ],
    defaultViewport: { width: 1600, height: 900 },
    protocolTimeout: 180000,
  })
  const page = await browser.newPage()
  const errors = []
  const logs = []
  page.on('console', (m) => {
    const t = `[${m.type()}] ${m.text()}`
    if (m.type() === 'error' || m.type() === 'warning') errors.push(t)
    else logs.push(t)
  })
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))
  page.on('requestfailed', (r) => errors.push('[requestfailed] ' + r.url() + ' :: ' + (r.failure()?.errorText || '')))

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 3500))

  fs.mkdirSync('shots', { recursive: true })
  await page.screenshot({ path: 'shots/00-hero.png' })

  // scroll through the page and snapshot key stages
  const stops = [0.06, 0.19, 0.32, 0.41, 0.48, 0.55, 0.65, 0.79, 0.90, 0.97]
  for (let i = 0; i < stops.length; i++) {
    const p = stops[i]
    await page.evaluate((pp) => {
      const limit = document.documentElement.scrollHeight - innerHeight
      window.scrollTo(0, limit * pp)
    }, p)
    await new Promise((r) => setTimeout(r, 2200))
    await page.screenshot({ path: `shots/${String(i + 1).padStart(2, '0')}-p${p}.png` })
    logs.push(`scrolled to ${p}`)
  }

  console.log('=== ERRORS ===')
  console.log(errors.length ? errors.join('\n') : '(none)')
  console.log('=== LOG TAIL ===')
  console.log(logs.slice(-12).join('\n'))
  await browser.close()
}

run().catch((e) => { console.error('RUNNER FAILED:', e); process.exit(1) })
