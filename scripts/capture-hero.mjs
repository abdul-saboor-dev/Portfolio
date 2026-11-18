import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PORTFOLIO_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = 'test-results/hero-visuals';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'laptop-1280x800', width: 1280, height: 800 },
  { name: 'tablet-820x1180', width: 820, height: 1180 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'mobile-320x568', width: 320, height: 568 },
  { name: 'mobile-landscape-844x390', width: 844, height: 390 },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('.kinetic-hero[data-entrance="complete"]');
    await page.waitForTimeout(240);
    await page.screenshot({ path: `${outputDirectory}/${viewport.name}.png` });
    await page.close();
  }

  const desktopNavigationPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await desktopNavigationPage.goto(baseUrl);
  await desktopNavigationPage.evaluate(() => document.fonts.ready);
  await desktopNavigationPage.waitForSelector('.kinetic-hero[data-entrance="complete"]');
  await desktopNavigationPage.evaluate(() => {
    const projects = document.createElement('section');
    projects.id = 'projects';
    projects.style.minHeight = '100vh';
    document.querySelector('main').append(projects);
  });
  const desktopNavigation = desktopNavigationPage.getByRole('navigation', {
    name: 'Portfolio sections',
  });
  await desktopNavigationPage.screenshot({
    path: `${outputDirectory}/desktop-navigation-resting-1440x900.png`,
  });
  await desktopNavigation.screenshot({
    path: `${outputDirectory}/desktop-navigation-resting-closeup.png`,
  });
  await desktopNavigation.getByRole('link', { name: /Projects/ }).hover();
  await desktopNavigationPage.waitForTimeout(240);
  await desktopNavigationPage.screenshot({
    path: `${outputDirectory}/desktop-navigation-hover-1440x900.png`,
  });
  await desktopNavigation.screenshot({
    path: `${outputDirectory}/desktop-navigation-hover-closeup.png`,
  });
  await desktopNavigationPage.close();

  const menuPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await menuPage.goto(baseUrl);
  await menuPage.evaluate(() => document.fonts.ready);
  await menuPage.waitForSelector('.kinetic-hero[data-entrance="complete"]');
  await menuPage.getByRole('button', { name: 'Menu' }).click();
  const menuDialog = menuPage.getByRole('dialog', { name: 'Portfolio' });
  await menuDialog.waitFor();
  await menuPage.waitForTimeout(80);
  await menuPage.screenshot({
    path: `${outputDirectory}/mobile-menu-opening-390x844.png`,
  });
  await menuPage.waitForSelector('.hero-navigation__dialog[data-menu-state="open"]');
  await menuPage.screenshot({ path: `${outputDirectory}/mobile-menu-390x844.png` });
  await menuPage.keyboard.press('Escape');
  await menuPage.waitForTimeout(220);
  await menuPage.screenshot({
    path: `${outputDirectory}/mobile-menu-closing-390x844.png`,
  });
  await menuDialog.waitFor({ state: 'hidden' });
  await menuPage.screenshot({
    path: `${outputDirectory}/mobile-menu-closed-390x844.png`,
  });
  await menuPage.close();

  const reducedPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await reducedPage.goto(baseUrl);
  await reducedPage.evaluate(() => document.fonts.ready);
  await reducedPage.waitForSelector('.kinetic-hero[data-entrance="complete"]');
  await reducedPage.screenshot({ path: `${outputDirectory}/mobile-reduced-motion.png` });
  await reducedPage.close();
} finally {
  await browser.close();
}

console.log(`Saved Hero review frames to ${outputDirectory}`);
