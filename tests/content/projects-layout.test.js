import assert from 'node:assert/strict';
import test from 'node:test';
import { perspectiveCard } from '../../src/animation/projectsSequence.js';
import { validatePortfolioContent } from '../../src/cms/validation.js';
import { PROJECTS_FALLBACK } from '../../src/projects/content.js';

test('signed-distance perspective mirrors passed and upcoming cards', () => {
  const active = perspectiveCard(0, 900, 600);
  assert.ok(active.x === 0);
  assert.ok(active.z === 0);
  assert.equal(active.opacity, 1);
  for (const distance of [0.5, 1, 2, 3]) {
    const left = perspectiveCard(-distance, 900, 600);
    const right = perspectiveCard(distance, 900, 600);
    assert.equal(left.x, -right.x);
    assert.ok(Math.abs(left.rotationY + right.rotationY - active.rotationY * 2) < 1e-9);
    assert.ok(Math.abs(left.rotationZ + right.rotationZ - active.rotationZ * 2) < 1e-9);
    assert.equal(left.scale, right.scale);
    assert.equal(left.z, right.z);
    assert.equal(left.opacity, right.opacity);
  }
  assert.equal(perspectiveCard(4, 900, 600).visible, false);
});

test('projects stay ordered, hidden entries stay hidden, and invalid records do not erase valid work', () => {
  const later = { ...PROJECTS_FALLBACK[0], _id: 'later', order: 8 };
  const first = { ...PROJECTS_FALLBACK[1], _id: 'first', order: 1 };
  const hidden = { ...PROJECTS_FALLBACK[2], _id: 'hidden', visible: false, order: 0 };
  const invalid = {
    ...PROJECTS_FALLBACK[0],
    _id: 'invalid',
    liveUrl: 'javascript:alert(1)',
  };
  const { content, issues } = validatePortfolioContent({
    projects: [later, invalid, hidden, first],
  });
  assert.deepEqual(
    content.projects.map((project) => project._id),
    ['first', 'later'],
  );
  assert.equal(
    issues.some((issue) => issue.path === 'projects.1'),
    true,
  );
  assert.deepEqual(validatePortfolioContent({ projects: [] }).content.projects, []);
});

test('project ordering and signed-distance geometry support changing collection sizes', () => {
  for (const count of [0, 1, 3, 7, 20]) {
    const records = Array.from({ length: count }, (_, index) => ({
      ...PROJECTS_FALLBACK[0],
      _id: `project-${index}`,
      order: count - index,
    }));
    const { content, issues } = validatePortfolioContent({ projects: records });
    assert.equal(issues.length, 0);
    assert.equal(content.projects.length, count);
    assert.deepEqual(
      content.projects.map((project) => project.order),
      records.map((project) => project.order).reverse(),
    );
    const progress = Math.max(0, (count - 1) / 2);
    for (let index = 0; index < count; index += 1) {
      const geometry = perspectiveCard(index - progress, 900, 600);
      assert.ok(Number.isFinite(geometry.x));
      assert.ok(Number.isFinite(geometry.z));
      assert.ok(geometry.opacity >= 0 && geometry.opacity <= 1);
    }
  }
});
