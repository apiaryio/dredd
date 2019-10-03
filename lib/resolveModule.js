import fs from 'fs';
import path from 'path';

export default function resolveModule(workingDirectory, moduleName) {
  const absolutePath = path.resolve(workingDirectory, moduleName);
  return fs.existsSync(absolutePath) || fs.existsSync(`${absolutePath}.js`)
    ? absolutePath
    : moduleName;
}
