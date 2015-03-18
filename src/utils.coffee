newlineRegExp = /\n/g

characterIndexToPosition = (charIndex = 0, text = '') ->
  pieceOfCode = text.substring 0, charIndex
  return {
    row: pieceOfCode.match(newlineRegExp)?.length + 1
    column: (pieceOfCode.length - pieceOfCode.lastIndexOf('\n'))
  }


sortNumbersAscending = (a, b) ->
  return a - b

warningLocationToRanges = (warningLocation = [], text = '') ->
  unless warningLocation.length
    # no start-end ranges, nothing to return
    return []

  rowsIndexes = []

  position = characterIndexToPosition(warningLocation[0].index, text)

  # add this warning position row into ranges array
  rowsIndexes.push position.row

  lastLocation = warningLocation[warningLocation.length - 1]

  if warningLocation.length > 0
    # more lines
    for loc, locKey in warningLocation when locKey > 0
      position = characterIndexToPosition(loc.index, text)
      rowsIndexes.push position.row

  if rowsIndexes.length > 0
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
  else
    positionEnd = characterIndexToPosition(lastLocation.index + lastLocation.length, text)
    return [{start: position.row, end: positionEnd.row}]


module.exports = {
  characterIndexToPosition
  warningLocationToRanges
}
