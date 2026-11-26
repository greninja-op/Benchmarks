// Opens the built site in local Edge, scrolls to chosen progress values, and saves screenshots.
// Usage: node scripts/capture.mjs [0,0.2,0.5] (progress values, comma separated)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Serve the built dist folder in-process on an ephemeral port, so no separate server process is needed.
const distRoot = path.resolve('dist');
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
};
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(distRoot, rel);
  if (!file.startsWith(distRoot) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = process.env.SHOT_URL || `http://127.0.0.1:${server.address().port}/`;
const outDir = path.resolve('shots');
fs.mkdirSync(outDir, { recursive: true });
const arg = process.argv[2] || '0,0.2,0.33,0.5,0.65,0.78,0.85,1';
const points = arg.split(',').map(Number);
const width = Number(process.env.SHOT_W || 1440);
const height = Number(process.env.SHOT_H || 900);
const executablePath = process.env.SHOT_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__showcaseReady === true, null, { timeout: 90000 });

for (const p of points) {
  await page.evaluate((prog) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: prog * max, behavior: 'instant' });
  }, p);
  // Software GL runs slowly, so the damped progress needs several seconds to settle after a big jump
  await page.waitForTimeout(6000);
  const name = `${process.env.SHOT_PREFIX || ''}p${String(Math.round(p * 100)).padStart(3, '0')}.png`;
  await page.screenshot({ path: path.join(outDir, name) });
  console.log('saved', name);
}
console.log(logs.length ? logs.slice(0, 30).join('\n') : 'no console errors or warnings');
await browser.close();
server.close();
