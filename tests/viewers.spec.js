import { expect, test } from '@playwright/test';

test('local demo CV opens, downloads, and restores focus and scroll', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  const response = await page.request.get('/demo-cv.pdf');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/pdf');
  const pdf = await response.body();
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const trigger = page.getByRole('button', { name: 'View CV' });
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    identity: document.querySelector('.kinetic-hero').dataset.scrollIdentity,
  }));
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'CV' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('border-radius', '16px');
  await expect(dialog.getByText('Curriculum vitae')).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'CV document preview' })).toHaveAttribute(
    'src',
    '/demo-cv-preview.png',
  );
  await dialog.getByRole('button', { name: 'Zoom in' }).click();
  await expect(dialog.locator('.cv-viewer__zoom output')).toHaveText('125%');
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toBe('abdul-saboor-cv.pdf');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY);
  await expect(page.locator('.kinetic-hero')).toHaveAttribute(
    'data-scroll-identity',
    before.identity,
  );
});

test('artwork viewer uses shared close control and restores page state', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => document.querySelector('.kinetic-hero')?.dataset.scrollIdentity === 'ready',
  );
  const metrics = await page.locator('.kinetic-hero').evaluate((root) => ({
    start: Number(root.dataset.scrollStart),
    identity: Number(root.dataset.scrollDistance),
    education: Number(root.dataset.educationScrollDistance),
    skills: Number(root.dataset.skillsScrollDistance),
    projects: Number(root.dataset.projectsScrollDistance),
    total: Number(root.querySelector('.projects').dataset.timelineUnits),
  }));
  const target =
    metrics.start +
    metrics.identity +
    metrics.education +
    metrics.skills +
    (metrics.projects * 5.25) / metrics.total;
  await page.evaluate((value) => window.scrollTo(0, value), target);
  await expect(page.locator('.projects')).toHaveAttribute(
    'data-projects-state',
    'design',
  );
  const before = await page.evaluate(() => window.scrollY);
  const trigger = page.getByRole('button', { name: 'View artwork' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Natural Forms' });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close artwork viewer' });
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});
