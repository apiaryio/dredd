const readline = require('readline');

const ASCII_CTRL_C = 3;

// To learn about why this is needed and how it works, see
// the 'lib/childProcess.js' file, function 'signalTerm'.
module.exports = () => {
  // Handling programmatic interruption (Dredd sends '\u0003'
  // to stdin)
  process.stdin.on('data', (chunk) => {
    for (const char of chunk.toString()) {
      if (char.charCodeAt(0) === ASCII_CTRL_C) {
        process.emit('SIGINT');
        break;
      }
    }
  });

  // Handling manual interruption (user sends '\u0003' to stdin by
  // manually pressing Ctrl+C)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
};
