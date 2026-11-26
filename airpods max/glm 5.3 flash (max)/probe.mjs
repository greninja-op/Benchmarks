/* Runtime probe: inspect model state + env in the live page. */
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const run = async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1600,900', '--no-first-run'],
    defaultViewport: { width: 1600, height: 900 },
    protocolTimeout: 120000,
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 3000))

  const info = await page.evaluate(() => {
    const R = window.__R
    if (!R) return { noR: true }
    const out = {}
    out.shellZ = R.parts.shell ? R.parts.shell.position.z : 'NO SHELL REF'
    out.shellVisible = R.parts.shell ? R.parts.shell.visible : null
    out.shellInTree = R.parts.shell ? !!R.parts.shell.parent : null
    out.shellParent = R.parts.shell ? R.parts.shell.parent?.type : null
    out.modelChildren = R.model ? R.model.children.length : null
    out.pivotLrot = R.pivotL ? [R.pivotL.rotation.x, R.pivotL.rotation.y, R.pivotL.rotation.z].map((v) => +v.toFixed(2)) : null
    out.cushionLz = R.cushionL ? R.cushionL.position.z : null
    out.modelPos = R.model ? R.model.position.toArray().map((v) => +v.toFixed(2)) : null
    out.modelYaw = R.model ? +R.model.rotation.y.toFixed(2) : null
    out.explodeNow = window.__APP ? window.__APP.choreo?.explode : null
    // count meshes in the left cup body subtree
    let count = 0
    if (R.bodyL) R.bodyL.traverse(() => count++)
    out.bodyLMeshes = count
    return out
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('RUNNER FAILED:', e); process.exit(1) })
