import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPyramidRows, getPyramidRowWidths } from '../../src/skills/pyramidLayout.js';

const widths = (count) => getPyramidRowWidths(count);

test('builds balanced, progressively narrower rows for varied skill counts', () => {
  assert.deepEqual(widths(1), [1]);
  assert.deepEqual(widths(5), [3, 2]);
  assert.deepEqual(widths(17), [6, 5, 4, 2]);
  assert.deepEqual(widths(18), [6, 5, 4, 3]);
  assert.deepEqual(widths(24), [7, 6, 5, 4, 2]);

  for (const count of [1, 5, 17, 18, 24, 50, 100]) {
    const result = widths(count);
    assert.equal(
      result.reduce((sum, value) => sum + value, 0),
      count,
    );
    assert.ok(result.every((value, index) => index === 0 || value < result[index - 1]));
  }
});

test('preserves editor order and omits hidden records', () => {
  const rows = buildPyramidRows([
    { _id: 'third', name: 'Third', order: 3, visible: true },
    { _id: 'hidden', name: 'Hidden', order: 0, visible: false },
    { _id: 'first', name: 'First', order: 1, visible: true },
    { _id: 'second', name: 'Second', order: 2, visible: true },
  ]);
  assert.deepEqual(
    rows.flat().map(({ _id }) => _id),
    ['first', 'second', 'third'],
  );
  assert.deepEqual(
    rows.flat().map(({ itemIndex }) => itemIndex),
    [0, 1, 2],
  );
});
