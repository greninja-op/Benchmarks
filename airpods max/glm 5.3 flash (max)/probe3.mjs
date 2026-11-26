import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__R && window.__R.model, { timeout: 20000 })
await page.waitForFunction(() => window.__ST, { timeout: 20000 })
await new Promise(r => setTimeout(r, 2000))

const out = await page.evaluate(async () => {
  const T = await import('/node_modules/three/build/three.module.js')
  const st = window.__ST, R = window.__R
  const cam = st.camera.clone()
  cam.updateMatrixWorld()
  const chassis = R.parts.chassis
  const centerWorld = new T.Box3().setFromObject(chassis).getCenter(new T.Vector3())
  const names = new Map()
  const shell = R.parts.shell
  names.set(shell.id, 'SHELL-L')
  for (const [k, v] of Object.entries(R.parts)) if (v) names.set(v.id, 'PART-' + k)
  names.set(R.cushionL.id, 'CUSHION-L'); names.set(R.cushionR.id, 'CUSHION-R')
  names.set(R.bodyL.id, 'BODY-L'); names.set(R.model.id, 'MODEL')
  const ray = new T.Raycaster()
  const results = []
  for (const ndc of [[-0.45, -0.05], [-0.35, -0.12], [-0.28, 0.0], [-0.5, 0.08]]) {
    ray.setFromCamera(new T.Vector2(ndc[0], ndc[1]), cam)
    const hits = ray.intersectObjects(st.scene.children, true).slice(0, 4)
    results.push({ ndc, hits: hits.map(h => `${names.get(h.object.id) || h.object.type}@z${h.point.z.toFixed(1)} d=${h.distance.toFixed(1)}`) })
  }
  const p = centerWorld.clone().project(cam)
  return {
    chassisCenterWorld: centerWorld.toArray().map(v => +v.toFixed(2)),
    chassisNDC: [+p.x.toFixed(2), +p.y.toFixed(2)],
    camPos: st.camera.position.toArray().map(v => +v.toFixed(1)),
    results,
  }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
