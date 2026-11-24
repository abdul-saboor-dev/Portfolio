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

const readSkillGeometry = (page) =>
  page.locator('[data-skill-index]').evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return {
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        end: Number(item.dataset.fanEnd),
        id: item.dataset.skillId,
        left: rect.left,
        opacity: Number(style.opacity),
        right: rect.right,
        row: Number(item.dataset.skillRow),
        top: rect.top,
        transform: style.transform,
      };
    }),
  );

const countVisibleCollisions = (items) => {
  const visible = items.filter((item) => item.opacity > 0.2);
  let overlaps = 0;
  for (let left = 0; left < visible.length; left += 1) {
    for (let right = left + 1; right < visible.length; right += 1) {
      const a = visible[left];
      const b = visible[right];
      const horizontal = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (horizontal > 2 && vertical > 2) overlaps += 1;
    }
  }
  return overlaps;
};

const countTextIntersections = (page) =>
  page.evaluate(() => {
    const textRects = [
      document.querySelector('.skills-stage__header').getBoundingClientRect(),
      document.querySelector('[data-skills-copy]').getBoundingClientRect(),
    ];
    return [...document.querySelectorAll('[data-skill-index]')]
      .filter((item) => Number(getComputedStyle(item).opacity) > 0.1)
      .map((item) => item.getBoundingClientRect())
      .reduce(
        (count, icon) =>
          count +
          textRects.filter(
            (text) =>
              Math.min(icon.right, text.right) - Math.max(icon.left, text.left) > 1 &&
              Math.min(icon.bottom, text.bottom) - Math.max(icon.top, text.top) > 1,
          ).length,
        0,
      );
  });

test('hands the final Education record into a reversible vertical Skills formation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);

  await setSkillsProgress(page, 0);
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.skills-stage')).toHaveAttribute('aria-hidden', 'true');

  await setSkillsProgress(page, 0.32);
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
  await expect(
    page.getByRole('heading', { name: 'Built with curiosity.' }),
  ).toBeVisible();
  await expect(
    page.getByText('A growing collection of technologies I use, explore, and learn.'),
  ).toBeVisible();
  await expect(page.locator('[data-skill-index]').first()).toBeVisible();

  await setSkillsProgress(page, 0.5);
  const collisions = countVisibleCollisions(await readSkillGeometry(page));
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
  await expect(page.locator('.skills-stage')).toHaveCount(1);
  await expect(page.locator('[data-skills-formation]')).toHaveCount(1);
  await expect(page.locator('[data-skills-code]')).toHaveCount(0);
  expect(
    await page.locator('[data-skill-id]').evaluateAll((items) => {
      const ids = items.map((item) => item.dataset.skillId);
      return new Set(ids).size;
    }),
  ).toBe(17);
  await expect(
    page
      .getByRole('navigation', { name: 'Portfolio sections' })
      .getByRole('link', { name: /Skills/ }),
  ).toHaveAttribute('aria-current', 'page');

  await setSkillsProgress(page, 0);
  await expect(page.locator('.education-stage')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.skills-stage')).toHaveAttribute('aria-hidden', 'true');
});

test('hands Education to Skills through one monotonic entrance', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);
  const samples = [];

  for (const progress of [0, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32]) {
    await setSkillsProgress(page, progress);
    samples.push(
      await page.evaluate(() => {
        const opacity = (selector) =>
          Number(getComputedStyle(document.querySelector(selector)).opacity);
        return {
          clipPath: getComputedStyle(document.querySelector('.skills-stage__content'))
            .clipPath,
          copy: opacity('[data-skills-copy]'),
          heading: opacity('.skills-stage__header'),
          icon: opacity('[data-skill-index]'),
        };
      }),
    );
  }

  for (const key of ['copy', 'heading', 'icon']) {
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index][key]).toBeGreaterThanOrEqual(samples[index - 1][key]);
    }
  }
  expect(samples.every(({ clipPath }) => clipPath === 'none')).toBe(true);
  expect(samples[5].icon).toBe(0);
  expect(samples.at(-1).heading).toBe(1);
  expect(samples.at(-1).copy).toBeGreaterThan(0.99);

  await setSkillsProgress(page, 0.12);
  const reversed = await page.evaluate(() => ({
    copy: Number(getComputedStyle(document.querySelector('[data-skills-copy]')).opacity),
    heading: Number(
      getComputedStyle(document.querySelector('.skills-stage__header')).opacity,
    ),
  }));
  expect(reversed.copy).toBe(0);
  expect(reversed.heading).toBe(0);
});

test('keeps each row fan continuous, collision-free, and reversible through settling', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);

  for (const progress of [0.3, 0.42, 0.54, 0.66, 0.75]) {
    await setSkillsProgress(page, progress);
    const frame = await readSkillGeometry(page);
    expect(countVisibleCollisions(frame)).toBe(0);
    expect(await countTextIntersections(page)).toBe(0);
    for (const item of frame.filter(({ opacity }) => opacity > 0.1)) {
      expect(item.left).toBeGreaterThanOrEqual(-1);
      expect(item.right).toBeLessThanOrEqual(1441);
      expect(item.top).toBeGreaterThanOrEqual(-1);
      expect(item.bottom).toBeLessThanOrEqual(901);
    }
  }

  await setSkillsProgress(page, 0.54);
  const forward = await readSkillGeometry(page);
  await setSkillsProgress(page, 0.78);
  await setSkillsProgress(page, 0.54);
  const reversed = await readSkillGeometry(page);
  for (let index = 0; index < forward.length; index += 1) {
    expect(
      Math.hypot(
        reversed[index].centerX - forward[index].centerX,
        reversed[index].centerY - forward[index].centerY,
      ),
    ).toBeLessThan(0.75);
    expect(reversed[index].transform).toBe(forward[index].transform);
  }

  const rowEnds = [
    ...new Set(forward.map(({ end }) => end).filter(Number.isFinite)),
  ].sort();
  for (const end of rowEnds) {
    const checkpoints = [end - 0.006, end - 0.003, end, end + 0.003];
    const frames = [];
    for (const checkpoint of checkpoints) {
      await setSkillsProgress(page, checkpoint);
      frames.push(await readSkillGeometry(page));
    }

    for (let index = 0; index < frames[0].length; index += 1) {
      if (frames[0][index].end !== end) continue;
      const before = Math.hypot(
        frames[1][index].centerX - frames[0][index].centerX,
        frames[1][index].centerY - frames[0][index].centerY,
      );
      const settling = Math.hypot(
        frames[2][index].centerX - frames[1][index].centerX,
        frames[2][index].centerY - frames[1][index].centerY,
      );
      const settled = Math.hypot(
        frames[3][index].centerX - frames[2][index].centerX,
        frames[3][index].centerY - frames[2][index].centerY,
      );
      expect(settling).toBeLessThanOrEqual(before + 0.75);
      expect(settled).toBeLessThan(0.35);
    }
  }
});

test('remeasures a partial fan from CSS destinations without a resize jump', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);
  await setSkillsProgress(page, 0.6);
  const before = await readSkillGeometry(page);

  await page.setViewportSize({ width: 1439, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(120);
  await setSkillsProgress(page, 0.6);
  const after = await readSkillGeometry(page);

  for (let index = 0; index < before.length; index += 1) {
    expect(
      Math.hypot(
        after[index].centerX - before[index].centerX,
        after[index].centerY - before[index].centerY,
      ),
    ).toBeLessThan(1.25);
  }
});

test('navigates desktop and mobile controls to the master Skills entry point', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForIdentity(page);
  const hero = page.locator('.kinetic-hero');
  const completedAt = await hero.getAttribute('data-entrance-completed-at');
  const desktopNavigation = page.getByRole('navigation', {
    name: 'Portfolio sections',
  });

  await desktopNavigation.getByRole('link', { name: /Skills/ }).click();
  await page.waitForFunction(
    () => Number(document.querySelector('.kinetic-hero')?.dataset.skillsProgress) >= 0.29,
  );
  await expect(desktopNavigation.getByRole('link', { name: /Skills/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(hero).toHaveAttribute('data-entrance-completed-at', completedAt);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForIdentity(page);
  const mobileCompletedAt = await hero.getAttribute('data-entrance-completed-at');
  await expect(page.locator('.education-stage')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.skills-stage')).toHaveCSS('visibility', 'hidden');
  await page.getByRole('button', { name: 'Menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Portfolio' });
  await expect(dialog).toHaveAttribute('data-menu-state', 'open');
  await dialog.getByRole('link', { name: /Skills/ }).click();
  await expect(dialog).not.toBeVisible();
  await page.waitForFunction(
    () => Number(document.querySelector('.kinetic-hero')?.dataset.skillsProgress) >= 0.29,
  );
  await expect(hero).toHaveAttribute('data-skills-state', /forming|complete/);
  await expect(hero).toHaveAttribute('data-entrance-completed-at', mobileCompletedAt);
});

test('reverses across Skills, Education, and About without leaving a stale scene', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForIdentity(page);

  await setSkillsProgress(page, 1);
  await setSkillsProgress(page, 0);
  await expect(page.locator('.skills-stage')).toBeHidden();
  await expect(page.locator('.education-stage')).toBeVisible();
  expect(
    await page
      .locator('.education-stage__content')
      .evaluate((element) => getComputedStyle(element).clipPath),
  ).toBe('inset(0px)');

  await page.evaluate(() => {
    const hero = document.querySelector('.kinetic-hero');
    window.scrollTo(
      0,
      Number(hero.dataset.scrollStart) + Number(hero.dataset.scrollDistance),
    );
  });
  await page.waitForFunction(
    () =>
      Number(document.querySelector('.kinetic-hero')?.dataset.educationProgress) === 0,
  );
  await expect(page.locator('.education-stage')).toBeHidden();
  await expect(page.locator('.kinetic-about')).toBeVisible();
  expect(
    await page
      .locator('.kinetic-about__content')
      .evaluate((element) => getComputedStyle(element).clipPath),
  ).toBe('inset(0px)');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.identityState === 'hero',
  );
  await expect(page.locator('.kinetic-about')).toBeHidden();
  await expect(page.locator('.education-stage')).toBeHidden();
  await expect(page.locator('.skills-stage')).toBeHidden();
  await expect(page.getByTestId('kinetic-wordmark')).toBeVisible();
});

test('keeps the completed irregular formation readable and overflow-free across required viewports', async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
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
    await expect(page.locator('[data-skills-code]')).toHaveCount(0);
    const firstIcon = await page
      .locator('.skills-stage__icon')
      .first()
      .evaluate((icon) => {
        const rect = icon.getBoundingClientRect();
        return Math.min(rect.width, rect.height);
      });
    const minimumIconSize = viewport.height <= 540 ? 34 : viewport.width <= 390 ? 35 : 58;
    expect(firstIcon).toBeGreaterThanOrEqual(minimumIconSize);
  }
});

test('keeps mobile Skills content clear of the persistent header', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForIdentity(page);
    await setSkillsProgress(page, 1);
    const clearance = await page.evaluate(() => {
      const navigation = document
        .querySelector('.hero-navigation__trigger')
        .getBoundingClientRect();
      const label = document
        .querySelector('.skills-stage__header')
        .getBoundingClientRect();
      const copy = document.querySelector('[data-skills-copy]').getBoundingClientRect();
      const formation = document
        .querySelector('[data-skills-formation]')
        .getBoundingClientRect();
      return {
        copyBottom: copy.bottom,
        copyTop: copy.top,
        formationBottom: formation.bottom,
        formationTop: formation.top,
        headerBottom: navigation.bottom,
        labelTop: label.top,
      };
    });
    expect(clearance.labelTop - clearance.headerBottom).toBeGreaterThanOrEqual(34);
    expect(clearance.copyTop).toBeGreaterThan(clearance.labelTop);
    expect(clearance.formationTop - clearance.copyBottom).toBeLessThan(64);
    expect(viewport.height - clearance.formationBottom).toBeLessThan(96);

    for (const progress of [0.28, 0.4, 0.58, 0.75]) {
      await setSkillsProgress(page, progress);
      expect(await countTextIntersections(page)).toBe(0);
      expect(countVisibleCollisions(await readSkillGeometry(page))).toBe(0);
    }
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
  await expect(
    page.getByRole('heading', { name: 'Built with curiosity.' }),
  ).toBeVisible();
  await expect(page.locator('[data-skill-index]')).toHaveCount(17);
  await expect(page.locator('[data-skills-code]')).toHaveCount(0);
});
