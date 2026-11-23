import { expect, test } from '@playwright/test';

const waitForIdentity = async (page) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
};

const setSkillsProgress = async (page, progress) => {
  await page.evaluate((nextProgress) => {
    const hero = document.querySelector('.kinetic-hero');
    const target =
      Number(hero.dataset.scrollStart) +
      Number(hero.dataset.scrollDistance) +
      Number(hero.dataset.educationScrollDistance) +
      Number(hero.dataset.skillsScrollDistance) * nextProgress;
    window.scrollTo(0, target);
  }, progress);
  await page.waitForFunction(
    (nextProgress) =>
      Math.abs(
        Number(document.querySelector('.kinetic-hero')?.dataset.skillsProgress) -
          nextProgress,
      ) < 0.02,
    progress,
  );
};

test('hands the final Education record into a reversible vertical Skills formation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);

  await setSkillsProgress(page, 0);
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.skills-stage')).toHaveAttribute('aria-hidden', 'true');

  await setSkillsProgress(page, 0.24);
  await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toBeVisible();
  expect(
    await page
      .getByRole('heading', { name: 'Skills', exact: true })
      .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize)),
  ).toBeLessThanOrEqual(14);
  await expect(page.locator('.skills-stage')).toHaveAttribute(
    'data-skills-state',
    'forming',
  );
  await expect(page.locator('[data-skills-code]')).toHaveCSS('opacity', '0');

  await setSkillsProgress(page, 0.5);
  const collisions = await page.locator('[data-skill-index]').evaluateAll((items) => {
    const visible = items
      .filter((item) => Number.parseFloat(getComputedStyle(item).opacity) > 0.2)
      .map((item) => item.getBoundingClientRect());
    let overlaps = 0;
    for (let left = 0; left < visible.length; left += 1) {
      for (let right = left + 1; right < visible.length; right += 1) {
        const a = visible[left];
        const b = visible[right];
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3
        ) {
          overlaps += 1;
        }
      }
    }
    return overlaps;
  });
  expect(collisions).toBe(0);

  await setSkillsProgress(page, 0.7);
  const movingIcons = await page
    .locator('[data-skill-index]')
    .evaluateAll(
      (items) =>
        items.filter((item) => getComputedStyle(item).transform !== 'none').length,
    );
  expect(movingIcons).toBeGreaterThan(0);

  await setSkillsProgress(page, 1);
  await expect(page.locator('.skills-stage')).toHaveAttribute(
    'data-skills-state',
    'complete',
  );
  await expect(page.locator('[data-skills-code]')).toHaveCSS('opacity', '1');
  await expect(
    page
      .getByRole('navigation', { name: 'Portfolio sections' })
      .getByRole('link', { name: /Skills/ }),
  ).toHaveAttribute('aria-current', 'page');

  await setSkillsProgress(page, 0);
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.skills-stage')).toHaveAttribute('aria-hidden', 'true');
});

test('keeps the completed pyramid readable and overflow-free across required viewports', async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForIdentity(page);
    await setSkillsProgress(page, 1);
    const bounds = await page.locator('.skills-stage__content').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(-1);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(page.locator('[data-skill-index]')).toHaveCount(17);
  }
});

test('uses the supplied PNG fallback when a primary logo cannot load', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForIdentity(page);
  const image = page.locator('.skills-stage__icon').first();
  await image.evaluate((element) => {
    element.src = '/skills/svg/not-found.svg';
  });
  await expect(image).toHaveAttribute('data-fallback-applied', 'true');
  await expect(image).toHaveAttribute('src', /skills\/png\/html5\.png$/);
});

test('renders Skills as readable normal flow for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForIdentity(page);
  await expect(page.locator('.skills-stage')).toHaveAttribute(
    'data-skills-state',
    'reduced',
  );
  await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toBeVisible();
  await expect(page.locator('[data-skill-index]')).toHaveCount(17);
  await expect(page.locator('[data-skills-code]')).toBeVisible();
});
