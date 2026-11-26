import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2500))
const shot = (n) => page.screenshot({ path: `shots/t-${n}.png`, clip: { x: 400, y: 340, width: 620, height: 540 } })

// deep inside: chassis -0.95, board -0.2, driver -1.0 (Scene.jsx rewrites these every frame though!)
// -> instead OVERRIDE by monkey-patching: set positions each frame via setInterval is too slow; use rAF loop
const setPos = `(() => {
  window.__POS = { mode: 'deep' }
  const apply = () => {
    const p = window.__R.parts
    if (!p.chassis) return
    if (window.__POS.mode === 'deep') {
      p.chassis.position.z = -0.95; p.board.position.z = -0.2; p.driver.position.z = -1.0
    } else if (window.__POS.mode === 'out') {
      p.chassis.position.z = 6; p.board.position.z = 7; p.driver.position.z = 8
    } else {
      p.chassis.position.z = 0.95; p.board.position.z = 0.62; p.driver.position.z = -0.5
    }
    requestAnimationFrame(apply)
  }
  apply()
})()`
await page.evaluate(setPos)
await new Promise(r => setTimeout(r, 400))
await shot('deep-inside')
await page.evaluate(() => { window.__POS.mode = 'out' })
await new Promise(r => setTimeout(r, 400))
await shot('pushed-out')
await page.evaluate(() => { window.__POS.mode = 'rest' })
await new Promise(r => setTimeout(r, 400))
await shot('rest-again')
await page.evaluate(() => { window.__POS.mode = 'off' })
await browser.close()
console.log('done')
