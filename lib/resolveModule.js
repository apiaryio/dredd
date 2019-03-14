const fs = require('fs');
const path = require('path');


module.exports = function resolveModule(workingDirectory, moduleName) {
  const absolutePath = path.resolve(workingDirectory, moduleName);
  return fs.existsSync(absolutePath) || fs.existsSync(`${absolutePath}.js`)
    ? path.resolve(absolutePath)
    : moduleName;
};
