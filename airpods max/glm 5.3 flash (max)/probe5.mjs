import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2500))
const shot = (n) => page.screenshot({ path: `shots/t-${n}.png`, clip: { x: 400, y: 340, width: 620, height: 540 } })

// paint shell red, hide ALL other left-cup parts -> if red shell has holes, we'll see white bg through them
await page.evaluate(() => {
  const T = window.__R.parts.shell.geometry.attributes.position.array.constructor // not needed
  const p = window.__R.parts
  for (const k of ['chassis', 'board', 'driver', 'baffle']) p[k].visible = false
  window.__R.cushionL.visible = false
  p.shell.material.color.set(0xff2020)
  p.shell.material.roughness = 1
  p.shell.material.metalness = 0
  p.shell.material.bumpMap = null
})
await new Promise(r => setTimeout(r, 300))
await shot('red-shell-alone')
// now also right cup shell hidden? right uses same material - fine, both red
await browser.close()
console.log('done')
