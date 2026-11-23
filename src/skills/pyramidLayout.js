const triangular = (value) => (value * (value - 1)) / 2;

export function getPyramidRowWidths(count) {
  if (!Number.isFinite(count) || count < 1) return [];

  const total = Math.floor(count);
  let rowCount = Math.min(8, Math.max(1, Math.round(Math.sqrt(total))));
  while (rowCount > 1 && triangular(rowCount) >= total) rowCount -= 1;

  const base = Math.max(1, Math.floor((total - triangular(rowCount)) / rowCount));
  const widths = Array.from({ length: rowCount }, (_, index) =>
    Math.max(1, base + rowCount - index - 1),
  );
  let remainder = total - widths.reduce((sum, width) => sum + width, 0);

  for (let index = 0; remainder > 0; index = (index + 1) % widths.length) {
    widths[index] += 1;
    remainder -= 1;
  }

  return widths;
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
