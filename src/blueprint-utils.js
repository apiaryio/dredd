
const NEWLINE_RE = /\n/g;


const characterIndexToPosition = function(charIndex = 0, code = '') {
  const codeFragment = code.substring(0, charIndex);
  const row = (__guard__(codeFragment.match(NEWLINE_RE), x => x.length) || 0) + 1;
  return {row};
};


const sortNumbersAscending = (a, b) => a - b;


const warningLocationToRanges = function(warningLocation = [], text = '') {
  if (!warningLocation.length) {
    // no start-end ranges, nothing to return
    return [];
  }

  const rowsIndexes = [];

  let position = characterIndexToPosition(warningLocation[0][0], text);

  // add this warning position row into ranges array
  rowsIndexes.push(position.row);

  const lastLocation = warningLocation[warningLocation.length - 1];

  if (warningLocation.length > 0) {
    // more lines
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
  let range = {start: rowsIndexes[0], end: rowsIndexes[0]};
  for (let rowIndex of rowsIndexes) {
    if ((rowIndex === range.end) || (rowIndex === (range.end + 1))) { // moving end of known range
      range.end = rowIndex;
    } else {
      ranges.push(range); // non-continuous range
      range = {start: rowIndex, end: rowIndex};
    }
  }
  // push the last edited range to ranges-array
  ranges.push(range);
  return ranges;
};


const rangesToLinesText = function(ranges) {
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
};


module.exports = {
  characterIndexToPosition,
  sortNumbersAscending,
  warningLocationToRanges,
  rangesToLinesText
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}