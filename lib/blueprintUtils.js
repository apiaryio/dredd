const NEWLINE_RE = /\n/g;

function characterIndexToPosition(charIndex = 0, code = '') {
  const codeFragment = code.substring(0, charIndex);
  const match = codeFragment.match(NEWLINE_RE) || [];
  const row = match.length + 1;
  return { row };
}

const sortNumbersAscending = (a, b) => a - b;

function warningLocationToRanges(warningLocation = [], text = '') {
  if (!warningLocation.length) {
    // No start-end ranges, nothing to return
    return [];
  }

  const rowsIndexes = [];

  let position = characterIndexToPosition(warningLocation[0][0], text);

  // Add this warning position row into ranges array
  rowsIndexes.push(position.row);

  if (warningLocation.length > 0) {
    // More lines
    for (let locKey = 0; locKey < warningLocation.length; locKey++) {
      const loc = warningLocation[locKey];
      if (locKey > 0) {
        position = characterIndexToPosition(loc[0], text);
        rowsIndexes.push(position.row);
      }
    }
  }

  rowsIndexes.sort(sortNumbersAscending);

  const ranges = [];
  let range = { start: rowsIndexes[0], end: rowsIndexes[0] };
  for (const rowIndex of rowsIndexes) {
    if ((rowIndex === range.end) || (rowIndex === (range.end + 1))) { // Moving end of known range
      range.end = rowIndex;
    } else {
      ranges.push(range); // non-continuous range
      range = { start: rowIndex, end: rowIndex };
    }
  }
  // Push the last edited range to ranges-array
  ranges.push(range);

  return ranges;
}

function rangesToLinesText(ranges) {
  let pos = '';
  const iterable = ranges || [];
  for (let rangeIndex = 0; rangeIndex < iterable.length; rangeIndex++) {
    const range = iterable[rangeIndex];
    if (rangeIndex > 0) {
      pos += ', ';
    }
    if (range.start !== range.end) {
      pos += `lines ${range.start}-${range.end}`;
    } else {
      pos += `line ${range.start}`;
    }
  }
  return pos;
}

module.exports = {
  characterIndexToPosition,
  rangesToLinesText,
  sortNumbersAscending,
  warningLocationToRanges,
};
