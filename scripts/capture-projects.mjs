import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const output = 'test-results/projects-phase-05';
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ],
  { stdio: 'ignore' },
);
process.on('exit', () => server.kill());
let ready = false;
for (let i = 0; i < 100; i += 1) {
  try {
    ready = (await fetch('http://127.0.0.1:4173/')).ok;
  } catch {
    /* starting */
  }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!ready) throw new Error('Preview did not start');
const browser = await chromium.launch({ headless: true });
const results = [];
const fast = process.argv.includes('--fast');
const settled = process.argv.includes('--settled');
const mobileOnly = process.argv.includes('--mobile-only');
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
];
for (const viewport of fast
  ? mobileOnly
    ? [viewports[3]]
    : [viewports[0], viewports[3]]
  : settled
    ? [viewports[0], viewports[3], viewports[5]]
    : viewports) {
  const recordVideo =
    !fast && !settled && (viewport.width === 1440 || viewport.width === 390);
  const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-scroll-identity="ready"]').waitFor({ timeout: 30000 });
  const base = await page.evaluate(() => {
    const root = document.querySelector('.kinetic-hero');
    return {
      start: Number(root.dataset.scrollStart),
      identity: Number(root.dataset.scrollDistance),
      education: Number(root.dataset.educationScrollDistance),
      skills: Number(root.dataset.skillsScrollDistance),
      projects: Number(root.dataset.projectsScrollDistance),
    };
  });
  const name = viewport.width + 'x' + viewport.height;
  const total = await page
    .locator('.projects')
    .evaluate((element) => Number(element.dataset.timelineUnits));
  const projectCount = await page
    .locator('.projects')
    .evaluate((element) => Number(element.dataset.projectCount));
  const chapterStart = 0.85 + projectCount + 0.35;
  const designStart = chapterStart + 1;
  const positions = [
    ['skills-settled', 0],
    ['skills-opening', 0.18],
    ['skills-passage', 0.38],
    ['skills-arrival', 0.62],
    ['build-first', 0.9],
    ['build-quarter', 1.1],
    ['build-mid', 1.35],
    ['build-three-quarter', 1.6],
    ['build-second', 1.85],
    ['build-last', chapterStart - 0.3],
    ['chapter-20', chapterStart + 0.2],
    ['chapter-40', chapterStart + 0.4],
    ['chapter-transition', chapterStart + 0.5],
    ['chapter-60', chapterStart + 0.6],
    ['chapter-80', chapterStart + 0.8],
    ['design-first', designStart + 0.05],
    ['design-mid', designStart + 0.5],
    ['design-final', total - 0.8],
  ];
  for (const [label, unit] of fast
    ? positions.filter(
        ([label]) =>
          label.startsWith('chapter-') ||
          label.startsWith('build-') ||
          label.startsWith('skills-'),
      )
    : settled
      ? positions.filter(([label]) => label === 'build-first' || label === 'design-first')
      : positions) {
    const y =
      base.start +
      base.identity +
      base.education +
      base.skills +
      (base.projects * unit) / total;
    await page.evaluate((target) => window.scrollTo(0, target), y);
    await page.waitForTimeout(100);
    await page.screenshot({ path: output + '/' + name + '-' + label + '.png' });
    results.push(
      await page.evaluate(
        ({ name, label }) => {
          const scene = document.querySelector('.projects');
          const chapter = label.startsWith('design') ? 'design' : 'build';
          const section = scene.querySelector('.projects__chapter--' + chapter);
          const rect = (selector) =>
            section.querySelector(selector)?.getBoundingClientRect().toJSON();
          return {
            name,
            label,
            state: scene.dataset.projectsState,
            buildProgress: scene.dataset.buildProgress,
            artProgress: scene.dataset.artProgress,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            indicator: scene
              .querySelector('.projects__indicator')
              ?.getBoundingClientRect()
              .toJSON(),
            discipline: scene.dataset.projectsDiscipline,
            skillsHeading: document
              .querySelector('.skills-stage__copy h3')
              ?.getBoundingClientRect()
              .toJSON(),
            editorial: rect('.projects__editorial'),
            field: rect('.projects__field'),
            details: rect('.projects__details, .projects__art-details'),
            controls: rect('.projects__controls'),
            continue: rect('.projects__continue'),
            cards: [...scene.querySelectorAll('[data-project-card]')].map((el) => ({
              index: el.dataset.projectCard,
              opacity: Number(getComputedStyle(el).opacity),
              zIndex: getComputedStyle(el).zIndex,
              rect: el.getBoundingClientRect().toJSON(),
            })),
            artworks: [...scene.querySelectorAll('[data-artwork]')].map((el) => ({
              index: el.dataset.artwork,
              opacity: Number(getComputedStyle(el).opacity),
              rect: el.getBoundingClientRect().toJSON(),
            })),
            errors: [],
          };
        },
        { name, label },
      ),
    );
  }
  if (viewport.width === 1440 || viewport.width === 390) {
    const designY =
      base.start +
      base.identity +
      base.education +
      base.skills +
      (base.projects * (designStart + 0.05)) / total;
    await page.evaluate((target) => window.scrollTo(0, target), designY);
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'View artwork' }).click();
    await page.screenshot({ path: output + '/' + name + '-artwork-viewer.png' });
    await page.getByRole('button', { name: 'Close artwork viewer' }).click();
    await page.locator('.projects__viewer').waitFor({ state: 'detached' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'View CV' }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: output + '/' + name + '-cv-viewer.png' });
    await page.getByRole('button', { name: 'Close CV viewer' }).click();
  }
  await page.close();
  if (recordVideo) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'no-preference',
      recordVideo: { dir: output, size: viewport },
    });
    const recording = await context.newPage();
    recording.on('pageerror', (error) => errors.push(error.message));
    await recording.goto('http://127.0.0.1:4173/', {
      waitUntil: 'domcontentloaded',
    });
    await recording.locator('[data-scroll-identity="ready"]').waitFor({ timeout: 30000 });
    const start = base.start + base.identity + base.education + base.skills - 180;
    const end = start + base.projects + 160;
    await recording.evaluate((target) => window.scrollTo(0, target), start);
    await recording.waitForTimeout(280);
    for (let frame = 0; frame < 95; frame += 1) {
      if (await recording.evaluate((target) => window.scrollY >= target, end)) break;
      await recording.mouse.wheel(0, 100);
      await recording.waitForTimeout(50);
    }
    for (let frame = 0; frame < 95; frame += 1) {
      if (await recording.evaluate((target) => window.scrollY <= target, start)) break;
      await recording.mouse.wheel(0, -100);
      await recording.waitForTimeout(50);
    }
    const video = recording.video();
    await recording.close();
    await context.close();
    await copyFile(await video.path(), output + '/' + name + '-forward-reverse.webm');
  }
  results.push({ name, errors });
}
await writeFile(output + '/measurements.json', JSON.stringify(results, null, 2));
await browser.close();
server.kill();
console.log(output);
