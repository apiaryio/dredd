const R = require('ramda');
const { exec } = require('child_process');

const getBrowserSpawnCommand = R.cond([
  [R.equals('darwin'), R.always('open')],
  [R.equals('win32'), R.always('start')],
  [R.T, R.always('xdg-open')],
]);

module.exports = function openBrowser(url) {
  const spawnCommand = getBrowserSpawnCommand(process.platform);
  exec(`${spawnCommand} ${url}`);
};
