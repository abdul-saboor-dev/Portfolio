import { mkdir, rename, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/kinetic-preview-01c';
const formats = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];
const scenarios = [
  { name: 'normal', motionModuleDelay: 0, fontDelay: 0 },
  { name: 'slow', motionModuleDelay: 420, fontDelay: 1800 },
];

const delayRoute = async (route, delay) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  await route.continue();
};

const observe = (page, label) =>
  page.evaluate((observationLabel) => {
    const hero = document.querySelector('.kinetic-hero');
    const glyphRects = [...document.querySelectorAll('[data-glyph-id]')].map((glyph) =>
      glyph.getBoundingClientRect(),
    );
    const glyphCenters = glyphRects.map((rect) => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));
    const orbitCenter = glyphCenters.length
      ? {
          x:
            (Math.min(...glyphRects.map((rect) => rect.left)) +
              Math.max(...glyphRects.map((rect) => rect.right))) /
            2,
          y:
            (Math.min(...glyphRects.map((rect) => rect.top)) +
              Math.max(...glyphRects.map((rect) => rect.bottom))) /
            2,
        }
      : null;
    const loaderStartedAt =
      Number(hero?.dataset.loaderStartedAt) || Number(window.__kineticLoaderStartedAt);
    return {
      label: observationLabel,
      elapsedMs: Number((performance.now() - loaderStartedAt).toFixed(1)),
      stage: hero?.dataset.entranceStage,
      progress: Number(hero?.dataset.entranceProgress),
      loaderVisibleMs: Number(hero?.dataset.loaderVisibleMs) || null,
      orbitTravelDegrees: Number(hero?.dataset.orbitTravelDegrees) || null,
      rotationAtRelease: Number(hero?.dataset.rotationAtRelease) || null,
      releaseElapsedMs: Number(hero?.dataset.releaseElapsedMs) || null,
      heroSettleMs: Number(hero?.dataset.heroSettleMs) || null,
      firstGlyphAngle:
        orbitCenter && glyphCenters[0]
          ? Number(
              (
                Math.atan2(
                  glyphCenters[0].y - orbitCenter.y,
                  glyphCenters[0].x - orbitCenter.x,
                ) *
                (180 / Math.PI)
              ).toFixed(2),
            )
          : null,
      glyphBounds: glyphRects.length
        ? {
            left: Number(Math.min(...glyphRects.map((rect) => rect.left)).toFixed(1)),
            top: Number(Math.min(...glyphRects.map((rect) => rect.top)).toFixed(1)),
            right: Number(Math.max(...glyphRects.map((rect) => rect.right)).toFixed(1)),
            bottom: Number(Math.max(...glyphRects.map((rect) => rect.bottom)).toFixed(1)),
          }
        : null,
    };
  }, label);

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const observations = [];

try {
  for (const format of formats) {
    for (const scenario of scenarios) {
      const captureName = `${format.name}-${scenario.name}`;
      const context = await browser.newContext({
        viewport: format.viewport,
        recordVideo: {
          dir: outputDirectory,
          size: format.viewport,
        },
      });
      const page = await context.newPage();

      if (scenario.motionModuleDelay > 0) {
        await page.route(
          /(\/src\/animation\/kineticEntrance\.js|\/assets\/kineticEntrance-[^/]+\.js)(\?.*)?$/,
          (route) => delayRoute(route, scenario.motionModuleDelay),
        );
      }
      if (scenario.fontDelay > 0) {
        await page.route('**/fonts/league-gothic-regular.woff2', (route) =>
          delayRoute(route, scenario.fontDelay),
        );
      }

      await page.goto(baseUrl, { waitUntil: 'commit' });
      await page.waitForSelector('.kinetic-hero[data-entrance-stage="orbit"]');
      const runObservations = [await observe(page, 'initial-circle')];
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-01-initial-circle.png`,
      });

      await page.waitForTimeout(240);
      runObservations.push(await observe(page, 'visible-rotation'));
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-02-visible-rotation.png`,
      });

      await page.waitForFunction(() =>
        Boolean(document.querySelector('.kinetic-hero')?.dataset.releaseStartedAt),
      );
      runObservations.push(await observe(page, 'rotation-release-handoff'));

      await page.waitForFunction(
        () =>
          Number(document.querySelector('.kinetic-hero')?.dataset.entranceProgress) >=
          0.025,
      );
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-03-first-release.png`,
      });
      runObservations.push(await observe(page, 'first-release'));

      await page.waitForFunction(
        () =>
          Number(document.querySelector('.kinetic-hero')?.dataset.entranceProgress) >=
          0.25,
      );
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-04-quarter-release.png`,
      });
      runObservations.push(await observe(page, 'quarter-release'));

      await page.waitForFunction(
        () =>
          Number(document.querySelector('.kinetic-hero')?.dataset.entranceProgress) >=
          0.5,
      );
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-05-mid-release.png`,
      });
      runObservations.push(await observe(page, 'mid-release'));

      await page.waitForFunction(
        () =>
          Number(document.querySelector('.kinetic-hero')?.dataset.entranceProgress) >=
          0.75,
      );
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-06-three-quarter-release.png`,
      });
      runObservations.push(await observe(page, 'three-quarter-release'));

      await page.waitForSelector('.kinetic-hero[data-entrance="complete"]');
      await page.screenshot({
        path: `${outputDirectory}/${captureName}-07-complete-hero.png`,
      });
      runObservations.push(await observe(page, 'hero-settle'));
      observations.push({
        capture: captureName,
        viewport: format.viewport,
        scenario,
        observations: runObservations,
      });

      const video = page.video();
      await page.close();
      const videoPath = await video.path();
      await context.close();
      await rename(videoPath, `${outputDirectory}/${captureName}-kinetic-entrance.webm`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDirectory}/timestamped-observations.json`,
  `${JSON.stringify(observations, null, 2)}\n`,
  'utf8',
);

console.log(`Saved kinetic entrance evidence to ${outputDirectory}`);
