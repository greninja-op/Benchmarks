import puppeteer from 'puppeteer-core'

const stages = [
  ['hero', 0], ['color', 0.19], ['crown', 0.35], ['canopy', 0.52],
  ['detach', 0.65], ['exploded', 0.80], ['finale', 0.97],
]
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()) })
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 2500))
for (const [name, p] of stages) {
  await page.evaluate((frac) => {
    const max = document.documentElement.scrollHeight - innerHeight
    window.scrollTo(0, max * frac)
  }, p)
  await new Promise((r) => setTimeout(r, 4500))
  await page.screenshot({ path: `shot-${name}.png` })
  console.log('shot', name, p)
}
await browser.close()
console.log('done')
