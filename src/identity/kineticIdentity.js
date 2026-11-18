export const KINETIC_IDENTITY_NAME = 'ABDUL SABOOR';
export const KINETIC_IDENTITY_COMPACT = 'ABDULSABOOR';

const glyph = (id, character, index, wordIndex, wordGlyphIndex, monogramRole = null) =>
  Object.freeze({ id, character, index, wordIndex, wordGlyphIndex, monogramRole });

export const KINETIC_IDENTITY_WORDS = Object.freeze([
  Object.freeze({
    id: 'abdul',
    label: 'ABDUL',
    glyphs: Object.freeze([
      glyph('glyph-a-01', 'A', 0, 0, 0, 'a'),
      glyph('glyph-b-01', 'B', 1, 0, 1),
      glyph('glyph-d-01', 'D', 2, 0, 2),
      glyph('glyph-u-01', 'U', 3, 0, 3),
      glyph('glyph-l-01', 'L', 4, 0, 4),
    ]),
  }),
  Object.freeze({
    id: 'saboor',
    label: 'SABOOR',
    glyphs: Object.freeze([
      glyph('glyph-s-01', 'S', 5, 1, 0, 's'),
      glyph('glyph-a-02', 'A', 6, 1, 1),
      glyph('glyph-b-02', 'B', 7, 1, 2),
      glyph('glyph-o-01', 'O', 8, 1, 3),
      glyph('glyph-o-02', 'O', 9, 1, 4),
      glyph('glyph-r-01', 'R', 10, 1, 5),
    ]),
  }),
]);

export const KINETIC_IDENTITY_GLYPHS = Object.freeze(
  KINETIC_IDENTITY_WORDS.flatMap(({ glyphs }) => glyphs),
);

export const KINETIC_IDENTITY_GLYPH_COUNT = KINETIC_IDENTITY_GLYPHS.length;
