import { mkdir, rename, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/about-phase-02b';
const formats = [
  { name: 'desktop', record: true, viewport: { width: 1440, height: 900 } },
  { name: 'laptop', record: false, viewport: { width: 1280, height: 800 } },
  { name: 'mobile', record: true, viewport: { width: 390, height: 844 } },
  { name: 'narrow-mobile', record: false, viewport: { width: 320, height: 568 } },
  { name: 'mobile-landscape', record: false, viewport: { width: 844, height: 390 } },
];
const frames = [
  { name: '01-hero-rest', progress: 0 },
  { name: '02-early-as-movement', progress: 0.08 },
  { name: '03-about-emerging', progress: 0.16 },
  { name: '04-parallel-midpoint', progress: 0.28 },
  { name: '05-muted-handoff', progress: 0.42 },
  { name: '06-early-reading', progress: 0.5 },
  { name: '07-half-reading', progress: 0.66 },
  { name: '08-complete-reading', progress: 0.9 },
  { name: '09-completed-hold', progress: 1 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const observations = [];

const moveToProgress = async (page, start, distance, progress, duration = 460) => {
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
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
};

const observe = (page, label) =>
  page.evaluate((frameLabel) => {
    const hero = document.querySelector('.kinetic-hero');
    const about = document.querySelector('.kinetic-about__content');
    const narrative = document.querySelector('[data-about-narrative]');
    const words = [...document.querySelectorAll('[data-about-word]')];
    const colors = words.map((word) => getComputedStyle(word).color);
    const nearBlack = colors.filter((color) => color === 'rgb(21, 21, 21)').length;
    const muted = colors.filter((color) => color === 'rgb(102, 102, 102)').length;
    const aboutRect = about.getBoundingClientRect();
    const narrativeRect = narrative.getBoundingClientRect();
    return {
      aboutRect: aboutRect.toJSON(),
      aboutRevealProgress: Number(hero.dataset.aboutRevealProgress),
      darkWordCount: nearBlack,
      frameLabel,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      identityProgress: Number(hero.dataset.identityProgress),
      identityState: hero.dataset.identityState,
      mutedWordCount: muted,
      narrativeRect: narrativeRect.toJSON(),
      readingProgress: Number(hero.dataset.readingProgress),
      scrollProgress: Number(hero.dataset.scrollProgress),
      wordCount: words.length,
    };
  }, label);

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
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.cueReveal === 'complete',
    );

    const scrollGeometry = await page.evaluate(() => {
      const hero = document.querySelector('.kinetic-hero');
      return {
        distance: Number(hero.dataset.scrollDistance),
        start: Number(hero.dataset.scrollStart),
      };
    });
    const formatFrames = [];

    for (const frame of frames) {
      await moveToProgress(
        page,
        scrollGeometry.start,
        scrollGeometry.distance,
        frame.progress,
      );
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-${frame.name}.png`,
      });
      formatFrames.push(await observe(page, frame.name));
    }

    await moveToProgress(page, scrollGeometry.start, scrollGeometry.distance, 0.66, 560);
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-10-reverse-reading.png`,
    });
    formatFrames.push(await observe(page, '10-reverse-reading'));
    await moveToProgress(page, scrollGeometry.start, scrollGeometry.distance, 0, 720);
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-11-reverse-hero.png`,
    });
    formatFrames.push(await observe(page, '11-reverse-hero'));

    observations.push({
      format: format.name,
      frames: formatFrames,
      scrollDistance: scrollGeometry.distance,
      viewport: format.viewport,
    });

    const video = format.record ? page.video() : null;
    await page.close();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      await rename(videoPath, `${outputDirectory}/${format.name}-about-sequence.webm`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDirectory}/observations.json`,
  `${JSON.stringify(observations, null, 2)}\n`,
  'utf8',
);

console.log(`Saved About evidence to ${outputDirectory}`);
