import { mkdir, rename, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/scroll-identity';
const formats = [
  { name: 'desktop', record: true, viewport: { width: 1440, height: 900 } },
  { name: 'laptop', record: false, viewport: { width: 1280, height: 800 } },
  { name: 'mobile', record: true, viewport: { width: 390, height: 844 } },
  { name: 'narrow-mobile', record: false, viewport: { width: 320, height: 568 } },
  { name: 'mobile-landscape', record: false, viewport: { width: 844, height: 390 } },
];
const frames = [
  { name: '01-hero-rest', progress: 0 },
  { name: '02-early-separation', progress: 0.16 },
  { name: '03-mid-transformation', progress: 0.5 },
  { name: '04-overlap-begins', progress: 0.9 },
  { name: '05-complete-monogram', progress: 1 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const observations = [];

const readHeroLayout = (page) =>
  page.evaluate(() => {
    const selectors = {
      actions: '.kinetic-hero__actions',
      cue: '.kinetic-hero__scroll-cue',
      introduction: '.kinetic-hero__introduction',
      navigation: '.hero-navigation',
      statements: '.kinetic-hero__statements',
      wordmark: '[data-testid="kinetic-wordmark"]',
    };
    return Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return [
          name,
          {
            height: rect.height,
            left: rect.left,
            opacity: Number(getComputedStyle(element).opacity),
            top: rect.top,
            width: rect.width,
          },
        ];
      }),
    );
  });

const moveToProgress = async (page, start, distance, progress, duration = 420) => {
  await page.evaluate(
    async ({ durationMs, endY }) => {
      const startY = window.scrollY;
      const startedAt = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const elapsed = Math.min((now - startedAt) / durationMs, 1);
          const eased = elapsed * elapsed * (3 - 2 * elapsed);
          window.scrollTo(0, startY + (endY - startY) * eased);
          if (elapsed < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { durationMs: duration, endY: start + distance * progress },
  );
};

try {
  for (const format of formats) {
    const context = await browser.newContext({
      viewport: format.viewport,
      ...(format.record
        ? { recordVideo: { dir: outputDirectory, size: format.viewport } }
        : {}),
    });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await page.waitForSelector('.kinetic-hero[data-scroll-identity="ready"]');
    if (format.name === 'desktop' || format.name === 'mobile') {
      await page.waitForFunction(
        () => document.querySelector('.kinetic-hero')?.dataset.cueReveal === 'complete',
      );
      await page.evaluate(() => {
        document.querySelector('.kinetic-hero__scroll-cue').hidden = true;
      });
      const beforeCue = await readHeroLayout(page);
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-00-cue-before.png`,
      });
      await page.evaluate(() => {
        document.querySelector('.kinetic-hero__scroll-cue').hidden = false;
      });
      const afterCue = await readHeroLayout(page);
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-00-cue-after.png`,
      });
      observations.push({
        cueReveal: { after: afterCue, before: beforeCue },
        format: `${format.name}-cue-reveal`,
      });
    }
    await page.waitForTimeout(360);
    const { scrollDistance, scrollStart } = await page.evaluate(() => {
      const hero = document.querySelector('.kinetic-hero');
      return {
        scrollDistance: Number(hero?.dataset.scrollDistance),
        scrollStart: Number(hero?.dataset.scrollStart),
      };
    });
    const formatObservations = [];

    for (const frame of frames) {
      await moveToProgress(page, scrollStart, scrollDistance, frame.progress);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-${frame.name}.png`,
      });
      formatObservations.push(
        await page.evaluate((label) => {
          const root = document.querySelector('.kinetic-hero');
          const destination = document.querySelector('.kinetic-monogram__destination');
          const glyphs = [...document.querySelectorAll('[data-monogram-role]')];
          const rect = destination.getBoundingClientRect();
          return {
            label,
            scrollY: window.scrollY,
            scrollProgress: Number(root.dataset.scrollProgress),
            identityState: root.dataset.identityState,
            destination: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            entranceStage: root.dataset.entranceStage,
            visibleArtwork: {
              height: Number(root.dataset.monogramVisibleHeight),
              width: Number(root.dataset.monogramVisibleWidth),
            },
            glyphs: glyphs.map((glyph) => {
              const glyphRect = glyph.getBoundingClientRect();
              const style = getComputedStyle(glyph);
              return {
                role: glyph.dataset.monogramRole,
                color: style.color,
                opacity: Number(style.opacity),
                strokeWidth: style.webkitTextStrokeWidth,
                left: glyphRect.left,
                top: glyphRect.top,
                width: glyphRect.width,
                height: glyphRect.height,
              };
            }),
            mobileHeader:
              window.innerWidth <= 600
                ? (() => {
                    const trigger = document
                      .querySelector('.hero-navigation__trigger')
                      .getBoundingClientRect();
                    return {
                      artworkCenterY:
                        rect.top + Number(root.dataset.monogramVisibleHeight) / 2,
                      menuCenterY: trigger.top + trigger.height / 2,
                      menuLeft: trigger.left,
                    };
                  })()
                : null,
            svgReplacementCount: document.querySelectorAll(
              '[data-monogram-source], [data-monogram-path]',
            ).length,
          };
        }, frame.name),
      );
    }

    await moveToProgress(page, scrollStart, scrollDistance, 0.5, 520);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-06-reverse-midpoint.png`,
    });
    await moveToProgress(page, scrollStart, scrollDistance, 0, 520);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-07-reverse-restored.png`,
    });

    observations.push({
      format: format.name,
      scrollDistance,
      frames: formatObservations,
    });
    const video = format.record ? page.video() : null;
    await page.close();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      await rename(videoPath, `${outputDirectory}/${format.name}-scroll-identity.webm`);
    }
  }

  for (const size of [16, 32, 128]) {
    const faviconPage = await browser.newPage({
      viewport: { width: size, height: size },
    });
    await faviconPage.setContent(
      `<style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000}img{display:block;width:100%;height:100%;object-fit:contain}</style><img src="${baseUrl}/favicon.png" alt="">`,
    );
    await faviconPage.waitForFunction(() => document.querySelector('img')?.complete);
    await faviconPage.screenshot({ path: `${outputDirectory}/favicon-${size}.png` });
    await faviconPage.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDirectory}/observations.json`,
  `${JSON.stringify(observations, null, 2)}\n`,
  'utf8',
);

console.log(`Saved scroll identity evidence to ${outputDirectory}`);
