import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KINETIC_IDENTITY_COMPACT,
  KINETIC_IDENTITY_GLYPH_COUNT,
  KINETIC_IDENTITY_GLYPHS,
} from '../../src/identity/kineticIdentity.js';

test('the kinetic identity exposes eleven ordered, stable glyph instances', () => {
  assert.equal(KINETIC_IDENTITY_GLYPH_COUNT, 11);
  assert.equal(
    KINETIC_IDENTITY_GLYPHS.map(({ character }) => character).join(''),
    KINETIC_IDENTITY_COMPACT,
  );
  assert.equal(new Set(KINETIC_IDENTITY_GLYPHS.map(({ id }) => id)).size, 11);
  assert.deepEqual(
    KINETIC_IDENTITY_GLYPHS.map(({ index }) => index),
    Array.from({ length: 11 }, (_, index) => index),
  );
});

test('the original A and S are the only monogram source glyphs', () => {
  const monogramGlyphs = KINETIC_IDENTITY_GLYPHS.filter(
    ({ monogramRole }) => monogramRole !== null,
  );

  assert.deepEqual(
    monogramGlyphs.map(({ id, monogramRole }) => ({ id, monogramRole })),
    [
      { id: 'glyph-a-01', monogramRole: 'a' },
      { id: 'glyph-s-01', monogramRole: 's' },
    ],
  );
});
