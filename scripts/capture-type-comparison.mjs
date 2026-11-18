import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const outputDirectory = 'test-results/kinetic-preview-01b4';
const baseUrl = process.env.PORTFOLIO_COMPARISON_URL ?? 'http://127.0.0.1:4176';

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await page.goto(`${baseUrl}/typeface-comparison.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${outputDirectory}/typeface-comparison.png`,
    fullPage: true,
  });
} finally {
  await browser.close();
}

console.log(`Saved typeface comparison to ${outputDirectory}/typeface-comparison.png`);
