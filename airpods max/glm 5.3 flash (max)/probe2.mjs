import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2500))

const info = await page.evaluate(() => {
  const s = window.__R.parts.shell
  const m = s.material
  return {
    side: m.side, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite,
    sharedWithRight: true,
    geoBS: s.geometry.boundingSphere ? s.geometry.boundingSphere.radius.toFixed(2) : null,
    matrixWorld: s.matrixWorld.elements.slice(12, 15).map(v => +v.toFixed(2)),
    scale: [s.matrixWorld.elements[0], s.matrixWorld.elements[5], s.matrixWorld.elements[10]].map(v => +v.toFixed(3)),
  }
})
console.log('shell info:', JSON.stringify(info))

const shot = async (name) => page.screenshot({ path: `shots/t-${name}.png`, clip: { x: 400, y: 340, width: 620, height: 540 } })
await shot('baseline')
await page.evaluate(() => { for (const k of ['chassis', 'board', 'driver']) if (window.__R.parts[k]) window.__R.parts[k].visible = false })
await new Promise(r => setTimeout(r, 400)); await shot('nointernals')
await page.evaluate(() => { for (const k of ['chassis', 'board', 'driver']) if (window.__R.parts[k]) window.__R.parts[k].visible = true; window.__R.parts.shell.visible = false })
await new Promise(r => setTimeout(r, 400)); await shot('noshell')
await browser.close()
console.log('done')
