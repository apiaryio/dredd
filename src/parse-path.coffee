{ESCAPE_CHAR, DELIMITER, MAX_PARTS} = require './constants'

# Stupid JavaScript doesn't support regexp's lookbehind
# This hack is for simulating regexp positive and negative lookbehind
# If the negative lookbehind worked regex[] would be pretty simple:
#
#   new RegExp(DELIMTIER + "(?<!\" + ESCAPE_CHAR + DELIMITER+")")
#
#   e.g: /:(?<!\\:)/g
#
# Taken from:
#   http://blog.stevenlevithan.com/archives/javascript-regex-lookbehind
#
# Reference:
#   http://stackoverflow.com/questions/13993793/error-using-both-lookahead-and-look-behind-regex
#
# Gist:
#   https://gist.github.com/slevithan/2387872
#

parsePath = (path) ->
  parsed = []

  length = path.length
  position = 0
  previousCharacter = ""
  buffer = ""

  # split by unescaped delimiter
  while position < length
    currentCharacter = path[position]
    if currentCharacter == DELIMITER and previousCharacter != ESCAPE_CHAR
      parsed.push buffer
      buffer = ""
    else
      buffer += currentCharacter

    previousCharacter = currentCharacter
    position++

  # last part is not ended by DELIMITER, so adding buffer
  parsed.push buffer

  # watch max length
  if parsed.length > MAX_PARTS
    throw new Error "Path is longer than #{MAX_PARTS} parts."

  # remove escape character from delimiter character
  parsedWithRemovedEscapeChar = []
  for part in parsed
    parsedWithRemovedEscapeChar.push part.replace(new RegExp('\\\\:', "g"), ":")

  parsedWithRemovedEscapeChar

module.exports = parsePath

