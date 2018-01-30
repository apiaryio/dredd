const readline = require('readline');


const ASCII_CTRL_C = 3;


// To learn about why this is needed and how it works, see
// the 'src/child-process.coffee' file, function 'signalTerm'.
module.exports = function() {
  // Handling programmatic interruption (Dredd sends '\u0003'
  // to stdin)
  process.stdin.on('data', chunk =>
    (() => {
      const result = [];
      for (let char of chunk.toString()) {
        if (char.charCodeAt(0) === ASCII_CTRL_C) {
          process.emit('SIGINT');
          break;
        } else {
          result.push(undefined);
        }
      }
      return result;
    })()
  );

  // Handling manual interruption (user sends '\u0003' to stdin by
  // manually pressing Ctrl+C)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return rl.on('SIGINT', () => process.emit('SIGINT'));
};
