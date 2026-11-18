import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVED_IDENTITY_TAGLINES,
  IDENTITY_TAGLINE_COUNT,
  validateIdentityTaglines,
} from '@portfolio/content-model';

test('the approved opening taglines satisfy the shared composition contract', () => {
  const result = validateIdentityTaglines(APPROVED_IDENTITY_TAGLINES);

  assert.equal(APPROVED_IDENTITY_TAGLINES.length, IDENTITY_TAGLINE_COUNT);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('tagline validation rejects count, duplicate, line-break, and length changes', () => {
  const result = validateIdentityTaglines([
    'WEB DEVELOPER',
    'WEB DEVELOPER',
    'A',
    'CREATIVE\nTHINKER',
    'UI ENTHUSIAST',
    'THIS TAGLINE IS DELIBERATELY FAR TOO LONG',
    'EXTRA TAGLINE',
  ]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /Exactly 6/);
  assert.match(result.errors.join(' '), /unique/);
  assert.match(result.errors.join(' '), /one line/);
  assert.match(result.errors.join(' '), /24 characters or fewer/);
});
