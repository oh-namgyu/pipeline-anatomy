/**
 * Headless screenshots for docs/shots/ — `node scripts/shots.mjs`.
 *
 * Every image committed to this repository must come from this script. That is
 * a redaction rule, not a convenience: the second-line gate scans text, and
 * text baked into a PNG is invisible to it. A screenshot produced by a script
 * that drives only the committed lesson data inherits the coverage of both
 * gates, because everything it can possibly render has already been scanned at
 * source. A manually captured image carries whatever else was on screen.
 *
 * It serves the static files with python3's stdlib server (the same server the
 * e2e config uses), drives Chromium through the UI a reader sees, and writes
 * the two images the README links. No extra dependency: chromium comes from the
 * dev-only @playwright/test install.
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'shots');
const PORT = Number(process.env.SHOTS_PORT || 6186);
const BASE = `http://localhost:${PORT}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function open(page, hash) {
  await page.goto(`${BASE}/${hash}`);
  await page.locator('body[data-ready="true"]').waitFor();
}

async function shoot() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1320, height: 980 } });

  await open(page, '');
  await page.screenshot({ path: join(OUT, 'home.png') });

  // L1 mid-scenario: the long-form format with a failing render, stepped to
  // the point where the partially produced title goes back into the queue.
  await open(page, '#/lesson/l1-audiobook-line');
  await page.locator('button[data-widget="format"][data-value="long"]').click();
  await page.locator('button[data-widget="render"][data-value="fail"]').click();
  for (let i = 0; i < 4; i += 1) await page.locator('[data-next]').click();
  await page.locator('[data-badge]:not([hidden])').waitFor();
  await wait(400);
  await page.screenshot({ path: join(OUT, 'l1-audiobook.png') });

  await browser.close();
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', 'localhost'], {
  cwd: ROOT,
  stdio: 'ignore',
});

try {
  await wait(900);
  await shoot();
  console.log(`wrote ${join(OUT, 'home.png')} and ${join(OUT, 'l1-audiobook.png')}`);
} finally {
  server.kill();
}
