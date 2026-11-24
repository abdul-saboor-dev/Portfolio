export function getPyramidRowWidths(count) {
  if (!Number.isFinite(count) || count < 1) return [];

  const total = Math.floor(count);
  const rowCount = Math.min(total, 8, Math.max(1, Math.round(Math.sqrt(total * 1.35))));
  if (rowCount === 1) return [total];

  const weights = Array.from(
    { length: rowCount },
    (_, index) => 1 - (index / (rowCount - 1)) * 0.55,
  );
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (weight / weightTotal) * total);
  const widths = raw.map((value) => Math.max(1, Math.floor(value)));
  let remainder = total - widths.reduce((sum, width) => sum + width, 0);
  const remainderOrder = raw
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);

  for (let cursor = 0; remainder > 0; cursor += 1) {
    widths[remainderOrder[cursor % remainderOrder.length].index] += 1;
    remainder -= 1;
  }

  return widths;
}

const irregularRowPattern = Object.freeze([
  Object.freeze({ x: 0.42, y: 0 }),
  Object.freeze({ x: -0.72, y: 0.18 }),
  Object.freeze({ x: 0.58, y: -0.12 }),
  Object.freeze({ x: -0.36, y: 0.22 }),
  Object.freeze({ x: 0.75, y: -0.08 }),
  Object.freeze({ x: -0.5, y: 0.14 }),
  Object.freeze({ x: 0.32, y: -0.1 }),
  Object.freeze({ x: -0.44, y: 0.16 }),
]);

export function getIrregularRowPlacement(rowIndex, rowWidth, widestRow) {
  const pattern = irregularRowPattern[rowIndex % irregularRowPattern.length];
  const widthRatio = Math.min(1, Math.max(0, rowWidth / Math.max(widestRow, 1)));
  const taper = 0.78 + widthRatio * 0.22;
  return {
    x: Number((pattern.x * taper).toFixed(4)),
    y: Number((pattern.y * taper).toFixed(4)),
  };
}

export function buildPyramidRows(skills) {
  const ordered = [...(Array.isArray(skills) ? skills : [])]
    .filter((item) => item?.visible !== false)
    .sort(
      (left, right) =>
        (left.order ?? 0) - (right.order ?? 0) ||
        String(left._id).localeCompare(String(right._id)),
    );
  const widths = getPyramidRowWidths(ordered.length);
  let cursor = 0;

  return widths.map((width, rowIndex) => {
    const row = ordered.slice(cursor, cursor + width).map((item, columnIndex) => ({
      ...item,
      columnIndex,
      itemIndex: cursor + columnIndex,
      rowIndex,
    }));
    cursor += width;
    return row;
  });
}
