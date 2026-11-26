import { expect, test } from '@playwright/test';
import { KINETIC_TIMING } from '../src/animation/kineticTiming.js';

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
];

const delayDisplayFontReadiness = async (page, delayMs) => {
  await page.addInitScript((delay) => {
    const load = FontFaceSet.prototype.load;
    FontFaceSet.prototype.load = function delayedFontReadiness(...args) {
      return new Promise((resolve, reject) => {
        window.setTimeout(() => load.apply(this, args).then(resolve, reject), delay);
      });
    };
  }, delayMs);
};

const installEntranceFrameProbe = async (page) => {
  await page.addInitScript(() => {
    window.__entranceFrames = [];
    let initialGlyphs = null;

    const sample = () => {
      const hero = document.querySelector('.kinetic-hero');
      if (!hero) {
        requestAnimationFrame(sample);
        return;
      }

      const glyphs = [...document.querySelectorAll('[data-glyph-id]')];
      if (!initialGlyphs && glyphs.length === 11) initialGlyphs = glyphs;
      const visibleRects = glyphs
        .filter((glyph) => {
          const style = getComputedStyle(glyph);
          const rect = glyph.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) > 0.01 &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((glyph) => glyph.getBoundingClientRect());

      const frame = {
        state: hero.dataset.entrance,
        stage: hero.dataset.entranceStage,
        blank: visibleRects.length !== 11,
        centerX: null,
        centerY: null,
        spanWidth: 0,
        orbitAngle: null,
        sameGlyphNodes:
          initialGlyphs?.length === 11 &&
          glyphs.every((glyph, index) => glyph === initialGlyphs[index]),
      };

      if (visibleRects.length === 11) {
        const left = Math.min(...visibleRects.map((rect) => rect.left));
        const right = Math.max(...visibleRects.map((rect) => rect.right));
        const top = Math.min(...visibleRects.map((rect) => rect.top));
        const bottom = Math.max(...visibleRects.map((rect) => rect.bottom));
        frame.centerX = (left + right) / 2;
        frame.centerY = (top + bottom) / 2;
        frame.spanWidth = right - left;
        const first = visibleRects[0];
        frame.orbitAngle =
          Math.atan2(
            first.top + first.height / 2 - frame.centerY,
            first.left + first.width / 2 - frame.centerX,
          ) *
          (180 / Math.PI);
      }

      window.__entranceFrames.push(frame);
      if (frame.state !== 'complete' && window.__entranceFrames.length < 360) {
        requestAnimationFrame(sample);
      }
    };

    requestAnimationFrame(sample);
  });
};

const expectContinuousFirstPaint = (frames, viewport) => {
  const firstVisibleIndex = frames.findIndex(({ blank }) => !blank);
  expect(firstVisibleIndex).toBeGreaterThanOrEqual(0);
  const firstVisible = frames[firstVisibleIndex];
  expect(['preparing', 'running']).toContain(firstVisible.state);
  expect(firstVisible.stage).toBe('orbit');
  expect(firstVisible.spanWidth).toBeLessThan(Math.min(220, viewport.width * 0.58));
  expect(Math.abs(firstVisible.centerX - viewport.width / 2)).toBeLessThan(8);
  expect(Math.abs(firstVisible.centerY - viewport.height / 2)).toBeLessThan(8);

  const framesBeforeCompletion = frames.slice(
    firstVisibleIndex,
    frames.findIndex(({ state }) => state === 'complete'),
  );
  expect(framesBeforeCompletion.length).toBeGreaterThan(0);
  expect(framesBeforeCompletion.some(({ blank }) => blank)).toBe(false);
  expect(frames.some(({ sameGlyphNodes }) => !sameGlyphNodes)).toBe(false);

  const orbitFrames = framesBeforeCompletion.filter(
    ({ stage, orbitAngle }) => stage === 'orbit' && Number.isFinite(orbitAngle),
  );
  let angularTravel = 0;
  for (let index = 1; index < orbitFrames.length; index += 1) {
    const previous = orbitFrames[index - 1].orbitAngle;
    const current = orbitFrames[index].orbitAngle;
    angularTravel += ((current - previous + 540) % 360) - 180;
  }
  expect(orbitFrames.length).toBeGreaterThan(5);
  expect(Math.abs(angularTravel)).toBeGreaterThan(12);
};

test('renders one accessible name heading from eleven stable glyph instances', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Skip to portfolio' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  const heading = page.getByRole('heading', { level: 1, name: 'ABDUL SABOOR' });
  const glyphs = page.locator('[data-glyph-id]');

  await expect(heading).toBeVisible();
  await expect(glyphs).toHaveCount(11);

  const identity = await glyphs.evaluateAll((elements) => ({
    characters: elements.map((element) => element.dataset.character).join(''),
    ids: elements.map((element) => element.dataset.glyphId),
    monogramRoles: elements
      .filter((element) => element.dataset.monogramRole)
      .map((element) => element.dataset.monogramRole),
  }));

  expect(identity.characters).toBe('ABDULSABOOR');
  expect(new Set(identity.ids).size).toBe(11);
  expect(identity.monogramRoles).toEqual(['a', 's']);
});

test('shows the circular loader on first paint without a Hero flash or blank handoff', async ({
  page,
}, testInfo) => {
  const viewport = testInfo.project.name.includes('mobile')
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };
  await page.setViewportSize(viewport);
  await installEntranceFrameProbe(page);
  await page.route('**/src/main.jsx', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );
  const coldFrames = await page.evaluate(() => window.__entranceFrames);
  expectContinuousFirstPaint(coldFrames, viewport);
  const coldMetrics = await page.locator('.kinetic-hero').evaluate((hero) => ({
    loaderVisibleMs: Number(hero.dataset.loaderVisibleMs),
    releaseElapsedMs: Number(hero.dataset.releaseElapsedMs),
    heroSettleMs: Number(hero.dataset.heroSettleMs),
  }));
  expect(coldMetrics.loaderVisibleMs).toBeGreaterThan(
    KINETIC_TIMING.minimumLoaderPresentationMs - 35,
  );
  expect(coldMetrics.releaseElapsedMs).toBeGreaterThan(2100);
  expect(coldMetrics.heroSettleMs).toBeLessThan(320);

  await page.unroute('**/src/main.jsx');
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );
  const cachedFrames = await page.evaluate(() => window.__entranceFrames);
  expectContinuousFirstPaint(cachedFrames, viewport);
  const cachedMetrics = await page.locator('.kinetic-hero').evaluate((hero) => ({
    minimumLoaderMs: Number(hero.dataset.loaderMinimumMs),
    loaderVisibleMs: Number(hero.dataset.loaderVisibleMs),
    orbitTravelDegrees: Number(hero.dataset.orbitTravelDegrees),
  }));
  expect(cachedMetrics.minimumLoaderMs).toBe(KINETIC_TIMING.minimumLoaderPresentationMs);
  expect(cachedMetrics.loaderVisibleMs).toBeGreaterThan(
    KINETIC_TIMING.minimumLoaderPresentationMs - 35,
  );
  expect(cachedMetrics.loaderVisibleMs).toBeLessThan(
    KINETIC_TIMING.minimumLoaderPresentationMs + 180,
  );
  expect(cachedMetrics.orbitTravelDegrees).toBeGreaterThan(18);
});

test('keeps the same glyph rendering scale across the CSS-to-GSAP handoff', async ({
  page,
}) => {
  let allowHydration;
  const hydrationGate = new Promise((resolve) => {
    allowHydration = resolve;
  });
  await page.route('**/src/main.jsx', async (route) => {
    await hydrationGate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  const hero = page.locator('.kinetic-hero');
  const glyph = page.locator('[data-glyph-id]').first();
  await expect(hero).toHaveAttribute('data-entrance', 'preparing');
  await hero.evaluate((element) => {
    element.dataset.loaderMinimumMs = '10000';
  });
  await page.evaluate(() => document.fonts.load('400 1em "League Gothic"'));
  await page.evaluate(() => window.__kineticInitialLoader?.measure?.());

  const preparing = await glyph.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return {
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
      scale: Math.hypot(matrix.m11, matrix.m12),
    };
  });

  await page.evaluate(() => {
    window.__kineticLoaderStartedAt = performance.now();
  });
  allowHydration();
  await expect(hero).toHaveAttribute('data-entrance', 'running');
  const running = await glyph.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return {
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
      scale: Math.hypot(matrix.m11, matrix.m12),
    };
  });

  expect(preparing.fontFamily).toBe(running.fontFamily);
  expect(preparing.fontWeight).toBe(running.fontWeight);
  expect(Math.abs(preparing.fontSize - running.fontSize)).toBeLessThan(0.01);
  expect(
    Math.abs(preparing.scale - running.scale),
    `preparing ${preparing.scale.toFixed(6)}, running ${running.scale.toFixed(6)}`,
  ).toBeLessThan(0.002);
});

test('uses approved CMS fallback content without fabricating Hero copy', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('.kinetic-hero')).toHaveAttribute(
    'data-content-status',
    /loading|unconfigured/,
  );
  const statements = page.locator('[data-hero-statement]');
  await expect(statements).toHaveText([
    'I build for the web.',
    'I design with intent.',
    'I solve through code.',
  ]);
  await expect(page.getByText('WEB DEVELOPER', { exact: true })).toHaveCount(0);
  await expect(page.getByText('CREATIVE DESIGNER', { exact: true })).toHaveCount(0);
  await expect(page.getByText('PROBLEM SOLVER', { exact: true })).toHaveCount(0);
  await expect(page.locator('.kinetic-hero__introduction')).toHaveText(
    'Building digital experiences through code, creativity, and thoughtful design.',
  );
});

test('reveals the editorial composition inside the existing glyph-settle phrase', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__editorialRevealFrames = [];
    const isVisible = (element) =>
      Boolean(
        element?.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
      );
    const sample = () => {
      const hero = document.querySelector('.kinetic-hero');
      if (!hero) {
        requestAnimationFrame(sample);
        return;
      }

      const statements = [...document.querySelectorAll('[data-hero-statement]')];
      const actions = [...document.querySelectorAll('.kinetic-hero__action')];
      window.__editorialRevealFrames.push({
        state: hero.dataset.entrance,
        progress: Number(hero.dataset.entranceProgress),
        statementsVisible: statements.filter(isVisible).length,
        introductionVisible: isVisible(
          document.querySelector('.kinetic-hero__introduction'),
        ),
        actionsVisible: actions.filter(isVisible).length,
        navigationVisible: isVisible(document.querySelector('.hero-navigation')),
      });

      if (hero.dataset.entrance !== 'complete') requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );
  const frames = await page.evaluate(() => window.__editorialRevealFrames);
  const earlyFrames = frames.filter(
    ({ state, progress }) => state !== 'complete' && progress < 0.45,
  );
  const firstStatementFrame = frames.find(
    ({ state, statementsVisible }) => state === 'running' && statementsVisible > 0,
  );
  const firstActionFrame = frames.find(
    ({ state, actionsVisible }) => state === 'running' && actionsVisible > 0,
  );
  const completed = frames.at(-1);

  expect(earlyFrames.length).toBeGreaterThan(0);
  expect(earlyFrames.every(({ statementsVisible }) => statementsVisible === 0)).toBe(
    true,
  );
  expect(earlyFrames.every(({ introductionVisible }) => !introductionVisible)).toBe(true);
  expect(earlyFrames.every(({ actionsVisible }) => actionsVisible === 0)).toBe(true);
  expect(earlyFrames.every(({ navigationVisible }) => !navigationVisible)).toBe(true);
  expect(firstStatementFrame.progress).toBeGreaterThan(0.5);
  expect(firstStatementFrame.progress).toBeLessThan(0.9);
  expect(firstActionFrame.progress).toBeLessThan(0.99);
  expect(completed).toMatchObject({
    state: 'complete',
    statementsVisible: 3,
    introductionVisible: true,
    actionsVisible: 2,
    navigationVisible: true,
  });
});

test('renders the six-section navigation with only real destinations active', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const navigation = page.getByRole('navigation', { name: 'Portfolio sections' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: /Home/ })).toHaveAttribute(
    'href',
    '#home',
  );
  await expect(navigation.getByRole('link', { name: /Home/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(navigation.getByRole('link', { name: /About/ })).toHaveAttribute(
    'href',
    '#about',
  );
  await expect(navigation.getByRole('link', { name: /Education/ })).toHaveAttribute(
    'href',
    '#education',
  );
  await expect(navigation.getByRole('link', { name: /Skills/ })).toHaveAttribute(
    'href',
    '#skills',
  );
  await expect(navigation.getByRole('link', { name: /Projects/ })).toHaveAttribute(
    'href',
    '#projects',
  );
  for (const label of ['Contact']) {
    await expect(
      navigation.locator('.hero-navigation__item').filter({ hasText: label }),
    ).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(navigation.locator('a')).toHaveCount(5);
  const actions = page.getByLabel('Hero actions');
  await expect(actions).toBeVisible();
  await expect(actions.locator('.kinetic-hero__action')).toHaveCount(2);
  await expect(
    actions.locator('.kinetic-hero__action').filter({ hasText: 'Explore Projects' }),
  ).toHaveAttribute('href', '#projects');
  await expect(
    actions.locator('.kinetic-hero__action').filter({ hasText: 'View CV' }),
  ).toBeEnabled();
  await expect(page.locator('.cv-viewer')).toHaveCount(1);
  const scrollCue = page.locator('.kinetic-hero__scroll-cue');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  await expect(scrollCue).toBeVisible();
  await expect(scrollCue).toHaveAttribute('href', '#about');
  await expect(scrollCue).not.toHaveAttribute('tabindex', '-1');

  await expect(actions.getByRole('link', { name: /Explore Projects/i })).toHaveAttribute(
    'href',
    '#projects',
  );
  await expect(navigation.locator('a')).toHaveCount(5);
  await expect(scrollCue).toBeVisible();
  await expect(scrollCue).toHaveAttribute('href', '#about');
  await expect(scrollCue).not.toHaveAttribute('tabindex', '-1');
});

test('interpolates desktop navigation weights without moving neighboring items', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const navigation = page.getByRole('navigation', { name: 'Portfolio sections' });
  const home = navigation.getByRole('link', { name: /Home/ });
  await page.evaluate(() => {
    const projects = document.createElement('section');
    projects.id = 'projects';
    projects.style.minHeight = '100vh';
    document.querySelector('main').append(projects);
  });
  const projects = navigation.getByRole('link', { name: /Projects/ });
  await expect(projects).toBeVisible();

  const variableFace = await page.evaluate(
    () =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .find(
          (rule) =>
            rule instanceof CSSFontFaceRule &&
            rule.style.fontFamily.replaceAll("'", '') === 'Archivo',
        )?.style.fontWeight,
  );
  expect(variableFace).toBe('400 700');

  const readWeights = (locator) =>
    locator.evaluate((element) => {
      const read = (selector) => {
        const settings = getComputedStyle(
          element.querySelector(selector),
        ).fontVariationSettings;
        return Number(settings.match(/[-+]?\d*\.?\d+/)?.[0]);
      };
      return {
        number: read('.hero-navigation__index .hero-navigation__weight-layer'),
        label: read('.hero-navigation__label .hero-navigation__weight-layer'),
      };
    });
  const readGeometry = () =>
    navigation.locator('.hero-navigation__item').evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      }),
    );

  expect(await readWeights(home)).toEqual({ number: 700, label: 700 });
  expect(await readWeights(projects)).toEqual({ number: 400, label: 400 });
  const restingGeometry = await readGeometry();

  await projects.hover();
  await expect.poll(() => readWeights(projects)).toEqual({ number: 700, label: 400 });
  const hoveredGeometry = await readGeometry();
  hoveredGeometry.forEach((item, index) => {
    expect(Math.abs(item.left - restingGeometry[index].left)).toBeLessThan(0.1);
    expect(Math.abs(item.right - restingGeometry[index].right)).toBeLessThan(0.1);
    expect(Math.abs(item.width - restingGeometry[index].width)).toBeLessThan(0.1);
  });

  await page.mouse.move(0, 0);
  await expect.poll(() => readWeights(projects)).toEqual({ number: 400, label: 400 });
  const leaveGeometry = await readGeometry();
  leaveGeometry.forEach((item, index) => {
    expect(Math.abs(item.left - restingGeometry[index].left)).toBeLessThan(0.1);
  });

  await projects.focus();
  await expect.poll(() => readWeights(projects)).toEqual({ number: 700, label: 400 });
  expect(
    await projects.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none');

  await home.hover();
  expect(await readWeights(home)).toEqual({ number: 700, label: 700 });

  await projects.click();
  await expect(projects).toHaveAttribute('aria-current', 'page');
  await expect(home).not.toHaveAttribute('aria-current', 'page');
  await expect.poll(() => readWeights(projects)).toEqual({ number: 700, label: 700 });
});

test('reveals the scroll cue after the Hero settles without intrinsic overflow', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const hero = page.locator('.kinetic-hero');
    const cue = page.getByRole('link', { name: /Scroll to Explore/i });
    await expect(hero).not.toHaveAttribute('data-entrance', 'complete');
    await expect(cue).toBeHidden();
    await expect(hero).toHaveAttribute('data-entrance', 'complete');
    await expect(hero).toHaveAttribute('data-scroll-identity', 'ready');
    await expect(cue).toBeVisible();
    await expect(cue).toHaveAttribute('href', '#about');

    const stableLayout = await page.evaluate(() => {
      const cue = document.querySelector('.kinetic-hero__scroll-cue');
      const selectors = [
        '[data-testid="kinetic-wordmark"]',
        '.kinetic-hero__statements',
        '.kinetic-hero__introduction',
        '.kinetic-hero__actions',
        '.hero-navigation',
      ];
      const read = () =>
        selectors.map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          };
        });
      const visible = read();
      cue.hidden = true;
      const hidden = read();
      cue.hidden = false;
      return { hidden, visible };
    });
    stableLayout.visible.forEach((rect, index) => {
      expect(Math.abs(rect.left - stableLayout.hidden[index].left)).toBeLessThan(0.1);
      expect(Math.abs(rect.top - stableLayout.hidden[index].top)).toBeLessThan(0.1);
      expect(Math.abs(rect.width - stableLayout.hidden[index].width)).toBeLessThan(0.1);
      expect(Math.abs(rect.height - stableLayout.hidden[index].height)).toBeLessThan(0.1);
    });

    const placement = await page.evaluate(() => {
      const cueRect = document
        .querySelector('.kinetic-hero__scroll-cue')
        .getBoundingClientRect();
      const wordmarkRect = document
        .querySelector('[data-testid="kinetic-wordmark"]')
        .getBoundingClientRect();
      const actionsRect = document
        .querySelector('.kinetic-hero__actions')
        .getBoundingClientRect();
      return {
        cueBottom: cueRect.bottom,
        cueLeft: cueRect.left,
        cueRight: cueRect.right,
        cueTop: cueRect.top,
        wordmarkBottom: wordmarkRect.bottom,
        wordmarkLeft: wordmarkRect.left,
        wordmarkRight: wordmarkRect.right,
        actionsBottom: actionsRect.bottom,
        actionsLeft: actionsRect.left,
        actionsRight: actionsRect.right,
        heroBottom: document.querySelector('.kinetic-hero').getBoundingClientRect()
          .bottom,
        heroHeight: document.querySelector('.kinetic-hero').getBoundingClientRect()
          .height,
        viewportHeight: document.documentElement.clientHeight,
      };
    });

    if (viewport.width > 600) {
      expect(placement.cueLeft).toBeGreaterThan(placement.wordmarkRight);
      expect(placement.cueRight).toBeGreaterThan(placement.actionsLeft);
      expect(placement.cueBottom).toBeLessThanOrEqual(placement.heroBottom);
    } else {
      expect(placement.cueLeft).toBeGreaterThanOrEqual(16);
      expect(placement.cueTop).toBeGreaterThanOrEqual(placement.actionsBottom);
      expect(placement.cueBottom).toBeLessThanOrEqual(placement.heroBottom);
    }
    expect(Math.abs(placement.heroHeight - placement.viewportHeight)).toBeLessThanOrEqual(
      1,
    );
  }
});

test('fades and restores the scroll cue with reversible scroll progress', async ({
  isMobile,
  page,
}) => {
  await page.setViewportSize(
    isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  const cue = page.locator('.kinetic-hero__scroll-cue');
  await expect(cue).toBeVisible();

  await page.evaluate(() => {
    const hero = document.querySelector('.kinetic-hero');
    window.scrollTo(
      0,
      Number(hero.dataset.scrollStart) + Number(hero.dataset.scrollDistance) * 0.2,
    );
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(document.querySelector('.kinetic-hero')?.dataset.scrollProgress),
      ),
    )
    .toBeCloseTo(0.2, 1);
  await expect
    .poll(() => cue.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeLessThan(0.1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() => cue.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeGreaterThan(0.95);
});

test('opens an accessible mobile editorial menu without replaying the entrance', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const hero = page.locator('.kinetic-hero');
  await expect(hero).toHaveAttribute('data-entrance', 'complete');
  const completedAt = await hero.getAttribute('data-entrance-completed-at');
  const trigger = page.getByRole('button', { name: 'Menu' });

  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Portfolio' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-menu-state', /opening|open/);
  await expect(dialog).toHaveAttribute('data-menu-state', 'open');
  await expect(
    dialog.getByRole('button', { name: 'Close navigation menu' }),
  ).toBeFocused();
  await expect(dialog.getByRole('link', { name: /Home/ })).toHaveAttribute(
    'href',
    '#home',
  );
  await expect(dialog.locator('a')).toHaveCount(5);
  await expect(dialog.getByRole('link', { name: /About/ })).toHaveAttribute(
    'href',
    '#about',
  );
  await expect(dialog.getByRole('link', { name: /Education/ })).toHaveAttribute(
    'href',
    '#education',
  );
  await expect(dialog.getByRole('link', { name: /Skills/ })).toHaveAttribute(
    'href',
    '#skills',
  );
  await expect(dialog.getByRole('link', { name: /Projects/ })).toHaveAttribute(
    'href',
    '#projects',
  );
  for (const label of ['Contact']) {
    await expect(
      dialog.locator('.hero-navigation__item').filter({ hasText: label }),
    ).toHaveAttribute('aria-disabled', 'true');
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('data-menu-state', 'closing');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(hero).toHaveAttribute('data-entrance-completed-at', completedAt);

  await page.evaluate(() => {
    const section = document.createElement('section');
    section.id = 'about';
    section.style.height = '150vh';
    document.querySelector('main').append(section);
  });
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('interrupts rapid mobile menu toggles cleanly at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const trigger = page.getByRole('button', { name: 'Menu' });
  const dialog = page.getByRole('dialog', { name: 'Portfolio' });
  const close = dialog.getByRole('button', { name: 'Close navigation menu' });

  await trigger.click();
  await page.waitForTimeout(80);
  await close.click();
  await expect(dialog).toHaveAttribute('data-menu-state', 'closing');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toHaveAttribute('data-menu-state', 'open');
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('style', /overflow:\s*hidden/);
});

test('uses an immediate complete mobile menu state for reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Menu' });
  const dialog = page.getByRole('dialog', { name: 'Portfolio' });
  await trigger.click();
  await expect(dialog).toHaveAttribute('data-menu-state', 'open');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('keeps the supporting composition readable and aligned at priority viewports', async ({
  page,
}) => {
  const priorityViewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ];

  for (const viewport of priorityViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
    );

    const metrics = await page.evaluate(() => {
      const support = document.querySelector('.kinetic-hero__support');
      const statement = document.querySelector('.kinetic-hero__statement-line');
      const introduction = document.querySelector('.kinetic-hero__introduction');
      const supportRect = support.getBoundingClientRect();
      const introRect = introduction.getBoundingClientRect();
      return {
        statementFontSize: Number.parseFloat(getComputedStyle(statement).fontSize),
        introductionFontSize: Number.parseFloat(getComputedStyle(introduction).fontSize),
        supportLeft: supportRect.left,
        supportRight: supportRect.right,
        introLeft: introRect.left,
        introRight: introRect.right,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(metrics.statementFontSize).toBeGreaterThanOrEqual(
      viewport.width <= 600 ? 26 : 36,
    );
    expect(metrics.introductionFontSize).toBeGreaterThanOrEqual(
      viewport.width <= 600 ? 15 : 16,
    );
    expect(Math.abs(metrics.supportLeft - metrics.introLeft)).toBeLessThanOrEqual(1);
    expect(metrics.introRight).toBeLessThanOrEqual(metrics.supportRight + 1);
    expect(metrics.horizontalOverflow).toBe(false);
  }
});

test('the configured CV viewer traps the document in-page and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const hero = page.locator('.kinetic-hero');
  await expect(hero).toHaveAttribute('data-entrance', 'complete');
  const completedAt = await hero.getAttribute('data-entrance-completed-at');

  await page.evaluate(async () => {
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js'))
      .default;
    const { default: CvViewer } = await import('/src/components/CvViewer.jsx');
    const spacer = document.createElement('div');
    const mount = document.createElement('div');
    mount.id = 'configured-cv-test';
    spacer.style.height = '20rem';
    document.body.append(spacer, mount);
    window.scrollTo(0, 120);
    createRoot(mount).render(
      React.createElement(CvViewer, {
        label: 'View CV',
        document: {
          url: 'data:application/pdf,%25PDF-1.4%0A%25EOF',
          title: 'Abdul Saboor | Curriculum Vitae',
          filename: 'abdul-saboor-cv.pdf',
        },
      }),
    );
  });

  const trigger = page
    .locator('#configured-cv-test')
    .getByRole('button', { name: 'View CV' });
  await expect(trigger).toBeVisible();
  await trigger.evaluate((element) => element.click());

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(
    'Abdul Saboor | Curriculum Vitae',
  );
  await expect(dialog.locator('iframe')).toHaveAttribute('src', /^data:application\/pdf/);
  await expect(dialog.getByRole('link', { name: /Download PDF/ })).toHaveAttribute(
    'download',
    'abdul-saboor-cv.pdf',
  );

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(120);
  await expect(hero).toHaveAttribute('data-entrance-completed-at', completedAt);
});

test('keeps the monumental wordmark readable and contained at required viewports', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const heading = document.querySelector('[data-testid="kinetic-wordmark"]');
      const lines = [...document.querySelectorAll('[data-word]')];
      return {
        hasHorizontalOverflow: root.scrollWidth > root.clientWidth,
        headingWidth: heading.getBoundingClientRect().width,
        lineRects: lines.map((line) => {
          const rect = line.getBoundingClientRect();
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
          };
        }),
      };
    });

    expect(metrics.hasHorizontalOverflow).toBe(false);
    expect(metrics.headingWidth).toBeGreaterThan(0);
    for (const rect of metrics.lineRects) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(rect.width).toBeGreaterThan(viewport.width * 0.35);
    }

    const interLineGap = metrics.lineRects[1].top - metrics.lineRects[0].bottom;
    expect(interLineGap).toBeGreaterThan(6);
  }
});

test('loads the self-hosted display face without motion or layout animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const result = await page
    .locator('[data-glyph-id]')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        animationName: style.animationName,
        transitionDuration: style.transitionDuration,
      };
    });

  expect(result.fontFamily).toContain('League Gothic');
  expect(result.fontWeight).toBe('400');
  expect(result.animationName).toBe('none');
  expect(result.transitionDuration).toBe('0s');
});

test('moves the eleven original glyphs from the circular entrance into the exact Hero', async ({
  page,
}) => {
  await page.goto('/');
  const hero = page.locator('.kinetic-hero');
  const glyphs = page.locator('[data-glyph-id]');

  await expect(hero).toHaveAttribute('data-entrance', 'running');
  await expect(hero).toHaveAttribute('data-font-ready', 'true');
  await expect(glyphs).toHaveCount(11);

  const movingState = await glyphs.evaluateAll((elements) => ({
    ids: elements.map((element) => element.dataset.glyphId),
    transforms: elements.map((element) => getComputedStyle(element).transform),
  }));

  expect(new Set(movingState.ids).size).toBe(11);
  expect(movingState.transforms.every((transform) => transform !== 'none')).toBe(true);

  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  await expect(hero).toHaveAttribute('data-motion-ready', 'true');
  const restingState = await glyphs.evaluateAll((elements) =>
    elements.map((element) => ({
      shadow: getComputedStyle(element).textShadow,
      transform: getComputedStyle(element).transform,
    })),
  );

  expect(restingState.every(({ transform }) => transform === 'none')).toBe(true);
  expect(restingState.every(({ shadow }) => shadow === 'none')).toBe(true);

  const completedAt = await hero.getAttribute('data-entrance-completed-at');
  await page.waitForTimeout(350);
  await expect(hero).toHaveAttribute('data-entrance', 'complete');
  await expect(hero).toHaveAttribute('data-entrance-completed-at', completedAt);
});

test('holds a compact circular loader at the true viewport center while the font loads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await delayDisplayFontReadiness(page, 1600);
  await page.goto('/', { waitUntil: 'commit' });
  const hero = page.locator('.kinetic-hero');
  await expect(hero).toHaveAttribute('data-entrance', 'running');
  await expect(hero).toHaveAttribute('data-entrance-stage', 'orbit');
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('400 1em "League Gothic"')))
    .toBe(true);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const glyphs = page.locator('[data-glyph-id]');
  await expect
    .poll(
      () =>
        glyphs.evaluateAll((elements) => {
          const bounds = elements.map((element) => element.getBoundingClientRect());
          const centerX =
            (Math.min(...bounds.map((rect) => rect.left)) +
              Math.max(...bounds.map((rect) => rect.right))) /
            2;
          return Math.abs(centerX - window.innerWidth / 2);
        }),
      { timeout: 1500 },
    )
    .toBeLessThan(3);

  const orbit = await glyphs.evaluateAll((elements) => {
    const centers = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        rotation: Math.atan2(matrix.m12, matrix.m11) * (180 / Math.PI),
      };
    });
    const center = {
      x: centers.reduce((total, point) => total + point.x, 0) / centers.length,
      y: centers.reduce((total, point) => total + point.y, 0) / centers.length,
    };
    const radii = centers.map((point) =>
      Math.hypot(point.x - center.x, point.y - center.y),
    );
    const tangentErrors = centers.map((point) => {
      const tangent =
        Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI) + 90;
      return Math.abs(((point.rotation - tangent + 540) % 360) - 180);
    });
    return {
      center,
      maximumRadius: Math.max(...radii),
      minimumRadius: Math.min(...radii),
      maximumTangentError: Math.max(...tangentErrors),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  expect(Math.abs(orbit.center.x - orbit.viewport.width / 2)).toBeLessThan(3);
  expect(Math.abs(orbit.center.y - orbit.viewport.height / 2)).toBeLessThan(3);
  expect(orbit.maximumRadius).toBeLessThan(58);
  expect(orbit.minimumRadius).toBeGreaterThan(35);
  expect(orbit.maximumTangentError).toBeLessThan(3);
});

test('re-centers the rotating loader when the visible mobile viewport changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await delayDisplayFontReadiness(page, 1400);
  await page.goto('/', { waitUntil: 'commit' });
  const hero = page.locator('.kinetic-hero');
  await expect(hero).toHaveAttribute('data-entrance', 'running');
  await expect(hero).toHaveAttribute('data-entrance-stage', 'orbit');
  await page.evaluate(() => {
    window.__loaderGlyphNodes = [...document.querySelectorAll('[data-glyph-id]')];
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

  const result = await page.evaluate(() => {
    const loaderHero = document.querySelector('.kinetic-hero');
    const glyphs = [...document.querySelectorAll('[data-glyph-id]')];
    const centers = glyphs.map((glyph) => {
      const rect = glyph.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const center = centers.reduce(
      (total, point) => ({
        x: total.x + point.x / centers.length,
        y: total.y + point.y / centers.length,
      }),
      { x: 0, y: 0 },
    );
    const viewport = window.visualViewport;
    const viewportCenter = {
      x: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) / 2,
      y: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) / 2,
    };

    return {
      center,
      viewportCenter,
      heroHeight: loaderHero.getBoundingClientRect().height,
      viewportHeight: viewport?.height ?? window.innerHeight,
      stage: loaderHero.dataset.entranceStage,
      progress: Number(loaderHero.dataset.entranceProgress),
      sameNodes: glyphs.every(
        (glyph, index) => glyph === window.__loaderGlyphNodes[index],
      ),
    };
  });

  expect(result.stage).toBe('orbit');
  expect(result.progress).toBe(0);
  expect(result.sameNodes).toBe(true);
  expect(Math.abs(result.heroHeight - result.viewportHeight)).toBeLessThan(1);
  expect(Math.abs(result.center.x - result.viewportCenter.x)).toBeLessThan(1);
  expect(Math.abs(result.center.y - result.viewportCenter.y)).toBeLessThan(1);
});

test('keeps every glyph distinguishable through the release on desktop and mobile', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const targets = [0.25, 0.5, 0.75];
    window.__kineticCollisionSamples = {};

    const readCollisions = () => {
      const elements = [...document.querySelectorAll('[data-glyph-id]')];
      const rects = elements.map((element) => element.getBoundingClientRect());
      const pairs = [];
      for (let first = 0; first < rects.length; first += 1) {
        for (let second = first + 1; second < rects.length; second += 1) {
          const width = Math.max(
            0,
            Math.min(rects[first].right, rects[second].right) -
              Math.max(rects[first].left, rects[second].left),
          );
          const height = Math.max(
            0,
            Math.min(rects[first].bottom, rects[second].bottom) -
              Math.max(rects[first].top, rects[second].top),
          );
          const overlap = width * height;
          const smallerArea = Math.min(
            rects[first].width * rects[first].height,
            rects[second].width * rects[second].height,
          );
          if (smallerArea > 0 && overlap / smallerArea > 0.2) {
            pairs.push([elements[first].id, elements[second].id]);
          }
        }
      }
      return pairs;
    };

    const sample = () => {
      const hero = document.querySelector('.kinetic-hero');
      const progress = Number(hero?.dataset.entranceProgress);
      if (hero?.dataset.entranceStage?.startsWith('release')) {
        for (const target of targets) {
          const key = String(target);
          const previous = window.__kineticCollisionSamples[key];
          if (!previous || Math.abs(progress - target) < previous.distance) {
            window.__kineticCollisionSamples[key] = {
              distance: Math.abs(progress - target),
              progress,
              collisions: readCollisions(),
            };
          }
        }
      }

      if (hero?.dataset.entrance !== 'complete') requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
    );
    const samples = await page.evaluate(() => window.__kineticCollisionSamples);

    for (const checkpoint of [0.25, 0.5, 0.75]) {
      const sample = samples[String(checkpoint)];
      expect(sample.distance, `${viewport.width}px sampling distance`).toBeLessThan(0.08);
      expect(
        sample.collisions,
        `${viewport.width}px at ${Math.round(sample.progress * 100)}%`,
      ).toEqual([]);
    }
  }
});

test('scales and travels together without forming a miniature intermediate wordmark', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.__kineticMotionSamples = { orbit: null, release: [] };
    const sample = () => {
      const hero = document.querySelector('.kinetic-hero');
      const progress = Number(hero?.dataset.entranceProgress);
      const elements = [...document.querySelectorAll('[data-glyph-id]')];

      if (elements.length === 11) {
        const transforms = elements.map((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          const rect = element.getBoundingClientRect();
          return {
            distanceFromDestination: Math.hypot(matrix.m41, matrix.m42),
            scale: Math.hypot(matrix.m11, matrix.m12),
            left: rect.left,
            right: rect.right,
          };
        });
        if (hero?.dataset.entranceStage === 'orbit' && progress === 0) {
          window.__kineticMotionSamples.orbit = transforms;
        } else if (progress >= 0.2 && progress <= 0.82) {
          window.__kineticMotionSamples.release.push({ progress, transforms });
        }
      }

      if (hero?.dataset.entrance !== 'complete') requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const checkpoints = await page.evaluate(() => {
    const { orbit, release } = window.__kineticMotionSamples;
    const closest = (target) =>
      release.reduce((current, sample) =>
        Math.abs(sample.progress - target) < Math.abs(current.progress - target)
          ? sample
          : current,
      );
    const summarize = (target) => {
      const sample = closest(target);
      const normalized = sample.transforms.map((item, index) => ({
        scale: (item.scale - orbit[index].scale) / (1 - orbit[index].scale),
        travel: 1 - item.distanceFromDestination / orbit[index].distanceFromDestination,
      }));
      return {
        progress: sample.progress,
        averageScale:
          normalized.reduce((total, item) => total + item.scale, 0) / normalized.length,
        averageTravel:
          normalized.reduce((total, item) => total + item.travel, 0) / normalized.length,
        spanWidth:
          Math.max(...sample.transforms.map(({ right }) => right)) -
          Math.min(...sample.transforms.map(({ left }) => left)),
        viewportWidth: window.innerWidth,
      };
    };

    return [summarize(0.25), summarize(0.5), summarize(0.75)];
  });

  const [quarter, midpoint, threeQuarter] = checkpoints;
  expect(quarter.averageScale).toBeLessThan(midpoint.averageScale);
  expect(midpoint.averageScale).toBeLessThan(threeQuarter.averageScale);
  expect(quarter.averageTravel).toBeLessThan(midpoint.averageTravel);
  expect(midpoint.averageTravel).toBeLessThan(threeQuarter.averageTravel);
  expect(midpoint.averageScale).toBeGreaterThan(0.35);
  expect(midpoint.averageScale).toBeLessThan(0.65);
  expect(midpoint.averageTravel).toBeGreaterThan(0.25);
  expect(midpoint.averageTravel).toBeLessThan(0.7);
  for (const checkpoint of checkpoints) {
    expect(checkpoint.averageTravel - checkpoint.averageScale).toBeLessThan(0.18);
  }
  expect(midpoint.spanWidth).toBeGreaterThan(midpoint.viewportWidth * 0.24);
  expect(midpoint.spanWidth).toBeLessThan(midpoint.viewportWidth * 0.52);
});

test('derives subtle trails during motion and clears them at rest', async ({ page }) => {
  await page.goto('/');

  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-glyph-id]')].some(
      (glyph) => getComputedStyle(glyph).textShadow !== 'none',
    ),
  );

  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const shadows = await page
    .locator('[data-glyph-id]')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).textShadow),
    );
  expect(shadows.every((shadow) => shadow === 'none')).toBe(true);
});

test('settles cleanly after a mid-animation responsive resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.kinetic-hero')).toHaveAttribute('data-entrance', 'running');

  await page.waitForTimeout(260);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
  );

  const result = await page.evaluate(() => ({
    characters: [...document.querySelectorAll('[data-glyph-id]')]
      .map((glyph) => glyph.dataset.character)
      .join(''),
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    transforms: [...document.querySelectorAll('[data-glyph-id]')].map(
      (glyph) => getComputedStyle(glyph).transform,
    ),
  }));

  expect(result.characters).toBe('ABDULSABOOR');
  expect(result.hasHorizontalOverflow).toBe(false);
  expect(result.transforms.every((transform) => transform === 'none')).toBe(true);
});

test('does not create duplicate glyphs across repeated page loads', async ({ page }) => {
  for (let load = 0; load < 2; load += 1) {
    await page.goto('/');
    await page.waitForFunction(
      () => document.querySelector('.kinetic-hero')?.dataset.entrance === 'complete',
    );

    const ids = await page
      .locator('[data-glyph-id]')
      .evaluateAll((elements) => elements.map((element) => element.dataset.glyphId));
    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
  }
});

test('falls back to the complete static Hero when the display font cannot load', async ({
  page,
}) => {
  await page.addInitScript(() => {
    FontFaceSet.prototype.load = () => Promise.reject(new Error('Font unavailable'));
  });
  await page.goto('/');
  const hero = page.locator('.kinetic-hero');
  await expect(hero).toHaveAttribute('data-entrance', 'complete');
  await expect(hero).toHaveAttribute('data-font-status', 'fallback');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ABDUL SABOOR' }),
  ).toBeVisible();

  const transforms = await page
    .locator('[data-glyph-id]')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).transform),
    );
  expect(transforms.every((transform) => transform === 'none')).toBe(true);
});
