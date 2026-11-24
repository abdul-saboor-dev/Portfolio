import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPyramidRows,
  getConstellationItemPlacement,
  getIrregularRowPlacement,
  getPyramidRowWidths,
} from '../../src/skills/pyramidLayout.js';

const widths = (count) => getPyramidRowWidths(count);

test('builds balanced, progressively narrower rows for varied skill counts', () => {
  assert.deepEqual(widths(1), [1]);
  assert.deepEqual(widths(5), [2, 2, 1]);
  assert.deepEqual(widths(17), [5, 4, 3, 3, 2]);
  assert.deepEqual(widths(18), [5, 4, 4, 3, 2]);
  assert.deepEqual(widths(24), [6, 5, 4, 4, 3, 2]);

  for (const count of [1, 5, 17, 18, 24, 50, 100]) {
    const result = widths(count);
    assert.equal(
      result.reduce((sum, value) => sum + value, 0),
      count,
    );
    assert.ok(result.every((value, index) => index === 0 || value <= result[index - 1]));
  }
});

test('derives stable, bounded irregular row placements without randomness', () => {
  const first = [5, 4, 3, 3, 2].map((width, rowIndex) =>
    getIrregularRowPlacement(rowIndex, width, 5),
  );
  const second = [5, 4, 3, 3, 2].map((width, rowIndex) =>
    getIrregularRowPlacement(rowIndex, width, 5),
  );

  assert.deepEqual(first, second);
  assert.ok(first.some(({ x }) => x < 0));
  assert.ok(first.some(({ x }) => x > 0));
  assert.ok(first.every(({ x }) => Math.abs(x) <= 0.75));
  assert.ok(first.every(({ y }) => Math.abs(y) <= 0.22));
});

test('derives stable per-icon constellation offsets with varied baselines', () => {
  const rows = [5, 4, 3, 3, 2];
  let itemIndex = 0;
  const first = rows.map((rowWidth, rowIndex) =>
    Array.from({ length: rowWidth }, (_, columnIndex) =>
      getConstellationItemPlacement({
        columnIndex,
        itemIndex: itemIndex++,
        rowIndex,
        rowWidth,
      }),
    ),
  );
  itemIndex = 0;
  const second = rows.map((rowWidth, rowIndex) =>
    Array.from({ length: rowWidth }, (_, columnIndex) =>
      getConstellationItemPlacement({
        columnIndex,
        itemIndex: itemIndex++,
        rowIndex,
        rowWidth,
      }),
    ),
  );

  assert.deepEqual(first, second);
  assert.ok(first.flat().every(({ x }) => Math.abs(x) <= 0.07));
  assert.ok(first.flat().every(({ y }) => Math.abs(y) <= 0.24));
  assert.ok(
    first.every((row) => row.length < 2 || new Set(row.map(({ y }) => y)).size > 1),
  );
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
  assert.ok(rows.flat().every(({ constellation }) => constellation));
});
