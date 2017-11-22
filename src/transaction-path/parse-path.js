const { ESCAPE_CHAR, DELIMITER, MAX_PARTS } = require('./constants');

// Stupid JavaScript doesn't support regexp's lookbehind
// This hack is for simulating regexp positive and negative lookbehind
// If the negative lookbehind worked regex[] would be pretty simple:
//
//   new RegExp(DELIMTIER + "(?<!\" + ESCAPE_CHAR + DELIMITER+")")
//
//   e.g: /:(?<!\\:)/g
//
// Taken from:
//   http://blog.stevenlevithan.com/archives/javascript-regex-lookbehind
//
// Reference:
//   http://stackoverflow.com/questions/13993793/error-using-both-lookahead-and-look-behind-regex
//
// Gist:
//   https://gist.github.com/slevithan/2387872
//
function parsePath(path) {
  const parsed = [];

  const { length } = path;
  let position = 0;
  let previousCharacter = '';
  let buffer = '';

  // Split by unescaped delimiter
  while (position < length) {
    const currentCharacter = path[position];
    if ((currentCharacter === DELIMITER) && (previousCharacter !== ESCAPE_CHAR)) {
      parsed.push(buffer);
      buffer = '';
    } else {
      buffer += currentCharacter;
    }

    previousCharacter = currentCharacter;
    position += 1;
  }

  // Last part is not ended by DELIMITER, so adding buffer
  parsed.push(buffer);

  // Watch max length
  if (parsed.length > MAX_PARTS) {
    throw new Error(`Path is longer than ${MAX_PARTS} parts.`);
  }

  // Remove escape character from delimiter character and return the result
  return parsed.map(part => part.replace(new RegExp('\\\\:', 'g'), ':'));
}

module.exports = parsePath;
