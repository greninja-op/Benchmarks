import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2000))
const out = await page.evaluate(async () => {
  const T = await import('/node_modules/three/build/three.module.js')
  const st = window.__ST, R = window.__R
  const target = new T.Vector3(-4.3, -1.6, -0.36)
  const found = []
  const label = (o) => {
    const chain = []
    let p = o
    while (p && chain.length < 6) { chain.unshift(p.type + (p === R.parts.shell ? '[SHELL-L]' : p === R.bodyL ? '[BODY-L]' : p === R.cushionL ? '[CUSHION-L]' : p === R.model ? '[MODEL]' : '')); p = p.parent }
    return chain.join('>')
  }
  st.scene.traverse((o) => {
    if (!o.isMesh) return
    const box = new T.Box3().setFromObject(o)
    if (box.containsPoint(target)) {
      const mat = o.material
      found.push({
        chain: label(o),
        mat: mat ? (mat.color ? '#' + mat.color.getHexString() : '?') : null,
        matSide: mat ? mat.side : null,
        geoVerts: o.geometry.attributes.position.count,
        boxMin: box.min.toArray().map(v => +v.toFixed(1)),
        boxMax: box.max.toArray().map(v => +v.toFixed(1)),
      })
    }
  })
  return found
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
