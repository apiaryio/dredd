newlineRegExp = /\n/g

blueprintUtils = {}

blueprintUtils.characterIndexToPosition = (charIndex = 0, text = '') ->
  pieceOfCode = text.substring 0, charIndex
  return {
    row: pieceOfCode.match(newlineRegExp)?.length + 1
  }


blueprintUtils.sortNumbersAscending = (a, b) ->
  return a - b

blueprintUtils.warningLocationToRanges = (warningLocation = [], text = '') ->
  unless warningLocation.length
    # no start-end ranges, nothing to return
    return []

  rowsIndexes = []

  position = blueprintUtils.characterIndexToPosition(warningLocation[0].index, text)

  # add this warning position row into ranges array
  rowsIndexes.push position.row

  lastLocation = warningLocation[warningLocation.length - 1]

  if warningLocation.length > 0
    # more lines
    for loc, locKey in warningLocation when locKey > 0
      position = blueprintUtils.characterIndexToPosition(loc.index, text)
      rowsIndexes.push position.row

  rowsIndexes.sort(blueprintUtils.sortNumbersAscending)
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


blueprintUtils.rangesToLinesText = (ranges) ->
  pos = ''
  for range, rangeIndex in ranges or []
    if rangeIndex > 0
      pos += ', '
    if range.start isnt range.end
      pos += "lines #{range.start}-#{range.end}"
    else
      pos += "line #{range.start}"
  return pos


module.exports = blueprintUtils