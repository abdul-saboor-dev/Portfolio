import { mkdir, rename, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/skills-phase-04';
const formats = [
  { name: 'desktop', record: true, viewport: { width: 1440, height: 900 } },
  { name: 'mobile', record: true, viewport: { width: 390, height: 844 } },
  { name: 'narrow-mobile', record: false, viewport: { width: 320, height: 568 } },
];
const frames = [
  { name: '01-education-final', progress: 0 },
  { name: '02-handoff-start', progress: 0.08 },
  { name: '03-handoff-midpoint', progress: 0.16 },
  { name: '04-first-row-entering', progress: 0.3 },
  { name: '05-partial-formation', progress: 0.5 },
  { name: '06-nearly-complete', progress: 0.76 },
  { name: '07-code-symbol-rising', progress: 0.82 },
  { name: '08-complete-hold', progress: 1 },
  { name: '09-reverse-intermediate', progress: 0.48 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const observations = [];

const moveToProgress = async (page, geometry, progress, duration = 520) => {
  const targetY =
    geometry.start + geometry.identity + geometry.education + geometry.skills * progress;
  await page.evaluate(
    async ({ durationMs, target }) => {
      const start = scrollY;
      const startedAt = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const elapsed = Math.min((now - startedAt) / durationMs, 1);
          const eased = elapsed * elapsed * (3 - 2 * elapsed);
          scrollTo(0, start + (target - start) * eased);
          if (elapsed < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { durationMs: duration, target: targetY },
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
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
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('.kinetic-hero');
      return {
        education: Number(hero.dataset.educationScrollDistance),
        identity: Number(hero.dataset.scrollDistance),
        skills: Number(hero.dataset.skillsScrollDistance),
        start: Number(hero.dataset.scrollStart),
      };
    });
    const formatObservations = [];
    for (const frame of frames) {
      await moveToProgress(page, geometry, frame.progress);
      await page.screenshot({
        path: `${outputDirectory}/${format.name}-${frame.name}.png`,
      });
      formatObservations.push(
        await page.evaluate((name) => {
          const stage = document.querySelector('.skills-stage');
          return {
            frame: name,
            itemCount: Number(stage.dataset.itemCount),
            progress: Number(stage.dataset.skillsProgress),
            state: stage.dataset.skillsState,
            horizontalOverflow:
              document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        }, frame.name),
      );
    }
    observations.push({
      format: format.name,
      geometry,
      frames: formatObservations,
      viewport: format.viewport,
    });
    const video = format.record ? page.video() : null;
    await page.close();
    await context.close();
    if (video)
      await rename(
        await video.path(),
        `${outputDirectory}/${format.name}-skills-sequence.webm`,
      );
  }

  const reduced = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(baseUrl);
  await reducedPage.waitForSelector('.skills-stage[data-skills-state="reduced"]');
  await reducedPage.locator('.skills-stage').scrollIntoViewIfNeeded();
  await reducedPage.screenshot({ path: `${outputDirectory}/mobile-reduced-motion.png` });
  await reduced.close();
} finally {
  await browser.close();
}

await writeFile(
  `${outputDirectory}/observations.json`,
  `${JSON.stringify(observations, null, 2)}\n`,
  'utf8',
);
console.log(`Saved Skills evidence to ${outputDirectory}`);
