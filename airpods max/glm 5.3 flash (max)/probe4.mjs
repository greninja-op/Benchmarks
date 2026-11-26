import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2500))
const shot = (n) => page.screenshot({ path: `shots/t-${n}.png`, clip: { x: 400, y: 340, width: 620, height: 540 } })
const vis = (state) => page.evaluate((st) => {
  const p = window.__R.parts
  const set = (k, v) => { if (p[k]) p[k].visible = v }
  for (const k of ['shell', 'chassis', 'board', 'driver', 'baffle']) set(k, true)
  for (const [k, v] of Object.entries(st)) set(k, v)
}, state)

await vis({}); await shot('p0-all')
await vis({ board: false, driver: false }); await shot('p1-chassisOnly')
await vis({ chassis: false }); await shot('p2-noChassis')
await vis({ board: false }); await shot('p3-noBoard')
await vis({ driver: false }); await shot('p4-noDriver')
await vis({}); 
await browser.close()
console.log('done')
