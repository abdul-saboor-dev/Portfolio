import assert from 'node:assert/strict';
import test from 'node:test';
import { schemaTypes } from '../../studio/schemaTypes/index.js';
import { singletonTypes } from '../../studio/structure.js';
import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  CV_ACTION_LABEL_MAX_LENGTH,
  EDUCATION_ACADEMIC_YEAR_MAX_LENGTH,
  EDUCATION_DESCRIPTION_MAX_LENGTH,
  EDUCATION_INSTITUTION_MAX_LENGTH,
  EDUCATION_QUALIFICATION_MAX_LENGTH,
  EDUCATION_STAGE_MAX_LENGTH,
  EDUCATION_STATUSES,
  HERO_INTRODUCTION_MAX_LENGTH,
  HERO_STATEMENT_COUNT,
  HERO_STATEMENT_MAX_LENGTH,
  PROJECTS_ACTION_LABEL_MAX_LENGTH,
  SKILL_STATUSES,
  SKILLS_DESCRIPTION_MAX_LENGTH,
  SKILLS_HEADING_MAX_LENGTH,
} from '@portfolio/content-model';

test('the Studio exposes every required content document type', () => {
  const documentTypes = schemaTypes
    .filter(({ type }) => type === 'document')
    .map(({ name }) => name)
    .sort();

  assert.deepEqual(documentTypes, [
    'about',
    'contact',
    'education',
    'profile',
    'project',
    'siteSettings',
    'skill',
    'skillCategory',
    'skillsPresentation',
  ]);
});

test('the Studio exposes bounded Skills presentation copy', () => {
  const presentation = schemaTypes.find(({ name }) => name === 'skillsPresentation');
  const heading = presentation.fields.find(({ name }) => name === 'heading');
  const description = presentation.fields.find(({ name }) => name === 'description');

  assert.match(heading.description, new RegExp(String(SKILLS_HEADING_MAX_LENGTH)));
  assert.match(
    description.description,
    new RegExp(String(SKILLS_DESCRIPTION_MAX_LENGTH)),
  );
});

test('the Studio Skills Library exposes searchable media, status, visibility, and order', () => {
  const skill = schemaTypes.find(({ name }) => name === 'skill');
  const field = (name) => skill.fields.find((entry) => entry.name === name);

  for (const name of [
    'name',
    'slug',
    'aliases',
    'category',
    'logo',
    'alternateLogo',
    'status',
    'visible',
    'order',
  ]) {
    assert.ok(field(name), `missing Skills field: ${name}`);
  }
  assert.equal(field('logo').type, 'image');
  assert.equal(field('alternateLogo').type, 'image');
  assert.deepEqual(
    field('status').options.list.map(({ value }) => value),
    SKILL_STATUSES,
  );
  assert.equal(field('visible').initialValue, false);
});

test('the Studio exposes ordered and bounded Education records', () => {
  const education = schemaTypes.find(({ name }) => name === 'education');
  const field = (name) => education.fields.find((entry) => entry.name === name);

  assert.match(
    field('institution').description,
    new RegExp(String(EDUCATION_INSTITUTION_MAX_LENGTH)),
  );
  assert.match(
    field('qualification').description,
    new RegExp(String(EDUCATION_QUALIFICATION_MAX_LENGTH)),
  );
  assert.match(
    field('educationStage').description,
    new RegExp(String(EDUCATION_STAGE_MAX_LENGTH)),
  );
  assert.match(
    field('academicYearLabel').description,
    new RegExp(String(EDUCATION_ACADEMIC_YEAR_MAX_LENGTH)),
  );
  assert.match(
    field('description').description,
    new RegExp(String(EDUCATION_DESCRIPTION_MAX_LENGTH)),
  );
  assert.deepEqual(
    field('status').options.list.map(({ value }) => value),
    EDUCATION_STATUSES,
  );
  assert.ok(field('order'));
  assert.ok(education.orderings.some(({ name }) => name === 'portfolioOrder'));
});

test('global portfolio documents use fixed singleton IDs', () => {
  assert.deepEqual([...singletonTypes].sort(), [
    'about',
    'contact',
    'profile',
    'siteSettings',
    'skillsPresentation',
  ]);
});

test('the profile exposes a replaceable PDF CV field', () => {
  const profile = schemaTypes.find(({ name }) => name === 'profile');
  const cvFile = profile.fields.find(({ name }) => name === 'cvFile');

  assert.equal(cvFile.type, 'file');
  assert.equal(cvFile.options.accept, 'application/pdf');
});

test('the Studio exposes bounded Hero and About editorial fields', () => {
  const profile = schemaTypes.find(({ name }) => name === 'profile');
  const about = schemaTypes.find(({ name }) => name === 'about');
  const statements = profile.fields.find(({ name }) => name === 'heroStatements');
  const introduction = profile.fields.find(({ name }) => name === 'heroIntroduction');
  const projectsAction = profile.fields.find(({ name }) => name === 'projectsAction');
  const projectsLabel = projectsAction.fields.find(({ name }) => name === 'label');
  const cvLabel = profile.fields.find(({ name }) => name === 'cvActionLabel');
  const narrative = about.fields.find(({ name }) => name === 'narrative');

  assert.equal(statements.initialValue.length, HERO_STATEMENT_COUNT);
  assert.match(statements.description, new RegExp(String(HERO_STATEMENT_MAX_LENGTH)));
  assert.match(
    introduction.description,
    new RegExp(String(HERO_INTRODUCTION_MAX_LENGTH)),
  );
  assert.match(
    projectsLabel.description,
    new RegExp(String(PROJECTS_ACTION_LABEL_MAX_LENGTH)),
  );
  assert.match(cvLabel.description, new RegExp(String(CV_ACTION_LABEL_MAX_LENGTH)));
  assert.match(narrative.description, new RegExp(String(ABOUT_NARRATIVE_MAX_LENGTH)));
});
