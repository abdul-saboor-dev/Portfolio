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
    .toBeCloseTo(progress, 1);
};

const readIdentityGlyphs = (page) =>
  page.locator('[data-monogram-role]').evaluateAll((glyphs) =>
    glyphs.map((glyph) => {
      const style = getComputedStyle(glyph);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        character: glyph.dataset.character,
        childCount: glyph.childElementCount,
        color: style.color,
        id: glyph.id,
        opacity: Number(style.opacity),
        role: glyph.dataset.monogramRole,
        scaleX: matrix.a,
        scaleY: matrix.d,
        strokeWidth: Number.parseFloat(style.webkitTextStrokeWidth) || 0,
        target: {
          height: Number(glyph.dataset.monogramTargetHeight),
          left: Number(glyph.dataset.monogramTargetLeft),
          top: Number(glyph.dataset.monogramTargetTop),
          width: Number(glyph.dataset.monogramTargetWidth),
        },
        text: glyph.textContent,
      };
    }),
  );

test('moves the original unchanged A and S into a compact monogram and reverses cleanly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await waitForScrollIdentity(page);

  const hero = page.locator('.kinetic-hero');
  const wordmark = page.getByTestId('kinetic-wordmark');
  const destination = page.locator('.kinetic-monogram__destination');
  const about = page.locator('.kinetic-about');
  const education = page.locator('.education-stage');
  const skills = page.locator('.skills-stage');

  expect(
    await page
      .locator('[data-glyph-id]')
      .evaluateAll((glyphs) => glyphs.map((glyph) => glyph.id)),
  ).toEqual([
    'glyph-a-01',
    'glyph-b-01',
    'glyph-d-01',
    'glyph-u-01',
    'glyph-l-01',
    'glyph-s-01',
    'glyph-a-02',
    'glyph-b-02',
    'glyph-o-01',
    'glyph-o-02',
    'glyph-r-01',
  ]);
  await expect(page.locator('[data-monogram-source], [data-monogram-path]')).toHaveCount(
    0,
  );
  await expect(destination).toHaveAttribute('aria-hidden', 'true');
  await expect(wordmark).not.toHaveAttribute('aria-hidden', 'true');

  for (const progress of [0.2, 0.5, 0.75, 1]) {
    await setScrollProgress(page, progress);
    const glyphs = await readIdentityGlyphs(page);
    expect(glyphs.map(({ id }) => id)).toEqual(['glyph-a-01', 'glyph-s-01']);
    expect(glyphs.map(({ text }) => text)).toEqual(['A', 'S']);
    for (const glyph of glyphs) {
      expect(glyph.childCount).toBe(0);
      expect(glyph.opacity).toBeGreaterThan(0.99);
      expect(glyph.color).toBe('rgb(16, 16, 16)');
      expect(Math.abs(glyph.scaleX - glyph.scaleY)).toBeLessThan(0.001);
    }
  }

  await expect(hero).toHaveAttribute('data-identity-state', 'about-complete');
  await expect(destination).toHaveAttribute('aria-hidden', 'false');
  await expect(wordmark).toHaveAttribute('aria-hidden', 'true');
  const finalGlyphs = await readIdentityGlyphs(page);
  const a = finalGlyphs.find(({ role }) => role === 'a');
  const s = finalGlyphs.find(({ role }) => role === 's');
  expect(s.target.top).toBeGreaterThan(a.target.top);
  expect(s.target.left).toBeGreaterThan(a.target.left);
  expect(s.target.left).toBeLessThan(a.target.left + a.target.width);
  expect(s.strokeWidth * s.scaleX).toBeGreaterThan(0.65);
  expect(s.strokeWidth * s.scaleX).toBeLessThan(1.25);
  expect(Number(await hero.getAttribute('data-monogram-visible-height'))).toBe(36);
  expect(
    await page.locator('.kinetic-monogram__destination[aria-hidden="false"]').count(),
  ).toBe(1);

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await setScrollProgress(page, 0);
    await expect(hero).toHaveAttribute('data-identity-state', 'hero');
    await expect(hero).toHaveAttribute('data-entrance-stage', 'complete');
    await expect(destination).toHaveAttribute('aria-hidden', 'true');
    await expect(wordmark).not.toHaveAttribute('aria-hidden', 'true');
    await expect(about).toBeHidden();
    await expect(education).toBeHidden();
    await expect(skills).toBeHidden();
    const restored = await readIdentityGlyphs(page);
    restored.forEach((glyph) => {
      expect(glyph.opacity).toBeGreaterThan(0.99);
      expect(glyph.scaleX).toBeCloseTo(1, 3);
      expect(glyph.strokeWidth).toBe(0);
    });
    await setScrollProgress(page, 1);
  }

  await setScrollProgress(page, 0);
  await expect
    .poll(() =>
      page
        .locator('[data-glyph-id]')
        .evaluateAll((glyphs) =>
          glyphs.every((glyph) => Number(getComputedStyle(glyph).opacity) > 0.99),
        ),
    )
    .toBe(true);
});

test('uses compact artwork dimensions on desktop and mobile', async ({ page }) => {
  for (const viewport of [
    { expectedHeight: 36, height: 900, width: 1440 },
    { expectedHeight: 34, height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await waitForScrollIdentity(page);
    const hero = page.locator('.kinetic-hero');
    expect(Number(await hero.getAttribute('data-monogram-visible-height'))).toBe(
      viewport.expectedHeight,
    );
    const destination = await page
      .locator('.kinetic-monogram__destination')
      .evaluate((element) => element.getBoundingClientRect());
    expect(destination.height).toBeCloseTo(viewport.expectedHeight, 0);
    expect(destination.width).toBeLessThan(destination.height);
  }
});

test('preserves partial transformation state through a responsive resize', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await waitForScrollIdentity(page);
  await setScrollProgress(page, 0.52);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const resized = await page.evaluate(() => ({
    entranceStage: document.querySelector('.kinetic-hero')?.dataset.entranceStage,
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    progress: Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
    replacementCount: document.querySelectorAll(
      '[data-monogram-source], [data-monogram-path]',
    ).length,
  }));

  expect(resized.progress).toBeGreaterThan(0.35);
  expect(resized.progress).toBeLessThan(0.7);
  expect(resized.horizontalOverflow).toBe(false);
  expect(resized.entranceStage).toBe('complete');
  expect(resized.replacementCount).toBe(0);

  await setScrollProgress(page, 1);
  expect(
    Number(
      await page.locator('.kinetic-hero').getAttribute('data-monogram-visible-height'),
    ),
  ).toBe(34);
  const glyphs = await readIdentityGlyphs(page);
  glyphs.forEach((glyph) => {
    expect(glyph.opacity).toBeGreaterThan(0.99);
    expect(glyph.color).toBe('rgb(16, 16, 16)');
  });
});

test('keeps the mobile menu usable beside the completed compact monogram', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitForScrollIdentity(page);
  await setScrollProgress(page, 1);
  const scrollY = await page.evaluate(() => window.scrollY);

  const trigger = page.getByRole('button', { name: 'Menu' });
  const logoRect = await page
    .locator('.kinetic-monogram__destination')
    .evaluate((element) => element.getBoundingClientRect());
  const triggerRect = await trigger.evaluate((element) =>
    element.getBoundingClientRect(),
  );
  expect(logoRect.right).toBeLessThan(triggerRect.left);
  expect(
    Math.abs(
      logoRect.top + logoRect.height / 2 - (triggerRect.top + triggerRect.height / 2),
    ),
  ).toBeLessThanOrEqual(1);

  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Portfolio' });
  await expect(dialog).toHaveAttribute('data-menu-state', 'open');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test('offers a readable normal-flow About section with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitForScrollIdentity(page);
  const hero = page.locator('.kinetic-hero');
  const reducedDistance = Number(await hero.getAttribute('data-scroll-distance'));
  expect(reducedDistance).toBe(0);
  await expect(hero).toHaveAttribute('data-identity-state', 'reduced');
  await expect(page.getByTestId('kinetic-wordmark')).toBeVisible();
  const about = page.locator('.kinetic-about');
  await expect(about).toBeVisible();
  await expect(about).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await expect(page.locator('[data-about-narrative]')).toHaveCSS(
    'color',
    'rgb(102, 102, 102)',
  );
});

test('serves the supplied AS favicon pack with production sizes', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const faviconLinks = [
    {
      href: '/favicon.ico',
      rel: 'icon',
      sizes: 'any',
      type: 'image/x-icon',
    },
    {
      href: '/favicon-32x32.png',
      rel: 'icon',
      sizes: '32x32',
      type: 'image/png',
    },
    {
      href: '/favicon-16x16.png',
      rel: 'icon',
      sizes: '16x16',
      type: 'image/png',
    },
    {
      href: '/apple-touch-icon.png',
      rel: 'apple-touch-icon',
      sizes: '180x180',
    },
  ];

  for (const { href, rel, sizes, type } of faviconLinks) {
    const link = page.locator(`link[rel="${rel}"][href="${href}"]`);
    await expect(link).toHaveAttribute('sizes', sizes);
    if (type) await expect(link).toHaveAttribute('type', type);
  }

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/site.webmanifest',
  );
  await expect(page.locator('link[href="/favicon.png"]')).toHaveCount(0);

  const rasterAssets = [
    ['/favicon-16x16.png', 16],
    ['/favicon-32x32.png', 32],
    ['/apple-touch-icon.png', 180],
    ['/android-chrome-192x192.png', 192],
    ['/android-chrome-512x512.png', 512],
  ];

  for (const [src, size] of rasterAssets) {
    const response = await request.get(src);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');

    const dimensions = await page.evaluate(
      (imageSource) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () =>
            resolve({ height: image.naturalHeight, width: image.naturalWidth });
          image.onerror = reject;
          image.src = imageSource;
        }),
      src,
    );
    expect(dimensions).toEqual({ height: size, width: size });
  }
});
