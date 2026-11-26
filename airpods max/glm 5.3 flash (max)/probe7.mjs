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
  const cam = st.camera.clone(); cam.updateMatrixWorld()
  const names = new Map()
  for (const [k, v] of Object.entries(R.parts)) if (v) names.set(v.id, 'PART-' + k)
  names.set(R.cushionL.id, 'CUSHION-L'); names.set(R.cushionR.id, 'CUSHION-R')
  names.set(R.bodyL.id, 'BODY-L'); names.set(R.model.id, 'MODEL'); names.set(R.pivotL.id, 'PIVOT-L')
  const chassis = R.parts.chassis
  const cW = new T.Box3().setFromObject(chassis).getCenter(new T.Vector3())
  const ndc = cW.clone().project(cam)
  const ray = new T.Raycaster()
  ray.setFromCamera(new T.Vector2(ndc.x, ndc.y), cam)
  const hits = ray.intersectObjects(st.scene.children, true)
  const seen = []
  for (const h of hits.slice(0, 6)) {
    // face normal in world + is it front-facing vs ray
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld)
    seen.push(`${names.get(h.object.id) || h.object.type} pt-z=${h.point.z.toFixed(2)} d=${h.distance.toFixed(1)} n=(${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)})`)
  }
  return { chassisNDC: [+ndc.x.toFixed(3), +ndc.y.toFixed(3)], nHits: hits.length, seen }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
