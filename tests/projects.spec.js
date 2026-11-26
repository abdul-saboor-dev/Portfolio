import { expect, test } from '@playwright/test';

async function openProjects(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  return page.locator('.kinetic-hero').evaluate((root) => ({
    start: Number(root.dataset.scrollStart),
    identity: Number(root.dataset.scrollDistance),
    education: Number(root.dataset.educationScrollDistance),
    skills: Number(root.dataset.skillsScrollDistance),
    projects: Number(root.dataset.projectsScrollDistance),
    total: Number(root.querySelector('.projects')?.dataset.timelineUnits),
  }));
}
async function seek(page, metrics, unit) {
  const target =
    metrics.start +
    metrics.identity +
    metrics.education +
    metrics.skills +
    (metrics.projects * unit) / metrics.total;
  await page.evaluate((y) => window.scrollTo(0, y), target);
  await page.waitForTimeout(150);
  await expect(page.locator('.projects')).toHaveAttribute('aria-hidden', 'false');
}
async function cardState(page, index) {
  return page.locator('[data-project-card="' + index + '"]').evaluate((el) => ({
    matrix: getComputedStyle(el).transform,
    rect: el.getBoundingClientRect().toJSON(),
    opacity: Number(getComputedStyle(el).opacity),
  }));
}
test('Development uses the same landscape screenshot on desktop and mobile', async ({
  page,
}) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 0.9);
  await expect(
    page.getByRole('heading', { name: 'Projects, Development' }),
  ).toBeVisible();
  await expect(page.locator('[data-project-card="0"] img')).toHaveJSProperty(
    'complete',
    true,
  );
  const src = await page
    .locator('[data-project-card="0"] img')
    .evaluate((el) => el.currentSrc);
  expect(src).toContain('dae2uni-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobileSrc = await page
    .locator('[data-project-card="0"] img')
    .evaluate((el) => el.currentSrc);
  expect(mobileSrc).toBe(src);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBe(true);
});

test('scroll progress moves both card sides continuously and reverses exactly', async ({
  page,
}) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 0.86);
  const first = await cardState(page, 0);
  await seek(page, metrics, 1.35);
  const midway = await cardState(page, 0);
  const incoming = await cardState(page, 1);
  expect(midway.rect.width).toBeLessThan(first.rect.width);
  expect(incoming.rect.width).toBeGreaterThan(0);
  expect(midway.matrix).not.toBe(first.matrix);
  await seek(page, metrics, 0.86);
  const restored = await cardState(page, 0);
  expect(Math.abs(restored.rect.x - first.rect.x)).toBeLessThan(2);
  expect(Math.abs(restored.rect.y - first.rect.y)).toBeLessThan(2);
  expect(Math.abs(restored.rect.width - first.rect.width)).toBeLessThan(2);
});

test('halfway cards keep separate, symmetric depth lanes', async ({ page }) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 1.35);
  const first = await cardState(page, 0);
  const second = await cardState(page, 1);
  expect(first.rect.right).toBeLessThan(second.rect.left);
  expect(first.rect.left).toBeGreaterThanOrEqual(0);
  expect(second.rect.right).toBeLessThanOrEqual(page.viewportSize().width);
  expect(Math.abs(first.opacity - second.opacity)).toBeLessThan(0.02);
});

test('Creative follows native scroll and artwork viewer returns focus', async ({
  page,
}) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 5.55);
  await expect(page.getByRole('heading', { name: 'Projects, Creative' })).toBeVisible();
  await expect(page.locator('.projects__chapter--build')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await page.getByRole('button', { name: 'Next artwork' }).click();
  await expect(page.locator('.projects')).toHaveAttribute('data-art-index', '1');
  await seek(page, metrics, 6.2);
  await expect(page.locator('.projects')).toHaveAttribute('data-art-index', '1');
  await seek(page, metrics, 5.25);
  await expect(page.locator('.projects')).toHaveAttribute('data-art-index', '0');
  const field = await page.locator('.projects__field--design').boundingBox();
  await page.mouse.move(field.x + field.width * 0.65, field.y + field.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(field.x + field.width * 0.4, field.y + field.height * 0.5, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator('.projects')).toHaveAttribute('data-art-index', '1');
  await seek(page, metrics, 3.9);
  await seek(page, metrics, 5.25);
  await expect(page.locator('.projects')).toHaveAttribute('data-art-index', '0');
  await page.getByRole('button', { name: 'View artwork' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View artwork' })).toBeFocused();
});

test('short mobile keeps both chapter images clear of the project details', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const metrics = await openProjects(page);
  for (const [unit, chapter, card] of [
    [0.9, 'build', '[data-project-card="0"]'],
    [5.55, 'design', '[data-artwork="0"]'],
  ]) {
    await seek(page, metrics, unit);
    const bounds = await page.evaluate(
      ({ chapter, card }) => ({
        details: document
          .querySelector('.projects__chapter--' + chapter + ' .projects__editorial')
          .getBoundingClientRect()
          .toJSON(),
        card: document.querySelector(card).getBoundingClientRect().toJSON(),
        links: document
          .querySelector('.projects__chapter--' + chapter + ' .projects__links')
          ?.getBoundingClientRect()
          .toJSON(),
        controls: document
          .querySelector('.projects__chapter--' + chapter + ' .projects__controls')
          .getBoundingClientRect()
          .toJSON(),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }),
      { chapter, card },
    );
    expect(bounds.card.bottom).toBeLessThan(bounds.details.top + 3);
    if (bounds.links)
      expect(bounds.controls.top).toBeGreaterThan(bounds.links.bottom + 4);
    expect(bounds.overflow).toBe(false);
  }
});

test('short landscape keeps the active design print inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const metrics = await openProjects(page);
  await seek(page, metrics, 5.55);
  const artwork = await page
    .locator('[data-artwork="0"]')
    .evaluate((element) => element.getBoundingClientRect().toJSON());
  expect(artwork.top).toBeGreaterThanOrEqual(60);
  expect(artwork.bottom).toBeLessThanOrEqual(374);
});

test('compact handoff clears the outgoing card before it reaches the header', async ({
  page,
}) => {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await openProjects(page);
    const projectCount = Number(
      await page.locator('.projects').getAttribute('data-project-count'),
    );
    await seek(page, metrics, 0.85 + projectCount + 0.35 + 0.5);
    const layers = await page.evaluate(() => ({
      outgoing: Number(
        getComputedStyle(document.querySelector('.projects__chapter--build')).opacity,
      ),
      incoming: Number(
        getComputedStyle(document.querySelector('.projects__chapter--design')).opacity,
      ),
    }));
    expect(layers.outgoing).toBeLessThan(0.02);
    expect(layers.incoming).toBeGreaterThan(0.5);
  }
});

test('both chapters share a Continue anchor and Build Continue uses the scroll timeline', async ({
  page,
}) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 0.9);
  const buildContinue = await page
    .locator('.projects__chapter--build .projects__continue')
    .boundingBox();
  await seek(page, metrics, 5.55);
  const designContinue = await page
    .locator('.projects__chapter--design .projects__continue')
    .boundingBox();
  expect(Math.abs(buildContinue.x - designContinue.x)).toBeLessThan(1);
  expect(Math.abs(buildContinue.y - designContinue.y)).toBeLessThan(1);
  await seek(page, metrics, 1.2);
  await page.locator('.projects__chapter--build .projects__continue').click();
  await expect(page.locator('.projects')).toHaveAttribute(
    'data-projects-state',
    'design',
  );
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(
    metrics.start + metrics.identity + metrics.education + metrics.skills,
  );
});

test('chapter transition and final cards have no extra gateway or blank scene', async ({
  page,
}) => {
  const metrics = await openProjects(page);
  await seek(page, metrics, 3.9);
  await expect(page.locator('.projects__card--ending')).toContainText(
    'More in the works.',
  );
  const buildFinish = await page.locator('.projects__card--ending').evaluate((el) => ({
    radius: getComputedStyle(el).borderRadius,
    face: getComputedStyle(el, '::after').backgroundColor,
    side: getComputedStyle(el, '::before').transform,
  }));
  expect(parseFloat(buildFinish.radius)).toBeGreaterThanOrEqual(12);
  expect(buildFinish.face).toBe('rgb(16, 16, 16)');
  expect(buildFinish.side).not.toBe('none');
  await seek(page, metrics, 4.7);
  await expect(page.locator('.projects')).toHaveAttribute(
    'data-projects-state',
    'handoff',
  );
  const visibility = await page.evaluate(() => {
    const build = document.querySelector('.projects__chapter--build');
    const design = document.querySelector('.projects__chapter--design');
    const labels = document.querySelectorAll('[data-projects-discipline]');
    const buildHeading = Number(getComputedStyle(labels[0]).opacity);
    const designHeading = Number(getComputedStyle(labels[1]).opacity);
    return {
      cards:
        Number(getComputedStyle(build).opacity) +
        Number(getComputedStyle(design).opacity),
      headings: buildHeading + designHeading,
      indicator: Number(
        getComputedStyle(document.querySelector('.projects__indicator')).opacity,
      ),
      quieterHeading: Math.min(buildHeading, designHeading),
    };
  });
  expect(visibility.cards).toBeGreaterThan(0.3);
  expect(visibility.indicator).toBeLessThan(0.1);
  expect(visibility.quieterHeading).toBeLessThan(0.1);
  await seek(page, metrics, metrics.total - 0.1);
  await expect(page.locator('.projects__artwork--ending')).toBeVisible();
  await expect(page.locator('.projects__artwork--ending')).toContainText(
    'When creative instinct kicks in.',
  );
  expect(
    await page
      .locator('.projects__artwork--ending')
      .evaluate((el) => parseFloat(getComputedStyle(el).borderRadius)),
  ).toBeGreaterThanOrEqual(10);
  expect(
    await page
      .locator('.projects__divider, .projects__visited-label, .projects__explore')
      .count(),
  ).toBe(0);
});

test('reduced motion exposes both chapters in normal flow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.projects__reduced')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Projects · Development' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projects · Creative' })).toBeVisible();
  expect(
    await page.locator('.projects').evaluate((el) => getComputedStyle(el).position),
  ).toBe('relative');
});
