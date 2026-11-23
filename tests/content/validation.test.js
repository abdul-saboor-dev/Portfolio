import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVED_ABOUT_NARRATIVE,
  APPROVED_EDUCATION_RECORDS,
  APPROVED_HERO_STATEMENTS,
  APPROVED_IDENTITY_TAGLINES,
  APPROVED_SKILLS,
} from '@portfolio/content-model';
import { FALLBACK_CONTENT, validatePortfolioContent } from '../../src/cms/validation.js';

test('invalid profile content falls back without discarding valid independent sections', () => {
  const result = validatePortfolioContent({
    profile: {
      fullName: 'Abdul Saboor',
      taglines: [{ text: 'ONLY ONE' }],
    },
    education: [
      {
        _id: 'education-1',
        institution: 'Verified institution',
        qualification: 'Verified qualification',
        startYear: 2020,
        endYear: 2024,
        educationStage: null,
        status: 'Completed',
        academicYearLabel: null,
        description: 'A verified education description.',
        order: 0,
      },
    ],
  });

  assert.equal(result.content.profile, FALLBACK_CONTENT.profile);
  assert.equal(result.content.education.length, 1);
  assert.equal(result.issues[0].path, 'profile');
});

test('missing CMS content returns only approved fallback identity content', () => {
  const result = validatePortfolioContent(null);

  assert.equal(result.content.profile.fullName, 'ABDUL SABOOR');
  assert.equal(result.content.profile.cv, null);
  assert.equal(
    result.content.profile.heroIntroduction,
    'Building digital experiences through code, creativity, and thoughtful design.',
  );
  assert.deepEqual(
    result.content.profile.taglines.map(({ text }) => text),
    APPROVED_IDENTITY_TAGLINES,
  );
  assert.deepEqual(result.content.projects, []);
  assert.equal(result.content.about.narrative, APPROVED_ABOUT_NARRATIVE);
  assert.deepEqual(result.content.education, APPROVED_EDUCATION_RECORDS);
  assert.deepEqual(result.content.skills, APPROVED_SKILLS);
});

test('Skills records are visible-only and sorted by editor order', () => {
  const createSkill = (id, order, visible = true) => ({
    _id: id,
    aliases: [],
    alternateLogoUrl: null,
    category: 'Frontend',
    logoAlt: `${id} logo`,
    logoUrl: `/skills/svg/${id}.svg`,
    name: id,
    order,
    slug: id,
    status: 'Working With',
    visible,
  });
  const result = validatePortfolioContent({
    skills: [
      createSkill('third', 3),
      createSkill('hidden', 0, false),
      createSkill('first', 1),
    ],
  });
  assert.deepEqual(
    result.content.skills.map(({ _id }) => _id),
    ['first', 'third'],
  );
  assert.equal(result.issues.length, 0);
});

test('published CV metadata is validated without requiring a privileged token', () => {
  const result = validatePortfolioContent({
    profile: {
      fullName: 'Abdul Saboor',
      heroIntroduction: null,
      taglines: APPROVED_IDENTITY_TAGLINES.map((text) => ({ text })),
      cv: {
        url: 'https://cdn.sanity.io/files/project/dataset/abdul-saboor-cv.pdf',
        title: 'Abdul Saboor | Curriculum Vitae',
        filename: 'abdul-saboor-cv.pdf',
      },
    },
  });

  assert.equal(result.issues.length, 0);
  assert.equal(result.content.profile.cv.filename, 'abdul-saboor-cv.pdf');
  assert.deepEqual(result.content.profile.heroStatements, APPROVED_HERO_STATEMENTS);
});

test('Education records validate, sort by editor order, and reject invalid years', () => {
  const record = (id, order, startYear) => ({
    _id: id,
    institution: `Institution ${id}`,
    qualification: `Qualification ${id}`,
    startYear,
    endYear: startYear + 1,
    educationStage: null,
    status: 'Completed',
    academicYearLabel: null,
    description: `Description for ${id}.`,
    order,
  });
  const ordered = validatePortfolioContent({
    education: [
      record('third', 2, 2018),
      record('first', 0, 2024),
      record('second', 1, 2022),
    ],
  });

  assert.deepEqual(
    ordered.content.education.map(({ _id }) => _id),
    ['first', 'second', 'third'],
  );

  const invalid = validatePortfolioContent({
    education: [{ ...record('invalid', 0, 2025), endYear: 2024 }],
  });
  assert.equal(invalid.issues.at(-1).path, 'education');
  assert.deepEqual(invalid.content.education, APPROVED_EDUCATION_RECORDS);
});

test('unsafe action destinations and overlong About copy fall back independently', () => {
  const result = validatePortfolioContent({
    profile: {
      fullName: 'Abdul Saboor',
      heroIntroduction: 'A valid introduction.',
      taglines: APPROVED_IDENTITY_TAGLINES.map((text) => ({ text })),
      projectsAction: {
        label: 'Explore Projects',
        destinationType: 'external',
        destinationValue: 'javascript:alert(1)',
      },
    },
    about: { narrative: 'x'.repeat(651) },
  });

  assert.deepEqual(result.content.profile, FALLBACK_CONTENT.profile);
  assert.deepEqual(result.content.about, FALLBACK_CONTENT.about);
  assert.deepEqual(
    result.issues.map(({ path }) => path),
    ['profile', 'about'],
  );
});
