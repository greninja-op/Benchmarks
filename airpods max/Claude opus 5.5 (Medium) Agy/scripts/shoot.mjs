// QA: capture frames at given scroll progress values.
import puppeteer from 'puppeteer-core';
const ps = (process.argv[2] || '0,0.2,0.36,0.47,0.55,0.65,0.81,0.93,1').split(',').map(Number);
const [w, h] = (process.argv[3] || '1440x900').split('x').map(Number);
const out = process.argv[4] || 'shots';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${w},${h}`],
});
const page = await browser.newPage();
await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
for (const p of ps) {
  await page.evaluate((p) => window.__jump && window.__jump(p), p);
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: `${out}/p${String(p).replace('.', '_')}.png` });
}
console.log(logs.join('\n'));
await browser.close();
