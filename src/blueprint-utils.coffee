
NEWLINE_RE = /\n/g


characterIndexToPosition = (charIndex = 0, code = '') ->
  codeFragment = code.substring(0, charIndex)
  row = (codeFragment.match(NEWLINE_RE)?.length or 0) + 1
  {row}


sortNumbersAscending = (a, b) ->
  return a - b


warningLocationToRanges = (warningLocation = [], text = '') ->
  unless warningLocation.length
    # no start-end ranges, nothing to return
    return []

  rowsIndexes = []

  position = characterIndexToPosition(warningLocation[0][0], text)

  # add this warning position row into ranges array
  rowsIndexes.push position.row

  lastLocation = warningLocation[warningLocation.length - 1]

  if warningLocation.length > 0
    # more lines
    for loc, locKey in warningLocation when locKey > 0
      position = characterIndexToPosition(loc[0], text)
      rowsIndexes.push position.row

  rowsIndexes.sort(sortNumbersAscending)
  ranges = []
  range = {start: rowsIndexes[0], end: rowsIndexes[0]}
  for rowIndex in rowsIndexes
    if rowIndex is range.end or rowIndex is range.end + 1 # moving end of known range
      range.end = rowIndex
    else
      ranges.push range # non-continuous range
      range = {start: rowIndex, end: rowIndex}
  # push the last edited range to ranges-array
  ranges.push range
  return ranges


rangesToLinesText = (ranges) ->
  pos = ''
  for range, rangeIndex in ranges or []
    if rangeIndex > 0
      pos += ', '
    if range.start isnt range.end
      pos += "lines #{range.start}-#{range.end}"
    else
      pos += "line #{range.start}"
  return pos


module.exports = {
  characterIndexToPosition
  sortNumbersAscending
  warningLocationToRanges
  rangesToLinesText
}
