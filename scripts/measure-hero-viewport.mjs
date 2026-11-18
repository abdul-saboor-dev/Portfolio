import { chromium } from '@playwright/test';

const baseUrl = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
];

const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl);
  await page.waitForSelector('.kinetic-hero[data-entrance="complete"]');
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const selectors = [
      'html',
      'body',
      '#root',
      'main',
      '.kinetic-hero',
      '.kinetic-hero__frame',
      '.hero-navigation',
      '.kinetic-hero__composition',
      '.kinetic-wordmark',
      '.kinetic-hero__support',
      '.kinetic-hero__statements',
      '.kinetic-hero__introduction',
      '.kinetic-hero__actions',
    ];
    const elements = Object.fromEntries(
      selectors.map((selector) => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return [
          selector,
          {
            rect: {
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
            },
            height: style.height,
            minHeight: style.minHeight,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            overflowY: style.overflowY,
          },
        ];
      }),
    );

    return {
      viewport: {
        innerHeight: window.innerHeight,
        visualViewportHeight: window.visualViewport?.height ?? null,
        visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
      },
      document: {
        clientHeight: document.documentElement.clientHeight,
        htmlScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        scrollY: window.scrollY,
      },
      spacers: document.querySelectorAll('.pin-spacer, [data-scrolltrigger-id]').length,
      elements,
    };
  });

  process.stdout.write(`${JSON.stringify({ viewport, metrics })}\n`);
  await page.close();
}

await browser.close();
