import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
];

const waitForIdentity = async (page) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
};

const setEducationProgress = async (page, progress) => {
  await page.evaluate((nextProgress) => {
    const hero = document.querySelector('.kinetic-hero');
    const target =
      Number(hero.dataset.scrollStart) +
      Number(hero.dataset.scrollDistance) +
      Number(hero.dataset.educationScrollDistance) * nextProgress;
    window.scrollTo(0, target);
  }, progress);
  await page.waitForFunction(
    (nextProgress) =>
      Math.abs(
        Number(document.querySelector('.kinetic-hero')?.dataset.educationProgress) -
          nextProgress,
      ) < 0.02,
    progress,
  );
};

test('hands About into Education without replacing the completed AS identity', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);

  await setEducationProgress(page, 0);
  const completedIdentity = await page
    .locator('#glyph-a-01, #glyph-s-01')
    .evaluateAll((glyphs) => glyphs.map((glyph) => getComputedStyle(glyph).transform));
  await expect(page.locator('.kinetic-about')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'true');

  await setEducationProgress(page, 0.15);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-education-state',
    'emerging',
  );
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'false');

  await setEducationProgress(page, 0.28);
  await expect(
    page.getByRole('heading', { name: 'Education', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Government College of Technology Bhakkar')).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Portfolio sections' })
      .getByRole('link', { name: /Education/ }),
  ).toHaveAttribute('aria-current', 'page');
  const educationIdentity = await page
    .locator('#glyph-a-01, #glyph-s-01')
    .evaluateAll((glyphs) => glyphs.map((glyph) => getComputedStyle(glyph).transform));
  expect(educationIdentity).toEqual(completedIdentity);

  await setEducationProgress(page, 0);
  await expect(page.locator('.kinetic-about')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'true');
  await expect(
    page
      .getByRole('navigation', { name: 'Portfolio sections' })
      .getByRole('link', { name: /About/ }),
  ).toHaveAttribute('aria-current', 'page');
});

test('maps vertical scroll to a reversible horizontal Education journey', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);
  const track = page.locator('[data-education-track]');

  await setEducationProgress(page, 0.28);
  const firstX = await track.evaluate((element) => element.getBoundingClientRect().left);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-current-record',
    '0',
  );

  await setEducationProgress(page, 0.6);
  const middleX = await track.evaluate((element) => element.getBoundingClientRect().left);
  expect(middleX).toBeLessThan(firstX - 100);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-current-record',
    '1',
  );
  await expect(page.getByText('Govt. Model High School Bhakkar')).toBeVisible();

  await setEducationProgress(page, 0.88);
  const finalX = await track.evaluate((element) => element.getBoundingClientRect().left);
  expect(finalX).toBeLessThan(middleX - 100);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-current-record',
    '2',
  );
  await expect(page.getByText('Allied School Bhakkar')).toBeVisible();

  await setEducationProgress(page, 0.6);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-current-record',
    '1',
  );
  await setEducationProgress(page, 0.28);
  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-current-record',
    '0',
  );
});

test('keeps each centered record readable and overflow-free at required viewports', async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await waitForIdentity(page);

    for (const [progress, index] of [
      [0.28, 0],
      [0.6, 1],
      [0.88, 2],
    ]) {
      await setEducationProgress(page, progress);
      const bounds = await page
        .locator('[data-education-record]')
        .nth(index)
        .evaluate((record) => {
          const rect = record.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            top: rect.top,
          };
        });
      expect(bounds.left).toBeGreaterThanOrEqual(-1);
      expect(bounds.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(viewport.height + 1);
    }

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test('recalculates scroll geometry for one, two, and four CMS-driven records', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForIdentity(page);
  const stage = page.locator('.education-stage');

  await page.evaluate(() => {
    const track = document.querySelector('[data-education-track]');
    window.__educationTestRecords = [...track.children].map((record) =>
      record.cloneNode(true),
    );
    track.replaceChildren(window.__educationTestRecords[0].cloneNode(true));
  });
  await expect(stage).toHaveAttribute('data-record-count', '1');
  const oneDistance = Number(
    await page.locator('.kinetic-hero').getAttribute('data-education-scroll-distance'),
  );

  await page.evaluate(() => {
    const track = document.querySelector('[data-education-track]');
    track.append(window.__educationTestRecords[1].cloneNode(true));
  });
  await expect(stage).toHaveAttribute('data-record-count', '2');
  const twoDistance = Number(
    await page.locator('.kinetic-hero').getAttribute('data-education-scroll-distance'),
  );

  await page.evaluate(() => {
    const track = document.querySelector('[data-education-track]');
    track.append(window.__educationTestRecords[2].cloneNode(true));
    const fourth = window.__educationTestRecords[0].cloneNode(true);
    fourth.querySelector('h3').textContent = 'Fourth education record';
    track.append(fourth);
  });
  await expect(stage).toHaveAttribute('data-record-count', '4');
  const fourDistance = Number(
    await page.locator('.kinetic-hero').getAttribute('data-education-scroll-distance'),
  );

  expect(twoDistance).toBeGreaterThan(oneDistance);
  expect(fourDistance).toBeGreaterThan(twoDistance);

  await page.evaluate(() => {
    const track = document.querySelector('[data-education-track]');
    track.prepend(track.lastElementChild);
  });
  await expect(stage).toHaveAttribute('data-record-count', '4');
  await setEducationProgress(page, 0.28);
  await expect(page.getByText('Fourth education record')).toBeVisible();
});

test('uses readable normal vertical flow when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForIdentity(page);

  await expect(page.locator('.education-stage')).toHaveAttribute(
    'data-education-state',
    'reduced',
  );
  await expect(
    page.getByRole('heading', { name: 'Education', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-education-record]')).toHaveCount(3);
  await expect(page.locator('[data-education-track]')).toHaveCSS('transform', 'none');
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 2),
  ).toBe(true);
});
