import { mkdir, rename, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/education-phase-03';
const formats = [
  { name: 'desktop', record: true, viewport: { width: 1440, height: 900 } },
  { name: 'laptop', record: false, viewport: { width: 1280, height: 800 } },
  { name: 'tablet', record: false, viewport: { width: 820, height: 1180 } },
  { name: 'mobile', record: true, viewport: { width: 390, height: 844 } },
  { name: 'narrow-mobile', record: false, viewport: { width: 320, height: 568 } },
  { name: 'mobile-landscape', record: false, viewport: { width: 844, height: 390 } },
];
const frames = [
  { name: '01-about-complete', progress: 0 },
  { name: '02-about-exit-begins', progress: 0.08 },
  { name: '03-handoff-midpoint', progress: 0.16 },
  { name: '04-first-record-established', progress: 0.28 },
  { name: '05-first-to-second', progress: 0.45 },
  { name: '06-second-centered', progress: 0.6 },
  { name: '07-second-to-third', progress: 0.74 },
  { name: '08-final-record', progress: 0.88 },
  { name: '09-final-hold', progress: 1 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const observations = [];

const moveToEducationProgress = async (page, geometry, progress, duration = 520) => {
  const endY =
    geometry.start + geometry.identityDistance + geometry.educationDistance * progress;
  await page.evaluate(
    async ({ durationMs, targetY }) => {
      const startY = window.scrollY;
      const startedAt = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const elapsed = Math.min((now - startedAt) / durationMs, 1);
          const eased = elapsed * elapsed * (3 - 2 * elapsed);
          window.scrollTo(0, startY + (targetY - startY) * eased);
          if (elapsed < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { durationMs: duration, targetY: endY },
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
    const stage = document.querySelector('.education-stage');
    const track = document.querySelector('[data-education-track]');
    return {
      carouselProgress: Number(stage.dataset.carouselProgress),
      currentRecord: Number(stage.dataset.currentRecord),
      educationProgress: Number(hero.dataset.educationProgress),
      educationState: hero.dataset.educationState,
      frameLabel,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      recordBounds: [...document.querySelectorAll('[data-education-record]')].map(
        (record) => record.getBoundingClientRect().toJSON(),
      ),
      scrollY: window.scrollY,
      trackTransform: getComputedStyle(track).transform,
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

    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('.kinetic-hero');
      return {
        educationDistance: Number(hero.dataset.educationScrollDistance),
        identityDistance: Number(hero.dataset.scrollDistance),
        start: Number(hero.dataset.scrollStart),
      };
    });
    const formatFrames = [];

    for (const frame of frames) {
      await moveToEducationProgress(page, geometry, frame.progress);
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-${frame.name}.png`,
      });
      formatFrames.push(await observe(page, frame.name));
    }

    await moveToEducationProgress(page, geometry, 0.6, 640);
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-10-reverse-carousel.png`,
    });
    formatFrames.push(await observe(page, '10-reverse-carousel'));
    await moveToEducationProgress(page, geometry, 0, 760);
    await page.screenshot({
      path: `${outputDirectory}/${format.name}-11-reverse-about.png`,
    });
    formatFrames.push(await observe(page, '11-reverse-about'));

    observations.push({
      format: format.name,
      frames: formatFrames,
      geometry,
      viewport: format.viewport,
    });

    const video = format.record ? page.video() : null;
    await page.close();
    await context.close();
    if (video) {
      const videoPath = await video.path();
      await rename(
        videoPath,
        `${outputDirectory}/${format.name}-education-sequence.webm`,
      );
    }
  }

  const reducedContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseUrl);
  await reducedPage.waitForSelector('.education-stage[data-education-state="reduced"]');
  await reducedPage.locator('.education-stage').scrollIntoViewIfNeeded();
  await reducedPage.screenshot({
    fullPage: true,
    path: `${outputDirectory}/mobile-reduced-motion.png`,
  });
  await reducedContext.close();
} finally {
  await browser.close();
}

await writeFile(
  `${outputDirectory}/observations.json`,
  `${JSON.stringify(observations, null, 2)}\n`,
  'utf8',
);

console.log(`Saved Education evidence to ${outputDirectory}`);
