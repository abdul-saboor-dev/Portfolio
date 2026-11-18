import { expect, test } from '@playwright/test';

const waitForScrollIdentity = (page) =>
  page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );

const setScrollProgress = async (page, progress) => {
  await page.evaluate((nextProgress) => {
    const hero = document.querySelector('.kinetic-hero');
    window.scrollTo(
      0,
      Number(hero.dataset.scrollStart) +
        Number(hero.dataset.scrollDistance) * nextProgress,
    );
  }, progress);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
      ),
    )
    .toBeCloseTo(progress, 2);
};

const wordColors = (page) =>
  page
    .locator('[data-about-word]')
    .evaluateAll((words) => words.map((word) => getComputedStyle(word).color));

test('reveals About in parallel and starts reading only after the AS handoff', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await waitForScrollIdentity(page);

  const hero = page.locator('.kinetic-hero');
  const about = page.locator('.kinetic-about');
  const content = page.locator('.kinetic-about__content');
  const words = page.locator('[data-about-word]');

  await setScrollProgress(page, 0.2);
  await expect(hero).toHaveAttribute('data-identity-state', 'transforming');
  expect(Number(await hero.getAttribute('data-about-reveal-progress'))).toBeGreaterThan(
    0,
  );
  expect(
    await content.evaluate((element) => getComputedStyle(element).clipPath),
  ).not.toBe('inset(0px 0px 100%)');
  const movingGlyphs = await page
    .locator('[data-monogram-role]')
    .evaluateAll((glyphs) => glyphs.map((glyph) => getComputedStyle(glyph).transform));
  expect(movingGlyphs.some((transform) => transform !== 'none')).toBe(true);

  await setScrollProgress(page, 0.42);
  await expect(hero).toHaveAttribute('data-identity-state', 'reading');
  await expect(about).toHaveAttribute('aria-hidden', 'false');
  expect(await content.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
    /inset\(0px 0px 0(?:px|%)\)/,
  );
  const neutralColors = await wordColors(page);
  expect(neutralColors).toHaveLength(await words.count());
  expect(new Set(neutralColors)).toEqual(new Set(['rgb(102, 102, 102)']));

  await setScrollProgress(page, 0.66);
  const partialColors = new Set(await wordColors(page));
  expect(partialColors).toContain('rgb(21, 21, 21)');
  expect(partialColors).toContain('rgb(102, 102, 102)');

  await setScrollProgress(page, 0.9);
  expect(new Set(await wordColors(page))).toEqual(new Set(['rgb(21, 21, 21)']));
  await expect(hero).toHaveAttribute('data-identity-state', 'about-complete');

  await setScrollProgress(page, 1);
  expect(new Set(await wordColors(page))).toEqual(new Set(['rgb(21, 21, 21)']));

  await setScrollProgress(page, 0.66);
  const reversedColors = new Set(await wordColors(page));
  expect(reversedColors).toContain('rgb(21, 21, 21)');
  expect(reversedColors).toContain('rgb(102, 102, 102)');

  await setScrollProgress(page, 0);
  await expect(hero).toHaveAttribute('data-identity-state', 'hero');
  await expect(about).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByTestId('kinetic-wordmark')).toBeVisible();
});

test('keeps the approved About copy readable and overflow-free across viewports', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await waitForScrollIdentity(page);
    await setScrollProgress(page, 1);

    const measurements = await page.evaluate(() => {
      const about = document.querySelector('.kinetic-about');
      const content = document.querySelector('.kinetic-about__content');
      const narrative = document.querySelector('[data-about-narrative]');
      const aboutRect = about.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const narrativeRect = narrative.getBoundingClientRect();
      return {
        about: aboutRect.toJSON(),
        content: contentRect.toJSON(),
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        narrative: narrativeRect.toJSON(),
        text: narrative.textContent,
      };
    });

    expect(measurements.horizontalOverflow).toBe(false);
    expect(measurements.text).toContain("I'm Abdul Saboor");
    expect(measurements.content.left).toBeGreaterThanOrEqual(-1);
    expect(measurements.content.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(measurements.narrative.top).toBeGreaterThanOrEqual(measurements.about.top - 1);
    expect(measurements.narrative.bottom).toBeLessThanOrEqual(
      measurements.about.bottom + 1,
    );
  }
});

test('Home and About navigation control the existing master timeline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await waitForScrollIdentity(page);

  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
      ),
    )
    .toBeCloseTo(0.42, 1);
  await expect(page.getByRole('link', { name: 'About', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
      ),
    )
    .toBeCloseTo(0, 1);
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
