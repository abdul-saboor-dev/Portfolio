import { expect, test } from '@playwright/test';

const SCROLL_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
];

const readVerticalScrollMetrics = (page) =>
  page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    maximumScroll:
      document.documentElement.scrollHeight - document.documentElement.clientHeight,
    htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    scrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth,
    heights: {
      body: document.body.getBoundingClientRect().height,
      root: document.querySelector('#root').getBoundingClientRect().height,
      main: document.querySelector('main').getBoundingClientRect().height,
      hero: document.querySelector('.kinetic-hero').getBoundingClientRect().height,
      pinSpacer:
        document.querySelector('.pin-spacer')?.getBoundingClientRect().height ?? null,
    },
    scrollDistance: Number(
      document.querySelector('.kinetic-hero')?.dataset.masterScrollDistance,
    ),
  }));

test('boots the React development shell without runtime errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Abdul Saboor | Portfolio');
  await expect(page.getByRole('main', { name: 'Abdul Saboor portfolio' })).toBeAttached();
  expect(errors).toEqual([]);
});

test('loads at responsive viewport sizes without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
});

test('keeps the entrance to one viewport and allows accessible settled flow', async ({
  page,
}) => {
  for (const viewport of SCROLL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const entranceCheckpoints = [readVerticalScrollMetrics(page)];
    await page.waitForFunction(
      () =>
        Number(document.querySelector('.kinetic-hero')?.dataset.entranceProgress) >= 0.25,
    );
    entranceCheckpoints.push(readVerticalScrollMetrics(page));
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
    );
    const settledCheckpoint = await readVerticalScrollMetrics(page);

    for (const checkpointPromise of entranceCheckpoints) {
      const checkpoint = await checkpointPromise;
      expect(checkpoint.maximumScroll).toBeLessThanOrEqual(1);
      expect(checkpoint.scrollHeight).toBe(checkpoint.clientHeight);
      expect(checkpoint.htmlOverflowY).not.toMatch(/hidden|clip/);
      expect(checkpoint.bodyOverflowY).not.toMatch(/hidden|clip/);
      expect(checkpoint.scrollbarWidth).toBe('none');
      for (const height of Object.values(checkpoint.heights).filter(Number.isFinite)) {
        expect(Math.abs(height - viewport.height)).toBeLessThanOrEqual(1);
      }
    }

    expect(settledCheckpoint.maximumScroll).toBeGreaterThan(0);
    expect(
      Math.abs(settledCheckpoint.maximumScroll - settledCheckpoint.scrollDistance),
    ).toBeLessThanOrEqual(2);
    expect(settledCheckpoint.htmlOverflowY).not.toMatch(/hidden|clip/);
    expect(settledCheckpoint.bodyOverflowY).not.toMatch(/hidden|clip/);
    expect(settledCheckpoint.scrollbarWidth).toBe('none');
    expect(
      Math.abs(settledCheckpoint.heights.hero - viewport.height),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        settledCheckpoint.heights.pinSpacer -
          (viewport.height + settledCheckpoint.scrollDistance),
      ),
    ).toBeLessThanOrEqual(2);
  }
});

test('maps native wheel, touch, and keyboard scrolling to the identity transition', async ({
  page,
}) => {
  test.setTimeout(75_000);
  for (const viewport of SCROLL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
    );

    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
        ),
      )
      .toBeGreaterThan(0);
    await page.keyboard.press('Home');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.locator('#main-content').focus();
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(150);
    await page.keyboard.press('Home');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: viewport.width / 2, y: viewport.height * 0.75 }],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: viewport.width / 2, y: viewport.height * 0.25 }],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.keyboard.press('End');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.querySelector('.kinetic-hero')?.dataset.identityState,
        ),
      )
      .toBe('about-complete');
    await expect(page.locator('.education-stage')).toHaveAttribute(
      'data-education-state',
      'complete',
    );
    await expect(page.locator('.skills-stage')).toHaveAttribute(
      'data-skills-state',
      'complete',
    );
    await page.waitForTimeout(350);
    await page.mouse.wheel(0, -10000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const metrics = await readVerticalScrollMetrics(page);
    expect(metrics.maximumScroll).toBeGreaterThan(0);
  }
});

test('keeps the pinned visual stage stable after responsive resizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  await page.evaluate(() => {
    const hero = document.querySelector('.kinetic-hero');
    window.scrollTo(0, Number(hero.dataset.scrollDistance) * 0.5);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );

    const metrics = await readVerticalScrollMetrics(page);
    expect(metrics.maximumScroll).toBeGreaterThan(0);
    expect(Math.abs(metrics.heights.hero - viewport.height)).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() =>
        Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
      ),
    ).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  }
});

test('keeps native wheel and keyboard scrolling available for future sections', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  await page.evaluate(() => {
    const futureSection = document.createElement('section');
    futureSection.style.minHeight = '100svh';
    futureSection.setAttribute('aria-label', 'Future portfolio section');
    document.querySelector('main').append(futureSection);
  });

  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.keyboard.press('Home');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('exposes the reduced-motion preference to the application', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const prefersReducedMotion = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  expect(prefersReducedMotion).toBe(true);
});
